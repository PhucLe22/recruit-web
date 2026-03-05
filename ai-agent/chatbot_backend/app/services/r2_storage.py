import boto3
from app.core.config import settings


s3_client = boto3.client(
    "s3",
    endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
    aws_access_key_id=settings.r2_access_key_id,
    aws_secret_access_key=settings.r2_secret_access_key,
    region_name="auto",
)


def upload_file(file_content: bytes, key: str, content_type: str) -> str:
    """Upload a file to R2 and return its public URL."""
    s3_client.put_object(
        Bucket=settings.r2_bucket_name,
        Key=key,
        Body=file_content,
        ContentType=content_type,
    )
    return get_public_url(key)


def get_public_url(key: str) -> str:
    """Get the public URL for an R2 key."""
    base = settings.r2_public_url.rstrip("/")
    return f"{base}/{key}"
