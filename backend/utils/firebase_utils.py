import requests
import json
import os
from google.cloud import storage
from typing import Any

# Get Firebase Storage bucket name from environment or use default
FIREBASE_STORAGE_BUCKET = os.getenv(
    "FIREBASE_STORAGE_BUCKET",
    "breakfree-a7269.appspot.com",  # Default bucket name based on project ID
)


def upload_file_from_url(url: str, dest_path: str, content_type: str = None) -> str:
    """Download file from URL and upload to Firebase Storage."""
    client = storage.Client()
    bucket = client.bucket(FIREBASE_STORAGE_BUCKET)
    blob = bucket.blob(dest_path)

    r = requests.get(url)

    # Auto-detect content type if not provided
    if not content_type:
        content_type = r.headers.get("content-type", "application/octet-stream")
        # Set appropriate content type based on file extension
        if dest_path.endswith((".png", ".jpg", ".jpeg")):
            content_type = "image/png" if dest_path.endswith(".png") else "image/jpeg"
        elif dest_path.endswith(".mp4"):
            content_type = "video/mp4"
        elif dest_path.endswith(".json"):
            content_type = "application/json"

    blob.upload_from_string(r.content, content_type=content_type)
    blob.make_public()
    return blob.public_url


def upload_json(data: Any, dest_path: str) -> str:
    """Upload JSON content to Firebase Storage."""
    client = storage.Client()
    bucket = client.bucket(FIREBASE_STORAGE_BUCKET)
    blob = bucket.blob(dest_path)

    blob.upload_from_string(json.dumps(data), content_type="application/json")
    blob.make_public()
    return blob.public_url


def upload_file_from_bytes(
    data: bytes, dest_path: str, content_type: str = "application/octet-stream"
) -> str:
    """Upload file from bytes to Firebase Storage."""
    client = storage.Client()
    bucket = client.bucket(FIREBASE_STORAGE_BUCKET)
    blob = bucket.blob(dest_path)

    blob.upload_from_string(data, content_type=content_type)
    blob.make_public()
    return blob.public_url
