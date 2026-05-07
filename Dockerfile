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

FROM node:20-bookworm-slim AS web-build
WORKDIR /build
# yarn.lock isn't tracked in this repo, so we install from package.json only.
# Lockless installs are fine here because the desktop service is rebuilt on
# every Railway deploy — there's no separate dev environment to drift from.
COPY frontend/tvanddesktop/apple-tv-and-macos/web-preview/package.json ./
RUN yarn install --network-timeout 600000
COPY frontend/tvanddesktop/apple-tv-and-macos/web-preview/ ./
RUN yarn build
# Vite is configured to emit straight into ../../../../backend/static/tv-preview,
# so after this stage the bundle lives at /build/static/tv-preview/ — we'll
# copy it from there in the next stage.

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
RUN pip install -r backend/requirements.txt

COPY backend/ ./backend/
# Bring the freshly-built TV web bundle into the place server.py mounts it from
COPY --from=web-build /build/static/tv-preview/ ./backend/static/tv-preview/

# Railway injects $PORT — fall back to 8001 for local docker run.
ENV PORT=8001
EXPOSE 8001

CMD ["sh", "-c", "cd backend && uvicorn server:app --host 0.0.0.0 --port ${PORT}"]
