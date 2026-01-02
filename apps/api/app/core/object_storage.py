import boto3
from botocore.client import Config
from app.core.settings import settings

def get_s3():
    return boto3.client(
        "s3",
        aws_access_key_id=settings.OBJECT_STORAGE_ACCESS_KEY,
        aws_secret_access_key=settings.OBJECT_STORAGE_SECRET_KEY,
        endpoint_url=settings.OBJECT_STORAGE_ENDPOINT,
        region_name=settings.OBJECT_STORAGE_REGION,
        config=Config(signature_version="s3v4"),
    )
