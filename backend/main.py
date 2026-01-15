"""Pencil2Ink Backend API"""
# pylint: disable=broad-exception-caught
import os
import time
import uuid
import hashlib
import json
from io import BytesIO
from pathlib import Path
from typing import Any, Union

from fastapi import FastAPI, File, UploadFile
from fastapi.responses import Response
from PIL import Image
import httpx
from dotenv import load_dotenv

from signature import generate_signature


# Load environment variables from .env file
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

# Load environment variables - temporary vars
TAMS_URL = os.getenv("TAMS_URL", "")
TAMS_APP_ID = os.getenv("TAMS_APP_ID", "")
PRIVATE_KEY_PEM = os.getenv("PRIVATE_KEY_PEM", "")

# Validate environment variables
if not TAMS_URL or not TAMS_APP_ID or not PRIVATE_KEY_PEM:
    raise ValueError(
        "Missing required environment variables: TAMS_URL, TAMS_APP_ID, PRIVATE_KEY_PEM"
    )

# In-memory job storage
jobs: dict[str, dict[str, Any]] = {}

# Model configuration
INKIFY_LORA_ID = "920889236046011951"
BASE_MODEL_ID = "879112449935019302"  # flux1-dev-kontext_fp8_scaled

# Initialize FastAPI
app = FastAPI(title="Pencil2Ink API", version="1.0.0")


def cleanup_expired_jobs():
    """Remove jobs older than 1 hour"""
    current_time = time.time()
    expired_jobs = [
        job_id for job_id, data in jobs.items()
        if current_time - data["timestamp"] > 3600  # 1 hour
    ]
    for job_id in expired_jobs:
        del jobs[job_id]
    return len(expired_jobs)


def validate_image(file_bytes: bytes) -> tuple[bool, Union[str, dict[str, int]]]:
    """
    Validate image format, size, and dimensions.

    Returns:
        (True, {"width": int, "height": int}) if valid
        (False, "error message") if invalid
    """
    # Check file size
    if len(file_bytes) > 1_000_000:  # 1 MB
        return False, "File size must be under 1 MB"

    try:
        img = Image.open(BytesIO(file_bytes))

        # Check format
        if img.format not in ['JPEG', 'PNG']:
            return False, "Only JPG and PNG formats allowed"

        # Check dimensions
        width, height = img.size
        if width > 1500 or height > 1500:
            return False, "Image dimensions must be under 1500×1500px"

        return True, {"width": width, "height": height}
    except Exception as e:
        return False, f"Invalid image file: {str(e)}"


@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    """
    Upload a pencil sketch image and create a conversion job.

    Returns:
        {"status": "success", "job_id": "uuid"} or
        {"status": "error", "message": "error description"}
    """
    try:
        # Read file content
        file_bytes = await file.read()

        # Validate image
        is_valid, result = validate_image(file_bytes)
        if not is_valid:
            return {"status": "error", "message": result}

        # Type narrowing: result is dict here
        assert isinstance(result, dict)
        img_info: dict[str, int] = result

        # Cleanup expired jobs
        cleanup_expired_jobs()

        # Step 1: Request signed upload URL from TAMS
        async with httpx.AsyncClient(timeout=30.0) as client:
            upload_url_path = "/v1/resource/image"
            upload_body = json.dumps({"expireSec": 3600}, separators=(',', ':'))
            auth_header = generate_signature(
                "POST",
                upload_url_path,
                upload_body,
                TAMS_APP_ID,
                PRIVATE_KEY_PEM
            )

            response = await client.post(
                f"{TAMS_URL}{upload_url_path}",
                json={"expireSec": 3600},
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": auth_header
                }
            )

            if response.status_code != 200:
                return {
                    "status": "error",
                    "message": f"Failed to get upload URL: {response.text}"
                }

            upload_data = response.json()
            resource_id = upload_data["resourceId"]
            put_url = upload_data["putUrl"]
            put_headers = upload_data.get("headers", {})

            # Step 2: Upload image to the signed URL
            put_response = await client.put(
                put_url,
                content=file_bytes,
                headers=put_headers,
                timeout=60.0
            )

            if put_response.status_code not in [200, 204]:
                return {
                    "status": "error",
                    "message": f"Failed to upload image: {put_response.text}"
                }

            print("\n=== Step 3: Creating img2img job ===")
            # Step 3: Create img2img job
            job_request_id = hashlib.md5(str(int(time.time())).encode()).hexdigest()
            job_data = {
                "request_id": job_request_id,
                "stages": [
                    {
                        "type": "INPUT_INITIALIZE",
                        "inputInitialize": {
                            "seed": 1300163161,
                            "image_resource_id": resource_id,
                            "count": 1
                        }
                    },
                    {
                        "type": "DIFFUSION",
                        "diffusion": {
                            "width": img_info["width"],
                            "height": img_info["height"],
                            "prompts": [{
                                "text": (
                                    "inkify, convert pencils to clean black ink, "
                                    "fill X-marked regions solid black, remove paper texture"
                                )
                            }],
                            "negativePrompts": [{
                                "text": "color image, watercolor, blur, noise, pencil lines, grey"
                            }],
                            "sd_model": BASE_MODEL_ID,
                            "sdVae": "Automatic",
                            "sampler": "Euler",
                            "steps": 20,
                            "cfg_scale": 2,
                            "guidance": 3.5,
                            "denoisingStrength": 0.5,
                            "clip_skip": 2,
                            "lora": {
                                "items": [{
                                    "loraModel": INKIFY_LORA_ID,
                                    "weight": 0.80
                                }]
                            }
                        }
                    }
                ]
            }

            # Step 3: Create img2img job
            job_request_id = hashlib.md5(str(int(time.time())).encode()).hexdigest()
            job_path = "/v1/jobs"
            job_body = json.dumps(job_data, separators=(',', ':'))
            job_auth_header = generate_signature(
                "POST",
                job_path,
                job_body,
                TAMS_APP_ID,
                PRIVATE_KEY_PEM
            )

            job_response = await client.post(
                f"{TAMS_URL}{job_path}",
                json=job_data,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": job_auth_header
                }
            )

            if job_response.status_code != 200:
                return {
                    "status": "error",
                    "message": f"Failed to create job: {job_response.text}"
                }

            job_result = job_response.json()
            tams_job_id = job_result["job"]["id"]

            # Generate internal job ID
            internal_job_id = str(uuid.uuid4())

            # Store job mapping
            jobs[internal_job_id] = {
                "tams_job_id": tams_job_id,
                "timestamp": time.time()
            }

            return {
                "status": "success",
                "job_id": internal_job_id
            }

    except Exception as e:
        return {
            "status": "error",
            "message": f"Unexpected error: {str(e)}"
        }


