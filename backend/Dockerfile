FROM python:3.12-slim

# psycopg2-binary needs libpq at runtime; build-essential covers the rare
# case pip falls back to building a wheel from source. Pillow (via reportlab
# and qrcode) needs libjpeg/zlib headers to build against.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libjpeg62-turbo-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/media /app/static /app/templates

EXPOSE 8000

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]

# Dev-friendly default (matches manage.py runserver used throughout local
# dev, and serves /admin's static assets with no extra setup). For a real
# production deploy, override with gunicorn and put a static-file solution
# (whitenoise or a reverse proxy) in front of it:
#   command: gunicorn backend.wsgi:application --bind 0.0.0.0:8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
