"""
Application configuration management using Pydantic Settings.

Loads configuration from environment variables with validation and type safety.
"""
from functools import lru_cache
from typing import List, Union

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application Settings
    app_name: str = Field(default="Account Platform API", alias="APP_NAME")
    app_version: str = Field(default="1.0.0", alias="APP_VERSION")
    environment: str = Field(default="development", alias="ENVIRONMENT")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    # Server Settings
    host: str = Field(default="0.0.0.0", alias="HOST")
    port: int = Field(default=8000, alias="PORT")

    # API Settings
    api_prefix: str = Field(default="/api", alias="API_PREFIX")
    docs_url: str | None = Field(default="/docs", alias="DOCS_URL")
    openapi_url: str | None = Field(default="/openapi.json", alias="OPENAPI_URL")
    cors_origins: Union[str, List[str]] = Field(
        default=["*"],
        alias="CORS_ORIGINS",
    )

    # AWS Settings
    aws_region: str = Field(default="us-east-1", alias="AWS_REGION")
    aws_access_key_id: str | None = Field(default=None, alias="AWS_ACCESS_KEY_ID")
    aws_secret_access_key: str | None = Field(default=None, alias="AWS_SECRET_ACCESS_KEY")

    # DynamoDB Settings
    dynamodb_endpoint_url: str | None = Field(default=None, alias="DYNAMODB_ENDPOINT_URL")
    dynamodb_accounts_table: str = Field(
        default="account-platform-aws-accounts", alias="DYNAMODB_ACCOUNTS_TABLE"
    )
    dynamodb_users_table: str = Field(
        default="account-platform-users", alias="DYNAMODB_USERS_TABLE"
    )
    dynamodb_audit_logs_table: str = Field(
        default="account-platform-audit-logs", alias="DYNAMODB_AUDIT_LOGS_TABLE"
    )
    quota_config_table_name: str = Field(
        default="account-platform-quota-config", alias="QUOTA_CONFIG_TABLE_NAME"
    )

    # KMS Settings
    kms_key_id: str = Field(default="", alias="KMS_KEY_ID")

    # Cognito Settings
    cognito_user_pool_id: str = Field(default="", alias="COGNITO_USER_POOL_ID")
    cognito_client_id: str = Field(default="", alias="COGNITO_CLIENT_ID")
    cognito_region: str = Field(default="us-east-1", alias="COGNITO_REGION")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from comma-separated string or list."""
        if isinstance(v, str):
            return [item.strip() for item in v.split(",") if item.strip()]
        return v

    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v):
        """Validate log level."""
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        v = v.upper()
        if v not in valid_levels:
            raise ValueError(f"Log level must be one of {valid_levels}")
        return v

    @field_validator("environment")
    @classmethod
    def validate_environment(cls, v):
        """Validate environment."""
        valid_envs = ["development", "staging", "production"]
        v = v.lower()
        if v not in valid_envs:
            raise ValueError(f"Environment must be one of {valid_envs}")
        return v


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.

    Using lru_cache ensures settings are loaded only once.
    """
    return Settings()


# Export settings instance
settings = get_settings()