@app.get("/api/status/{job_id}")
async def get_status(job_id: str):
    """
    Get the status of a conversion job.

    Returns:
        {"status": "success", "job_status": "...", "progress": 0-100, "message": "..."} or
        {"status": "error", "message": "..."}
    """
    try:
        # Check if job exists
        if job_id not in jobs:
            return {"status": "error", "message": "Job not found"}

        tams_job_id = jobs[job_id]["tams_job_id"]

        # Fetch job status from TAMS
        async with httpx.AsyncClient(timeout=30.0) as client:
            job_path = f"/v1/jobs/{tams_job_id}"
            auth_header = generate_signature(
                "GET",
                job_path,
                "",
                TAMS_APP_ID,
                PRIVATE_KEY_PEM
            )

            response = await client.get(
                f"{TAMS_URL}{job_path}",
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": auth_header
                }
            )

            if response.status_code != 200:
                return {
                    "status": "error",
                    "message": f"Failed to get job status: {response.text}"
                }

            job_data = response.json()
            job = job_data["job"]
            status = job.get("status")

            # Map status to response
            progress = 0
            message = ""

            if status in ["SUBMITTED", "PENDING"]:
                progress = 0
                message = "Initializing..."
            elif status == "WAITING":
                progress = 10
                if "waitingInfo" in job:
                    message = job["waitingInfo"].get("message", "Waiting...")
                else:
                    message = "Waiting..."
            elif status == "RUNNING":
                if "runningInfo" in job and "progress" in job["runningInfo"]:
                    progress = job["runningInfo"]["progress"]
                else:
                    progress = 50
                message = "Processing..."
            elif status == "SUCCESS":
                progress = 100
                message = "Completed!"
            elif status == "FAILED":
                progress = 0
                if "failInfo" in job:
                    message = job["failInfo"].get("message", "Processing failed")
                else:
                    message = "Processing failed"
            else:
                progress = 0
                message = f"Status: {status}"

            return {
                "status": "success",
                "job_status": status,
                "progress": progress,
                "message": message
            }

    except Exception as e:
        return {
            "status": "error",
            "message": f"Unexpected error: {str(e)}"
        }


@app.get("/api/download/{job_id}")
async def download_image(job_id: str):
    """
    Download the converted inked image.

    Returns:
        Image binary with Content-Type: image/png or
        {"status": "error", "message": "..."}
    """
    try:
        # Check if job exists
        if job_id not in jobs:
            return {"status": "error", "message": "Job not found"}

        tams_job_id = jobs[job_id]["tams_job_id"]

        # Fetch job status from TAMS
        async with httpx.AsyncClient(timeout=30.0) as client:
            job_path = f"/v1/jobs/{tams_job_id}"
            auth_header = generate_signature(
                "GET",
                job_path,
                "",
                TAMS_APP_ID,
                PRIVATE_KEY_PEM
            )

            response = await client.get(
                f"{TAMS_URL}{job_path}",
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": auth_header
                }
            )

            if response.status_code != 200:
                return {
                    "status": "error",
                    "message": f"Failed to get job status: {response.text}"
                }

            job_data = response.json()
            job = job_data["job"]
            status = job.get("status")

            # Check if job is complete
            if status != "SUCCESS":
                if status == "FAILED":
                    return {"status": "error", "message": "Job processing failed"}
                else:
                    return {"status": "error", "message": "Image not ready yet"}

            # Extract image URL
            if "successInfo" not in job or "images" not in job["successInfo"]:
                return {"status": "error", "message": "No image found in job result"}

            image_url = job["successInfo"]["images"][0]["url"]

            # Download image
            image_response = await client.get(image_url, timeout=60.0)

            if image_response.status_code != 200:
                return {
                    "status": "error",
                    "message": f"Failed to download image: {image_response.status_code}"
                }

            # Return image
            return Response(
                content=image_response.content,
                media_type="image/png",
                headers={
                    "Content-Disposition": 'attachment; filename="inked_image.png"'
                }
            )

    except Exception as e:
        return {
            "status": "error",
            "message": f"Unexpected error: {str(e)}"
        }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok"}
