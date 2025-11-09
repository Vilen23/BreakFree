import requests
import json
from google.cloud import storage
from typing import Any

def upload_file_from_url(url: str, dest_path: str) -> str:
    """Download file from URL and upload to Firebase Storage."""
    client = storage.Client()
    bucket = client.bucket("your-firebase-bucket-name")
    blob = bucket.blob(dest_path)

    r = requests.get(url)
    blob.upload_from_string(r.content, content_type="video/mp4")
    blob.make_public()
    return blob.public_url


def upload_json(data: Any, dest_path: str) -> str:
    """Upload JSON content to Firebase Storage."""
    client = storage.Client()
    bucket = client.bucket("your-firebase-bucket-name")
    blob = bucket.blob(dest_path)

    blob.upload_from_string(json.dumps(data), content_type="application/json")
    blob.make_public()
    return blob.public_url
