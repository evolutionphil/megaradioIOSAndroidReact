from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
import uuid
from datetime import datetime, timezone
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
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# CarPlay Log Models
class CarPlayLogEntry(BaseModel):
    level: str = "info"  # info, warn, error, debug
    message: str
    context: Optional[Dict[str, Any]] = None
    timestamp: Optional[str] = None

class CarPlayLogRequest(BaseModel):
    device_id: Optional[str] = None
    device_model: Optional[str] = None
    os_version: Optional[str] = None
    app_version: Optional[str] = None
    logs: List[CarPlayLogEntry]

class CarPlayLogResponse(BaseModel):
    success: bool
    received_count: int
    message: str

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

# ============== CarPlay Logging Endpoints ==============

@api_router.post("/carplay/logs", response_model=CarPlayLogResponse)
async def submit_carplay_logs(request: CarPlayLogRequest):
    """
    Receive CarPlay debug logs from the mobile app.
    Stores logs in MongoDB and prints to server console for real-time debugging.
    """
    try:
        # Log to console for real-time debugging
        logger.info("=" * 60)
        logger.info(f"📱 CARPLAY LOGS RECEIVED")
        logger.info(f"Device: {request.device_model or 'Unknown'} | OS: {request.os_version or 'Unknown'}")
        logger.info(f"App Version: {request.app_version or 'Unknown'} | Device ID: {request.device_id or 'Unknown'}")
        logger.info("-" * 60)
        
        for log_entry in request.logs:
            level_emoji = {
                "error": "❌",
                "warn": "⚠️",
                "info": "ℹ️",
                "debug": "🔍"
            }.get(log_entry.level, "📝")
            
            logger.info(f"{level_emoji} [{log_entry.level.upper()}] {log_entry.message}")
            if log_entry.context:
                logger.info(f"   Context: {log_entry.context}")
        
        logger.info("=" * 60)
        
        # Store in MongoDB for historical analysis
        log_document = {
            "device_id": request.device_id,
            "device_model": request.device_model,
            "os_version": request.os_version,
            "app_version": request.app_version,
            "logs": [log.dict() for log in request.logs],
            "received_at": datetime.now(timezone.utc),
        }
        
        await db.carplay_logs.insert_one(log_document)
        
        return CarPlayLogResponse(
            success=True,
            received_count=len(request.logs),
            message="Logs received successfully"
        )
        
    except Exception as e:
        logger.error(f"Error storing CarPlay logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/carplay/logs")
async def get_carplay_logs(
    limit: int = 50,
    device_id: Optional[str] = None,
    level: Optional[str] = None
):
    """
    Retrieve stored CarPlay logs for debugging.
    """
    try:
        query = {}
        if device_id:
            query["device_id"] = device_id
        
        logs = await db.carplay_logs.find(
            query,
            {"_id": 0}
        ).sort("received_at", -1).limit(limit).to_list(limit)
        
        # Filter by level if specified
        if level:
            for log_doc in logs:
                log_doc["logs"] = [l for l in log_doc["logs"] if l.get("level") == level]
        
        return {
            "success": True,
            "count": len(logs),
            "logs": logs
        }
        
    except Exception as e:
        logger.error(f"Error fetching CarPlay logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/carplay/logs")
async def clear_carplay_logs():
    """
    Clear all stored CarPlay logs.
    """
    try:
        result = await db.carplay_logs.delete_many({})
        return {
            "success": True,
            "deleted_count": result.deleted_count,
            "message": "All CarPlay logs cleared"
        }
    except Exception as e:
        logger.error(f"Error clearing CarPlay logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
