import os
import uuid
import re
import tempfile
from typing import Optional
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
import urllib.request
from html.parser import HTMLParser

from app.core.security import get_current_user, AuthenticatedUser

router = APIRouter(prefix="/media", tags=["Media"])

MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_VIDEO_SIZE = 50 * 1024 * 1024  # 50 MB

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}


def get_upload_dir() -> str:
    target_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
        "static",
        "uploads",
    )
    try:
        os.makedirs(target_dir, exist_ok=True)
        return target_dir
    except Exception:
        tmp_dir = os.path.join(tempfile.gettempdir(), "sangati_uploads")
        os.makedirs(tmp_dir, exist_ok=True)
        return tmp_dir


class LinkPreviewRequest(BaseModel):
    url: str


class LinkPreviewResponse(BaseModel):
    url: str
    title: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None


class OGParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = None
        self.description = None
        self.image = None

    def handle_starttag(self, tag, attrs):
        if tag == "meta":
            attrs_dict = dict(attrs)
            prop = attrs_dict.get("property") or attrs_dict.get("name")
            content = attrs_dict.get("content")
            if prop and content:
                if prop.lower() in ("og:title", "twitter:title"):
                    self.title = content
                elif prop.lower() in ("og:description", "twitter:description", "description"):
                    self.description = content
                elif prop.lower() in ("og:image", "twitter:image"):
                    self.image = content


@router.post("/upload", summary="Upload image or video file for posts")
async def upload_media(
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    content_type = file.content_type or ""
    is_image = content_type in ALLOWED_IMAGE_TYPES
    is_video = content_type in ALLOWED_VIDEO_TYPES

    if not is_image and not is_video:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Allowed: JPEG, PNG, GIF, WebP, MP4, WebM.",
        )

    contents = await file.read()
    file_size = len(contents)

    if is_image and file_size > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image file size exceeds maximum limit of 10MB.",
        )

    if is_video and file_size > MAX_VIDEO_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Video file size exceeds maximum limit of 50MB.",
        )

    ext = os.path.splitext(file.filename or "")[1] or (".mp4" if is_video else ".jpg")
    filename = f"{uuid.uuid4().hex}{ext}"
    upload_dir = get_upload_dir()
    file_path = os.path.join(upload_dir, filename)

    with open(file_path, "wb") as f:
        f.write(contents)

    media_type = "video" if is_video else "image"
    media_url = f"/static/uploads/{filename}"

    return {
        "media_url": media_url,
        "media_type": media_type,
        "filename": filename,
        "size": file_size,
    }


@router.post("/link-preview", response_model=LinkPreviewResponse, summary="Extract OpenGraph metadata from link URL")
def extract_link_preview(
    data: LinkPreviewRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    url = data.url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            html = response.read(100000).decode("utf-8", errors="ignore")
            parser = OGParser()
            parser.feed(html)
            
            # Fallback title if not in og:title
            if not parser.title:
                title_match = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
                if title_match:
                    parser.title = title_match.group(1).strip()

            return LinkPreviewResponse(
                url=url,
                title=parser.title or url,
                description=parser.description,
                image=parser.image,
            )
    except Exception:
        return LinkPreviewResponse(url=url, title=url)
