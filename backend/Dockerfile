FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast package management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy only requirements to leverage cache
COPY pyproject.toml .python-version ./

# Install dependencies
RUN uv sync --frozen --no-cache

# Create a non-root user for security
RUN groupadd -r appgroup && useradd -r -g appgroup -m appuser
USER appuser

# Copy the rest of the application with correct ownership
COPY --chown=appuser:appgroup . .

# Run the application
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
