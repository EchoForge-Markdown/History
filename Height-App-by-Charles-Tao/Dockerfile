# Simple Dockerfile to run the Flask app with gunicorn
FROM python:3.11-slim

# Avoid buffering python output
ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    POETRY_VIRTUALENVS_CREATE=false

WORKDIR /app
COPY . /app

RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Expose the default port
EXPOSE 5000

# Run with gunicorn (4 workers)
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "hp_web_runner.app:app"]
