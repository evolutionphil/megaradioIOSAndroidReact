# MegaRadio Desktop service — desktop.themegaradio.com
#
# Single-stage build that produces the FastAPI server which:
#   • serves the TV/Desktop web bundle at /api/tv-app/*
#   • exposes the proxy endpoints (/api/stream-proxy, /api/stream-metadata,
#     /api/stream-resolve, /api/tv-icon-proxy, /api/tv-proxy/*)
#
# MongoDB is intentionally NOT required — the desktop service stays stateless
# so we don't have to share the mobile DB. The mobile API at
# api.themegaradio.com keeps its existing config unchanged.

# ─── Stage 1 ──────────────────────────────────────────────────────────────
# Build the Vite TV bundle. The web-preview vite.config.ts writes its output
# four levels up (../../../../backend/static/tv-preview) so the local dev
# environment can serve the bundle straight from the FastAPI static mount.
# Inside Docker we mirror the same relative layout under /src so the build
# lands at /src/backend/static/tv-preview where the runtime stage can grab it.
FROM node:20-bookworm-slim AS web-build
WORKDIR /src/frontend/tvanddesktop/apple-tv-and-macos/web-preview
COPY frontend/tvanddesktop/apple-tv-and-macos/web-preview/package.json ./
RUN yarn install --network-timeout 600000
COPY frontend/tvanddesktop/apple-tv-and-macos/web-preview/ ./
RUN yarn build
# After build: /src/backend/static/tv-preview/ contains index.html + assets/

# ─── Stage 2 ──────────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1
WORKDIR /app

# OS-level deps for compiled wheels (motor / cryptography etc.)
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc curl && \
    rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./backend/requirements.txt
# emergentintegrations lives on a custom index; everything else is on PyPI.
RUN pip install -r backend/requirements.txt \
    --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/

COPY backend/ ./backend/
# Bring the freshly-built TV web bundle into the place server.py mounts it from
COPY --from=web-build /src/backend/static/tv-preview/ ./backend/static/tv-preview/

# Railway injects $PORT — fall back to 8001 for local docker run.
ENV PORT=8001
EXPOSE 8001

CMD ["sh", "-c", "cd backend && uvicorn server:app --host 0.0.0.0 --port ${PORT}"]
