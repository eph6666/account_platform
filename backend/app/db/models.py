"""
Data Manager classes for DynamoDB operations.
"""
import time
from typing import Any, Dict, List, Optional
from uuid import uuid4

from botocore.exceptions import ClientError

from app.core.logging import logger
from app.db.dynamodb import DynamoDBClient


class AWSAccountManager:
    """Manager for AWS account operations."""

    def __init__(self, dynamodb_client: DynamoDBClient):
        """Initialize AWS account manager."""
        self.dynamodb = dynamodb_client.dynamodb
        self.table = self.dynamodb.Table(dynamodb_client.accounts_table_name)

    def create_account(
        self,
        account_id: str,
        account_name: str,
        encrypted_access_key: str,
        encrypted_secret_key: str,
        encryption_key_id: str,
        created_by: str,
        region: str = "us-east-1",
        account_email: Optional[str] = None,
        billing_address: Optional[Dict[str, Any]] = None,
        bedrock_quota: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Create a new AWS account record.

        Args:
            account_id: AWS account ID
            account_name: Display name for the account
            encrypted_access_key: KMS-encrypted access key (Base64)
            encrypted_secret_key: KMS-encrypted secret key (Base64)
            encryption_key_id: KMS key ID used for encryption
            created_by: User ID who created this account
            region: AWS region for Bedrock quota (default: us-east-1)
            account_email: Optional account email
            billing_address: Optional billing address dict
            bedrock_quota: Optional Bedrock quota information

        Returns:
            Created account item
        """
        timestamp = int(time.time())

        item = {
            "account_id": account_id,
            "account_name": account_name,
            "account_email": account_email or "",
            "region": region,
            "access_key_encrypted": encrypted_access_key,
            "secret_key_encrypted": encrypted_secret_key,
            "encryption_key_id": encryption_key_id,
            "billing_address": billing_address or {},
            "bedrock_quota": bedrock_quota or {},
            "status": "active",
            "created_at": timestamp,
            "updated_at": timestamp,
            "created_by": created_by,
            "metadata": {},
        }

        self.table.put_item(Item=item)
        logger.info(f"Created account: {account_id} by user: {created_by}")

        # Remove encrypted credentials from return value
        return_item = item.copy()
        return_item.pop("access_key_encrypted", None)
        return_item.pop("secret_key_encrypted", None)
        return_item.pop("encryption_key_id", None)

        return return_item

    def get_account(self, account_id: str) -> Optional[Dict[str, Any]]:
        """
        Get account by ID (without credentials).

        Args:
            account_id: AWS account ID

        Returns:
            Account item or None if not found
        """
        try:
            response = self.table.get_item(Key={"account_id": account_id})
            item = response.get("Item")

            if item:
                # Remove encrypted credentials from response
                item.pop("access_key_encrypted", None)
                item.pop("secret_key_encrypted", None)
                item.pop("encryption_key_id", None)

            return item
        except ClientError as e:
            logger.error(f"Error getting account {account_id}: {e}")
            return None

    def get_account_credentials(
        self, account_id: str
    ) -> Optional[Dict[str, str]]:
        """
        Get account credentials (encrypted).

        Args:
            account_id: AWS account ID

        Returns:
            Dict with encrypted credentials or None
        """
        try:
            response = self.table.get_item(Key={"account_id": account_id})
            item = response.get("Item")

            if not item:
                return None

            return {
                "account_id": account_id,
                "access_key_encrypted": item.get("access_key_encrypted", ""),
                "secret_key_encrypted": item.get("secret_key_encrypted", ""),
                "encryption_key_id": item.get("encryption_key_id", ""),
            }
        except ClientError as e:
            logger.error(f"Error getting credentials for {account_id}: {e}")
            return None

    def list_accounts(
        self, user_id: Optional[str] = None, user_role: str = "user"
    ) -> List[Dict[str, Any]]:
        """
        List accounts based on user role.

        Args:
            user_id: User ID (required for non-admin users)
            user_role: User role ('admin' or 'user')

        Returns:
            List of account items
        """
        try:
            if user_role == "admin":
                # Admin can see all accounts
                response = self.table.scan()
                items = response.get("Items", [])
            else:
                # Regular users only see accounts they created
                if not user_id:
                    return []

                response = self.table.query(
                    IndexName="created_by-index",
                    KeyConditionExpression="created_by = :user_id",
                    ExpressionAttributeValues={":user_id": user_id},
                )
                items = response.get("Items", [])

            # Remove encrypted credentials from all items
            for item in items:
                item.pop("access_key_encrypted", None)
                item.pop("secret_key_encrypted", None)
                item.pop("encryption_key_id", None)

            return items
        except ClientError as e:
            logger.error(f"Error listing accounts: {e}")
            return []

    def update_billing_address(
        self, account_id: str, billing_address: Dict[str, str]
    ) -> bool:
        """Update billing address for an account."""
        try:
            self.table.update_item(
                Key={"account_id": account_id},
                UpdateExpression="SET billing_address = :addr, updated_at = :updated",
                ExpressionAttributeValues={
                    ":addr": billing_address,
                    ":updated": int(time.time()),
                },
            )
            logger.info(f"Updated billing address for account: {account_id}")
            return True
        except ClientError as e:
            logger.error(f"Error updating billing address: {e}")
            return False

    def update_bedrock_quota(
        self, account_id: str, quota_data: Dict[str, Any]
    ) -> bool:
        """Update Bedrock quota information for an account."""
        try:
            self.table.update_item(
                Key={"account_id": account_id},
                UpdateExpression="SET bedrock_quota = :quota, updated_at = :updated",
                ExpressionAttributeValues={
                    ":quota": quota_data,
                    ":updated": int(time.time()),
                },
            )
            logger.info(f"Updated Bedrock quota for account: {account_id}")
            return True
        except ClientError as e:
            logger.error(f"Error updating Bedrock quota: {e}")
            return False

    def delete_account(self, account_id: str) -> bool:
        """Delete an account (soft delete by setting status to inactive)."""
        try:
            self.table.update_item(
                Key={"account_id": account_id},
                UpdateExpression="SET #status = :status, updated_at = :updated",
                ExpressionAttributeNames={"#status": "status"},
                ExpressionAttributeValues={
                    ":status": "inactive",
                    ":updated": int(time.time()),
                },
            )
            logger.info(f"Deleted (deactivated) account: {account_id}")
            return True
        except ClientError as e:
            logger.error(f"Error deleting account: {e}")
            return False


class AuditLogManager:
    """Manager for audit log operations."""

    def __init__(self, dynamodb_client: DynamoDBClient):
        """Initialize audit log manager."""
        self.dynamodb = dynamodb_client.dynamodb
        self.table = self.dynamodb.Table(dynamodb_client.audit_logs_table_name)

    def log_action(
        self,
        user_id: str,
        action: str,
        resource_type: str,
        resource_id: str,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        status: str = "success",
    ) -> bool:
        """
        Log an action to the audit log.

        Args:
            user_id: User who performed the action
            action: Action type (e.g., 'create_account', 'export_credentials')
            resource_type: Type of resource affected
            resource_id: ID of the resource
            details: Additional details about the action
            ip_address: User's IP address
            user_agent: User's user agent
            status: Action status ('success' or 'failure')

        Returns:
            True if logged successfully
        """
        timestamp = int(time.time())
        log_id = str(uuid4())

        # Calculate TTL (90 days from now)
        ttl = timestamp + (90 * 24 * 60 * 60)

        item = {
            "log_id": log_id,
            "timestamp": timestamp,
            "user_id": user_id,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "details": details or {},
            "ip_address": ip_address or "",
            "user_agent": user_agent or "",
            "status": status,
            "ttl": ttl,
        }

        try:
            self.table.put_item(Item=item)
            logger.info(
                f"Audit log: {action} on {resource_type}:{resource_id} by {user_id}"
            )
            return True
        except ClientError as e:
            logger.error(f"Error creating audit log: {e}")
            return False

    def get_user_logs(
        self, user_id: str, limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get audit logs for a specific user.

        Args:
            user_id: User ID
            limit: Maximum number of logs to return

        Returns:
            List of audit log items
        """
        try:
            response = self.table.query(
                IndexName="user_id-timestamp-index",
                KeyConditionExpression="user_id = :user_id",
                ExpressionAttributeValues={":user_id": user_id},
                Limit=limit,
                ScanIndexForward=False,  # Most recent first
            )
            return response.get("Items", [])
        except ClientError as e:
            logger.error(f"Error getting user logs: {e}")
            return []
