FROM python:3.12-slim

WORKDIR /app

# Create a non-root user for security
RUN groupadd -r appgroup && useradd -r -g appgroup -m appuser

# Change ownership of the workdir to the non-root user first
RUN chown appuser:appgroup /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast package management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Switch to the non-root user for secure dependency installation and run context
USER appuser

# Copy only requirements to leverage cache
COPY --chown=appuser:appgroup pyproject.toml uv.lock .python-version ./

# Install dependencies directly as the non-root user
RUN uv sync --frozen --no-cache

# Copy the rest of the application with correct ownership
COPY --chown=appuser:appgroup . .

# Run the application
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
