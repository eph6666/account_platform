"""
Health check endpoint.
"""
from fastapi import APIRouter, status

router = APIRouter()


@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
    summary="Health Check",
    description="Check if the API is healthy and responsive.",
    tags=["health"],
)
async def health_check():
    """
    Health check endpoint.

    Returns:
        dict: Health status information
    """
    return {
        "status": "healthy",
        "service": "Account Platform API",
        "version": "1.0.0",
    }
