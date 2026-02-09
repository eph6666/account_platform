"""
DynamoDB client and table management.

Provides interfaces for interacting with DynamoDB tables for accounts,
users, and audit logs.
"""
import boto3
from botocore.exceptions import ClientError

from app.core.config import settings
from app.core.logging import logger


class DynamoDBClient:
    """DynamoDB client for managing tables and operations."""

    def __init__(self):
        """Initialize DynamoDB client."""
        # Build boto3 resource kwargs, only include credentials if explicitly set
        # This allows boto3 to use IAM roles/instance profiles in cloud environments
        resource_kwargs = {
            "region_name": settings.aws_region,
        }

        # Only add endpoint_url if specified (for local development)
        if settings.dynamodb_endpoint_url:
            resource_kwargs["endpoint_url"] = settings.dynamodb_endpoint_url

        # Only add explicit credentials if both are provided (for local development)
        # In ECS/cloud, boto3 will automatically use the task role
        if settings.aws_access_key_id and settings.aws_secret_access_key:
            resource_kwargs["aws_access_key_id"] = settings.aws_access_key_id
            resource_kwargs["aws_secret_access_key"] = settings.aws_secret_access_key

        self.dynamodb = boto3.resource("dynamodb", **resource_kwargs)

        self.accounts_table_name = settings.dynamodb_accounts_table
        self.users_table_name = settings.dynamodb_users_table
        self.audit_logs_table_name = settings.dynamodb_audit_logs_table

        logger.info(f"DynamoDB client initialized for region: {settings.aws_region}")
        if settings.dynamodb_endpoint_url:
            logger.info(f"Using custom endpoint: {settings.dynamodb_endpoint_url}")

    def create_tables(self):
        """Create all required DynamoDB tables if they don't exist (for local development)."""
        self._create_accounts_table()
        self._create_users_table()
        self._create_audit_logs_table()
        self._create_quota_config_table()

    def _create_accounts_table(self):
        """Create AWS accounts table."""
        try:
            table = self.dynamodb.create_table(
                TableName=self.accounts_table_name,
                KeySchema=[
                    {"AttributeName": "account_id", "KeyType": "HASH"},
                ],
                AttributeDefinitions=[
                    {"AttributeName": "account_id", "AttributeType": "S"},
                    {"AttributeName": "created_by", "AttributeType": "S"},
                ],
                GlobalSecondaryIndexes=[
                    {
                        "IndexName": "created_by-index",
                        "KeySchema": [
                            {"AttributeName": "created_by", "KeyType": "HASH"},
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                    }
                ],
                BillingMode="PAY_PER_REQUEST",
            )
            table.wait_until_exists()
            logger.info(f"Created table: {self.accounts_table_name}")
        except ClientError as e:
            if e.response["Error"]["Code"] == "ResourceInUseException":
                logger.info(f"Table already exists: {self.accounts_table_name}")
            else:
                raise

    def _create_users_table(self):
        """Create users table."""
        try:
            table = self.dynamodb.create_table(
                TableName=self.users_table_name,
                KeySchema=[
                    {"AttributeName": "user_id", "KeyType": "HASH"},
                ],
                AttributeDefinitions=[
                    {"AttributeName": "user_id", "AttributeType": "S"},
                    {"AttributeName": "email", "AttributeType": "S"},
                ],
                GlobalSecondaryIndexes=[
                    {
                        "IndexName": "email-index",
                        "KeySchema": [
                            {"AttributeName": "email", "KeyType": "HASH"},
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                    }
                ],
                BillingMode="PAY_PER_REQUEST",
            )
            table.wait_until_exists()
            logger.info(f"Created table: {self.users_table_name}")
        except ClientError as e:
            if e.response["Error"]["Code"] == "ResourceInUseException":
                logger.info(f"Table already exists: {self.users_table_name}")
            else:
                raise

    def _create_audit_logs_table(self):
        """Create audit logs table."""
        try:
            table = self.dynamodb.create_table(
                TableName=self.audit_logs_table_name,
                KeySchema=[
                    {"AttributeName": "log_id", "KeyType": "HASH"},
                    {"AttributeName": "timestamp", "KeyType": "RANGE"},
                ],
                AttributeDefinitions=[
                    {"AttributeName": "log_id", "AttributeType": "S"},
                    {"AttributeName": "timestamp", "AttributeType": "N"},
                    {"AttributeName": "user_id", "AttributeType": "S"},
                ],
                GlobalSecondaryIndexes=[
                    {
                        "IndexName": "user_id-timestamp-index",
                        "KeySchema": [
                            {"AttributeName": "user_id", "KeyType": "HASH"},
                            {"AttributeName": "timestamp", "KeyType": "RANGE"},
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                    }
                ],
                BillingMode="PAY_PER_REQUEST",
            )
            table.wait_until_exists()
            logger.info(f"Created table: {self.audit_logs_table_name}")
        except ClientError as e:
            if e.response["Error"]["Code"] == "ResourceInUseException":
                logger.info(f"Table already exists: {self.audit_logs_table_name}")
            else:
                raise

    def _create_quota_config_table(self):
        """Create quota config table."""
        from app.core.config import settings
        try:
            table = self.dynamodb.create_table(
                TableName=settings.quota_config_table_name,
                KeySchema=[
                    {"AttributeName": "config_id", "KeyType": "HASH"},
                ],
                AttributeDefinitions=[
                    {"AttributeName": "config_id", "AttributeType": "S"},
                ],
                BillingMode="PAY_PER_REQUEST",
            )
            table.wait_until_exists()
            logger.info(f"Created table: {settings.quota_config_table_name}")
        except ClientError as e:
            if e.response["Error"]["Code"] == "ResourceInUseException":
                logger.info(f"Table already exists: {settings.quota_config_table_name}")
            else:
                raise
