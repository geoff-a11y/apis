FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install dependencies (skip playwright for now - use requests-only scraping)
RUN pip install --no-cache-dir fastapi uvicorn pydantic requests beautifulsoup4 lxml python-dotenv sqlalchemy

# Copy application code
COPY . .

# Create data directory for SQLite
RUN mkdir -p /app/data

# Default port (Railway will override with $PORT)
ENV PORT=8000

# Start command
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
