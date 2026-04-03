FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for Playwright
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies including Playwright
RUN pip install --no-cache-dir fastapi uvicorn pydantic requests beautifulsoup4 lxml python-dotenv sqlalchemy playwright

# Install Playwright browsers (chromium only for smaller image)
RUN playwright install chromium
RUN playwright install-deps chromium

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
