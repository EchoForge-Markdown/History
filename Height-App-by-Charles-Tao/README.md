# HP Web Runner (height predictor only)

This repository contains a small Flask app that exposes a height prediction
API and a lightweight front-end. The original C++ runner feature was removed
for safety; this project focuses on the height predictor UI.

Quick start (local development)

1. Create and activate a Python virtual environment (recommended):

```bash
python3 -m venv .venv
source .venv/bin/activate
```

# HP Web Runner (height predictor only)

This repository contains a small Flask app that exposes a height prediction
API and a lightweight front-end. The original C++ runner feature was removed
for safety; this project focuses on the height predictor UI.

Requirements

- Python 3.10+ (tested on 3.11)
- Docker (optional, for containerized deployment)

Quick start (local development)

1. Create and activate a Python virtual environment (recommended):

```bash
python3 -m venv .venv
source .venv/bin/activate
```

2. Upgrade pip and install dependencies (note the requirements path):

```bash
python3 -m pip install --upgrade pip
pip install -r hp_web_runner/requirements.txt
```

3. Run tests:

```bash
python3 -m pytest hp_web_runner/tests -q
```

4. Start locally (development)

Use the module entrypoint to avoid relative-import issues:

```bash
# default: host=127.0.0.1 port=5000
python3 -m hp_web_runner.app
# or with debug enabled
FLASK_DEBUG=1 python3 -m hp_web_runner.app
```

Useful environment variables

- `FLASK_HOST` (default `127.0.0.1`)
- `FLASK_PORT` (default `5000`)
- `FLASK_DEBUG` (`1` or `true` to enable debug)
- `PORT` (used by some PaaS providers / `Procfile`)

Health check

The app exposes a simple health endpoint useful for load balancers:

```
GET /health  -> { "status": "ok" }
```

Production options

- Run with gunicorn (recommended):

```bash
pip install --upgrade pip
pip install gunicorn
# from repository root
gunicorn -w 4 -b 0.0.0.0:5000 hp_web_runner.app:app
```

- Docker

The `Dockerfile` is located in `hp_web_runner/`. Build from the repository root
so the Docker context includes the package directory:

```bash
# from repository root
docker build -t hp_web_runner:latest ./hp_web_runner
docker run -p 5000:5000 --env FLASK_HOST=0.0.0.0 hp_web_runner:latest
```

Or use the provided `Procfile` for platforms like Heroku (it runs `gunicorn`).

Deployment and security notes

- The app no longer compiles or executes user-submitted code.
- Keep secrets and configuration out of the repository; use environment variables
	or your cloud provider's secret manager.
- For public deployment, place the app behind a reverse proxy (nginx) and
	terminate TLS there (or use the cloud provider's managed TLS).
- Configure logging and monitoring in production (gunicorn logs / container
	logs), and set up health checks against `/health`.

