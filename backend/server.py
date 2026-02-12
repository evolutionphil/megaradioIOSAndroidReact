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

# Now Playing API - Fetches metadata from radio stream
@api_router.get("/now-playing/{station_id}", response_model=NowPlayingResponse)
async def get_now_playing(station_id: str):
    """
    Get now playing information for a station.
    Tries to fetch ICY metadata from the stream.
    """
    try:
        # First, try to get station info from external API
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Try themegaradio API first
            try:
                response = await client.get(
                    f"https://themegaradio.com/api/stations/{station_id}"
                )
                if response.status_code == 200:
                    station_data = response.json()
                    
                    # Try to get stream metadata
                    stream_url = station_data.get('url_resolved') or station_data.get('url')
                    if stream_url:
                        metadata = await fetch_stream_metadata(stream_url)
                        if metadata:
                            return NowPlayingResponse(
                                station_id=station_id,
                                title=metadata.get('title'),
                                artist=metadata.get('artist'),
                                song=metadata.get('song'),
                            )
                    
                    # Fallback to station genres/tags
                    genres = station_data.get('genres', [])
                    tags = station_data.get('tags', '')
                    
                    return NowPlayingResponse(
                        station_id=station_id,
                        title=genres[0] if genres else (tags.split(',')[0] if tags else 'Live Radio'),
                        artist=station_data.get('name', 'Unknown Station'),
                    )
            except Exception as e:
                logger.error(f"Error fetching station data: {e}")
        
        # Return default response
        return NowPlayingResponse(
            station_id=station_id,
            title="Live Radio",
            artist="Unknown Artist",
        )
        
    except Exception as e:
        logger.error(f"Error in get_now_playing: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def fetch_stream_metadata(stream_url: str) -> Optional[dict]:
    """
    Attempt to fetch ICY metadata from a stream URL.
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Request with ICY metadata header
            response = await client.get(
                stream_url,
                headers={
                    'Icy-MetaData': '1',
                    'User-Agent': 'MegaRadio/1.0'
                },
                follow_redirects=True
            )
            
            # Check for ICY headers
            icy_name = response.headers.get('icy-name')
            icy_genre = response.headers.get('icy-genre')
            icy_title = response.headers.get('icy-title')
            
            if icy_title:
                # Parse "Artist - Song" format
                parts = icy_title.split(' - ', 1)
                if len(parts) == 2:
                    return {
                        'artist': parts[0].strip(),
                        'song': parts[1].strip(),
                        'title': icy_title
                    }
                return {'title': icy_title}
            
            if icy_name:
                return {'title': icy_name, 'artist': icy_genre or 'Radio'}
                
    except Exception as e:
        logger.debug(f"Could not fetch stream metadata: {e}")
    
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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
