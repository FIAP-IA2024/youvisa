FROM python:3.11-slim

WORKDIR /app

# OpenCV needs libgl1 + libglib2 at runtime even with the headless wheel
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libgl1 libglib2.0-0 \
        curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src ./src

ENV PYTHONUNBUFFERED=1
ENV VALIDATION_PORT=5556

EXPOSE 5556

# Use the FastAPI server (Sprint 4) instead of the legacy Lambda handler
CMD ["uvicorn", "src.server:app", "--host", "0.0.0.0", "--port", "5556"]
