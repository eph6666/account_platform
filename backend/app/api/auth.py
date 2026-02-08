"""
Authentication API endpoints.
"""
from fastapi import APIRouter, Depends, status

from app.core.config import settings
from app.middleware.cognito_auth import get_current_user, get_dev_user
from app.schemas.auth import CognitoConfig, UserInfo

router = APIRouter(prefix="/auth", tags=["auth"])

# 🚧 DEVELOPMENT MODE: Use mock authentication
USE_DEV_AUTH = settings.environment == "development"


@router.get(
    "/config",
    response_model=CognitoConfig,
    status_code=status.HTTP_200_OK,
    summary="Get Cognito Configuration",
    description="Get Cognito configuration for frontend initialization (public endpoint).",
)
async def get_cognito_config():
    """
    Get Cognito configuration.

    Returns Cognito User Pool ID, Client ID, and Region for frontend.
    This is a public endpoint (no authentication required).
    """
    return CognitoConfig(
        user_pool_id=settings.cognito_user_pool_id,
        client_id=settings.cognito_client_id,
        region=settings.cognito_region,
    )


@router.get(
    "/me",
    response_model=UserInfo,
    status_code=status.HTTP_200_OK,
    summary="Get Current User",
    description="Get information about the currently authenticated user.",
)
async def get_me(current_user: dict = Depends(get_dev_user if USE_DEV_AUTH else get_current_user)):
    """
    Get current user information.

    Requires:
        - Valid JWT token in Authorization header (production)
        - No authentication in development mode

    Returns:
        User information including user_id, email, username, and role
    """
    return UserInfo(**current_user)
