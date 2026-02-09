"""
Quota Configuration Manager for DynamoDB operations.
"""
import time
from typing import Any, Dict, Optional

import boto3
from botocore.exceptions import ClientError

from app.core.config import settings
from app.core.logging import logger


class QuotaConfigManager:
    """Manager for quota configuration operations."""

    CONFIG_ID = "global-quota-config"

    def __init__(self):
        """Initialize QuotaConfigManager with DynamoDB table."""
        resource_kwargs = {
            "region_name": settings.aws_region,
        }

        # Add endpoint_url for local development
        if settings.dynamodb_endpoint_url:
            resource_kwargs["endpoint_url"] = settings.dynamodb_endpoint_url

        # Add credentials for local development
        if settings.aws_access_key_id and settings.aws_secret_access_key:
            resource_kwargs["aws_access_key_id"] = settings.aws_access_key_id
            resource_kwargs["aws_secret_access_key"] = settings.aws_secret_access_key

        dynamodb = boto3.resource("dynamodb", **resource_kwargs)
        self.table = dynamodb.Table(settings.quota_config_table_name)
        logger.info(
            f"QuotaConfigManager initialized with table: {settings.quota_config_table_name}"
        )

    def get_config(self) -> Optional[Dict[str, Any]]:
        """
        Get quota configuration.

        Returns:
            Configuration dict or None if not found
        """
        try:
            logger.debug(f"[get_config] Querying table: {self.table.table_name}, key: {self.CONFIG_ID}")
            response = self.table.get_item(Key={"config_id": self.CONFIG_ID})
            logger.debug(f"[get_config] DynamoDB response: {response}")
            item = response.get("Item")
            if item:
                logger.info(f"[get_config] Retrieved quota configuration with {len(item.get('models', []))} models")
                return item
            logger.warning("[get_config] Quota configuration not found in DynamoDB")
            return None
        except ClientError as e:
            logger.error(f"[get_config] ClientError retrieving quota configuration: {e}")
            return None
        except Exception as e:
            logger.error(f"[get_config] Unexpected error: {e}", exc_info=True)
            return None

    def update_config(
        self, models: list, updated_by: str
    ) -> Optional[Dict[str, Any]]:
        """
        Update quota configuration.

        Args:
            models: List of model configurations
            updated_by: User ID who is updating the config

        Returns:
            Updated configuration dict or None on error
        """
        try:
            config = {
                "config_id": self.CONFIG_ID,
                "models": models,
                "updated_at": int(time.time()),
                "updated_by": updated_by,
            }

            logger.debug(f"[update_config] Putting item to table: {self.table.table_name}")
            logger.debug(f"[update_config] Config item: {config}")
            self.table.put_item(Item=config)
            logger.info(f"[update_config] Updated quota configuration by {updated_by}, {len(models)} models")
            return config
        except ClientError as e:
            logger.error(f"[update_config] ClientError updating quota configuration: {e}")
            return None
        except Exception as e:
            logger.error(f"[update_config] Unexpected error: {e}", exc_info=True)
            return None

    def initialize_default_config(self, updated_by: str = "system") -> Dict[str, Any]:
        """
        Initialize default quota configuration with Claude 4.5 models.

        Args:
            updated_by: User ID initializing the config (default: "system")

        Returns:
            Initialized configuration dict
        """
        default_models = [
            {
                "model_id": "claude-sonnet-4.5-v1",
                "display_name": "Claude Sonnet 4.5 V1",
                "quota_code_tpm": "L-27C57EE8",
                "quota_code_rpm": None,
                "enabled": True,
                "show_in_dashboard": True,  # Show in dashboard by default
                "has_1m_context": True,
                "quota_code_tpm_1m": "L-4B26E44A",
                "quota_code_rpm_1m": None,
            },
            {
                "model_id": "claude-opus-4.5",
                "display_name": "Claude Opus 4.5",
                "quota_code_tpm": "L-3ABF6ACC",
                "quota_code_rpm": None,
                "enabled": True,
                "show_in_dashboard": True,  # Show in dashboard by default
                "has_1m_context": False,
                "quota_code_tpm_1m": None,
                "quota_code_rpm_1m": None,
            },
            {
                "model_id": "claude-opus-4.6-v1",
                "display_name": "Claude Opus 4.6 V1",
                "quota_code_tpm": "L-3DCCFAA4",
                "quota_code_rpm": None,
                "enabled": False,  # Disabled by default, admin can enable
                "show_in_dashboard": False,
                "has_1m_context": True,
                "quota_code_tpm_1m": "L-4C59C1F4",
                "quota_code_rpm_1m": None,
            },
        ]

        logger.info(f"[initialize_default_config] Creating default config with {len(default_models)} models")
        logger.debug(f"[initialize_default_config] Default models: {default_models}")

        config = self.update_config(default_models, updated_by)

        if config:
            logger.info(f"[initialize_default_config] Successfully initialized with {len(config.get('models', []))} models")
        else:
            logger.error("[initialize_default_config] Failed to initialize - update_config returned None")

        return config
