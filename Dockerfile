# =============================================================================
# Multi-stage Dockerfile for LedgerWatch
# Production-ready container serving FastAPI + React SPA in a single lightweight image
# =============================================================================

# --- Stage 1: Build React Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# --- Stage 2: Production Python Backend + Static Host ---
FROM python:3.11-slim
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy server code, CSV datasets, and database directory
COPY server/ ./server/
COPY data/ ./data/
COPY database/ ./database/
COPY app.py .

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/client/dist ./client/dist

# Expose standard web port
EXPOSE 8000

# Healthcheck to verify the server is running
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:' + os.environ.get('PORT', '8000') + '/docs')" || exit 1

# Launch LedgerWatch via uvicorn
CMD ["python", "app.py"]
