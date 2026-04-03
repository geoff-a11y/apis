FROM mcr.microsoft.com/playwright/python:v1.40.0-jammy

WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create data directory for SQLite
RUN mkdir -p /app/data

# Default port (Railway will override with $PORT)
ENV PORT=8000

# Start command using shell form to expand $PORT
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
