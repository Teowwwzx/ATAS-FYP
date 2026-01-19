import os
from typing import List
import cloudinary
import cloudinary.uploader
from app.core.config import settings

cloudinary.config(cloud_name=None, api_key=None, api_secret=None)
if settings.CLOUDINARY_URL:
    cloudinary.config(cloudinary_url=settings.CLOUDINARY_URL)

def upload_images(paths: List[str]) -> List[dict]:
    result = []
    for p in paths:
        if not settings.CLOUDINARY_URL:
            result.append({"url": p, "type": "image"})
        else:
            r = cloudinary.uploader.upload(p, resource_type="image")
            result.append({"url": r.get("secure_url"), "type": "image"})
    return result
