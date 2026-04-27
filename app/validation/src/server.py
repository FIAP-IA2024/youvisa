"""
FastAPI server wrapping the existing ImageValidator (OpenCV) so it can
run as a long-lived container in docker compose instead of an AWS Lambda.

Sprint 4 Phase 7: replaces the Lambda handler.
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Header
from fastapi.responses import JSONResponse
import os
import logging

from src.validator import ImageValidator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

API_KEY = os.environ.get("API_KEY", "")
PORT = int(os.environ.get("VALIDATION_PORT", "5556"))

app = FastAPI(title="YOUVISA Validation Service", version="0.1.0")
validator = ImageValidator()


def _check_auth(provided: str | None) -> None:
    if not API_KEY:
        # Open mode (dev) when API_KEY is not set in env.
        return
    if provided != API_KEY:
        raise HTTPException(status_code=401, detail="invalid api key")


@app.get("/health")
def health():
    return {"success": True, "status": "healthy", "service": "validation"}


@app.post("/validate")
async def validate(
    file: UploadFile = File(...),
    x_api_key: str | None = Header(default=None, alias="x-api-key"),
):
    """
    Validate an uploaded image. Body: multipart/form-data with `file`.
    Returns the same shape as the legacy Lambda handler:
      { valid: bool, reason: str, details: { blur_score, brightness, width, height } }
    """
    _check_auth(x_api_key)
    if not file.content_type or not file.content_type.startswith("image/"):
        return JSONResponse(
            status_code=200,
            content={
                "valid": False,
                "reason": "Arquivo não é uma imagem.",
                "details": {},
            },
        )

    image_bytes = await file.read()
    result = validator.validate(image_bytes)
    logger.info(
        "validate result: valid=%s reason=%s",
        result["valid"],
        result["reason"][:60] if result.get("reason") else "",
    )
    return result


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=PORT)
