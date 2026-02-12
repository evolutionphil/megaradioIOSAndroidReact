from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import httpx
import re


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class NowPlayingResponse(BaseModel):
    station_id: str
    title: Optional[str] = None
    artist: Optional[str] = None
    song: Optional[str] = None
    album: Optional[str] = None
    artwork: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Now Playing API - Fetches ICY metadata from radio stream
@api_router.get("/now-playing/{station_id}", response_model=NowPlayingResponse)
async def get_now_playing(station_id: str):
    """
    Get now playing information for a station.
    1. Fetches station info from themegaradio API to get stream URL
    2. Connects to stream with Icy-MetaData header to get real song title
    3. Falls back to genre/tags if ICY metadata unavailable
    """
    station_name = "Unknown Station"
    fallback_title = "Live Radio"
    stream_url = None

    try:
        async with httpx.AsyncClient(timeout=5.0) as http_client:
            # Step 1: Get station data from themegaradio API
            try:
                response = await http_client.get(
                    f"https://themegaradio.com/api/station/{station_id}"
                )
                if response.status_code == 200:
                    station_data = response.json()
                    station_name = station_data.get('name', 'Unknown Station')
                    stream_url = station_data.get('url_resolved') or station_data.get('url')
                    genres = station_data.get('genres', [])
                    tags = station_data.get('tags', '')
                    country = station_data.get('country', '')

                    if genres:
                        fallback_title = genres[0]
                    elif tags:
                        fallback_title = tags.split(',')[0].strip()
                    elif country:
                        fallback_title = country
            except Exception as e:
                logger.error(f"Error fetching station data: {e}")

        # Step 2: Try to fetch ICY metadata from the stream
        if stream_url:
            icy_result = await fetch_icy_stream_title(stream_url)
            if icy_result:
                return NowPlayingResponse(
                    station_id=station_id,
                    title=icy_result.get('title', fallback_title),
                    artist=icy_result.get('artist', station_name),
                    song=icy_result.get('song'),
                )

        # Step 3: Fallback to genre/station info
        return NowPlayingResponse(
            station_id=station_id,
            title=fallback_title,
            artist=station_name,
        )

    except Exception as e:
        logger.error(f"Error in get_now_playing: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def fetch_icy_stream_title(stream_url: str) -> Optional[dict]:
    """
    Connect to a radio stream with Icy-MetaData:1 header,
    read enough bytes to extract the StreamTitle from ICY metadata.
    """
    try:
        async with httpx.AsyncClient(timeout=5.0, follow_redirects=True) as http_client:
            async with http_client.stream(
                'GET',
                stream_url,
                headers={
                    'Icy-MetaData': '1',
                    'User-Agent': 'MegaRadio/1.0',
                }
            ) as response:
                # Get the ICY metadata interval
                metaint_str = response.headers.get('icy-metaint')
                if not metaint_str:
                    logger.debug(f"No icy-metaint header for {stream_url}")
                    return None

                metaint = int(metaint_str)
                if metaint <= 0:
                    return None

                # Read metaint bytes of audio data + metadata block
                buffer = b''
                async for chunk in response.aiter_bytes(chunk_size=4096):
                    buffer += chunk
                    # We need metaint + 1 (length byte) + up to 4080 (max meta)
                    if len(buffer) > metaint + 256:
                        break

                if len(buffer) <= metaint:
                    return None

                # The metadata starts right after metaint bytes of audio
                meta_length_byte = buffer[metaint]
                meta_length = meta_length_byte * 16

                if meta_length == 0:
                    return None

                meta_start = metaint + 1
                meta_end = meta_start + meta_length

                if len(buffer) < meta_end:
                    return None

                metadata = buffer[meta_start:meta_end]
                meta_str = metadata.decode('utf-8', errors='ignore').strip('\0')

                # Parse StreamTitle='Artist - Title';
                match = re.search(r"StreamTitle='([^']*)'", meta_str)
                if match:
                    stream_title = match.group(1).strip()
                    if stream_title:
                        # Try to split "Artist - Song"
                        parts = stream_title.split(' - ', 1)
                        if len(parts) == 2:
                            return {
                                'artist': parts[0].strip(),
                                'song': parts[1].strip(),
                                'title': stream_title,
                            }
                        return {'title': stream_title}

    except Exception as e:
        logger.debug(f"ICY metadata fetch failed for {stream_url}: {e}")

    return None

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
