FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install dependencies (skip playwright for now - use requests-only scraping)
RUN pip install --no-cache-dir fastapi uvicorn pydantic requests beautifulsoup4 lxml python-dotenv sqlalchemy

# Copy application code
COPY . .

# Make start script executable
RUN chmod +x start.sh

# Create data directory for SQLite
RUN mkdir -p /app/data

# Default port
ENV PORT=8000

# Start command
CMD ["./start.sh"]
