# Multi-stage Dockerfile for Account Platform Backend
# Using official uv image for faster dependency management

# Stage 1: Builder
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS builder

# Set working directory
WORKDIR /build

# Copy dependency files
COPY pyproject.toml ./

# Install dependencies using uv
RUN uv venv && uv pip install --python .venv/bin/python -r pyproject.toml

# Stage 2: Runtime
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install runtime system dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 -s /bin/bash appuser

# Copy virtual environment from builder
COPY --from=builder /build/.venv /app/.venv

# Copy application code
COPY app /app/app

# Set ownership
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Set environment variables
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run application
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
