"""
Admin API endpoints for configuration management.
"""
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import settings
from app.core.exceptions import PermissionDeniedException
from app.core.logging import logger
from app.db.quota_config_manager import QuotaConfigManager
from app.middleware.cognito_auth import get_current_user, get_dev_user
from app.schemas.admin import QuotaConfigResponse, QuotaConfigUpdate

router = APIRouter(prefix="/admin", tags=["admin"])

# 🚧 DEVELOPMENT MODE: Use mock authentication
USE_DEV_AUTH = settings.environment == "development"


def get_quota_config_manager() -> QuotaConfigManager:
    """Dependency injection for QuotaConfigManager."""
    return QuotaConfigManager()


def require_admin(
    current_user: dict = Depends(get_dev_user if USE_DEV_AUTH else get_current_user),
):
    """Verify user is admin."""
    if current_user.get("role") != "admin":
        raise PermissionDeniedException(
            "Admin access required",
            {"user_id": current_user.get("user_id"), "required_role": "admin"},
        )
    return current_user


@router.get(
    "/quota-config",
    response_model=QuotaConfigResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Quota Configuration",
    description="Get the current quota configuration for all models (Admin only).",
)
async def get_quota_config(
    current_user: dict = Depends(require_admin),
    manager: QuotaConfigManager = Depends(get_quota_config_manager),
):
    """
    Get quota configuration.

    Debug logging enabled.

    Returns:
    - Configuration with list of models and their QuotaCodes
    - If not found, initializes with default configuration

    Requires: Admin role
    """
    logger.info(f"[get_quota_config] Admin {current_user['user_id']} requested quota configuration")

    config = manager.get_config()
    logger.debug(f"[get_quota_config] Config from manager: {config}")

    # If no config exists, initialize default
    if not config:
        logger.info("[get_quota_config] No quota configuration found, initializing default")
        config = manager.initialize_default_config(current_user["user_id"])
        logger.debug(f"[get_quota_config] Initialized config: {config}")
    else:
        logger.info(f"[get_quota_config] Found existing config with {len(config.get('models', []))} models")

    return config


@router.put(
    "/quota-config",
    response_model=QuotaConfigResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Quota Configuration",
    description="Update the quota configuration with new model settings (Admin only).",
)
async def update_quota_config(
    config_update: QuotaConfigUpdate,
    current_user: dict = Depends(require_admin),
    manager: QuotaConfigManager = Depends(get_quota_config_manager),
):
    """
    Update quota configuration.

    Validates that at most 2 models have show_in_dashboard enabled.

    Args:
    - models: List of model configurations to update

    Returns:
    - Updated configuration

    Requires: Admin role
    """
    logger.info(
        f"Admin {current_user['user_id']} updating quota configuration with {len(config_update.models)} models"
    )

    # Validate: at most 2 models can have show_in_dashboard=True
    dashboard_count = sum(1 for model in config_update.models if model.show_in_dashboard)
    if dashboard_count > 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum 2 models can be shown in dashboard, got {dashboard_count}",
        )

    # Convert Pydantic models to dicts for DynamoDB
    models_data = [model.model_dump() for model in config_update.models]

    config = manager.update_config(models_data, current_user["user_id"])

    if not config:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update quota configuration",
        )

    logger.info(f"Quota configuration updated by {current_user['user_id']}")
    return config
