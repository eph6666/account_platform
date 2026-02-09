"""
Account management business logic service.
"""
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.core.exceptions import (
    AccountNotFoundException,
    InvalidCredentialsException,
    PermissionDeniedException,
)
from app.core.logging import logger
from app.db.dynamodb import DynamoDBClient
from app.db.models import AuditLogManager, AWSAccountManager
from app.services.aws_service import AWSService
from app.services.encryption_service import KMSService


class AccountService:
    """Account management business logic service."""

    def __init__(self):
        """Initialize account service with dependencies."""
        self.db_client = DynamoDBClient()
        self.kms_service = KMSService()
        self.account_manager = AWSAccountManager(self.db_client)
        self.audit_manager = AuditLogManager(self.db_client)

        logger.info("AccountService initialized")

    async def create_account(
        self,
        access_key: str,
        secret_key: str,
        account_name: str,
        created_by: str,
        user_role: str,
        region: str = "us-east-1",
    ) -> Dict[str, Any]:
        """
        Create a new AWS account.

        Steps:
        1. Verify credentials are valid
        2. Get account information from AWS
        3. Encrypt credentials with KMS
        4. Get billing address (if available)
        5. Get Bedrock quota for specified region
        6. Store in DynamoDB
        7. Log action

        Args:
            access_key: AWS access key ID
            secret_key: AWS secret access key
            account_name: Display name for the account
            created_by: User ID creating the account
            user_role: Role of the user (must be 'admin')
            region: AWS region for Bedrock quota (default: us-east-1)

        Returns:
            Created account information (without credentials)

        Raises:
            PermissionDeniedException: If user is not admin
            InvalidCredentialsException: If AWS credentials are invalid
        """
        # Permission check
        if user_role != "admin":
            raise PermissionDeniedException(
                "Only admin users can create accounts",
                {"user_id": created_by, "required_role": "admin"},
            )

        logger.info(f"Creating account: {account_name} in region: {region} by user: {created_by}")

        # Step 1: Verify credentials and get account info
        aws_service = AWSService(access_key, secret_key, settings.aws_region)
        verification = aws_service.verify_credentials()

        if not verification.get("valid"):
            raise InvalidCredentialsException(
                "Invalid AWS credentials",
                {"verification": verification},
            )

        account_id = verification["account_id"]
        logger.info(f"Verified AWS account: {account_id}")

        # Step 2: Encrypt credentials
        encrypted_access_key = self.kms_service.encrypt(access_key)
        encrypted_secret_key = self.kms_service.encrypt(secret_key)
        logger.info(f"Encrypted credentials for account: {account_id}")

        # Step 3: Get billing address (optional)
        billing_address = aws_service.get_billing_address()

        # Step 4: Get Bedrock quota for the specified region
        aws_service_for_region = AWSService(access_key, secret_key, region)
        bedrock_quota = aws_service_for_region.get_bedrock_quota()

        # Step 5: Store account
        account = self.account_manager.create_account(
            account_id=account_id,
            account_name=account_name,
            encrypted_access_key=encrypted_access_key,
            encrypted_secret_key=encrypted_secret_key,
            encryption_key_id=self.kms_service.key_id,
            created_by=created_by,
            region=region,
            billing_address=billing_address,
            bedrock_quota=bedrock_quota,
        )

        # Step 6: Log action
        self.audit_manager.log_action(
            user_id=created_by,
            action="create_account",
            resource_type="account",
            resource_id=account_id,
            details={"account_name": account_name, "region": region},
            status="success",
        )

        logger.info(f"Account created successfully: {account_id} in region: {region}")
        return account

    async def list_accounts(
        self, user_id: str, user_role: str
    ) -> List[Dict[str, Any]]:
        """
        List accounts based on user role.

        Args:
            user_id: User ID
            user_role: User role ('admin' or 'user')

        Returns:
            List of accounts (without credentials)
        """
        logger.info(f"Listing accounts for user: {user_id} (role: {user_role})")

        accounts = self.account_manager.list_accounts(
            user_id=user_id, user_role=user_role
        )

        logger.info(f"Found {len(accounts)} accounts for user: {user_id}")
        return accounts

    async def get_account(self, account_id: str) -> Dict[str, Any]:
        """
        Get account details.

        Args:
            account_id: AWS account ID

        Returns:
            Account information (without credentials)

        Raises:
            AccountNotFoundException: If account not found
        """
        account = self.account_manager.get_account(account_id)

        if not account:
            raise AccountNotFoundException(
                f"Account not found: {account_id}",
                {"account_id": account_id},
            )

        return account

    async def export_credentials(
        self,
        account_id: str,
        user_id: str,
        user_role: str,
        ip_address: Optional[str] = None,
    ) -> Dict[str, str]:
        """
        Export decrypted AKSK credentials (Admin only).

        Args:
            account_id: AWS account ID
            user_id: User requesting export
            user_role: User role (must be 'admin')
            ip_address: Optional IP address for audit

        Returns:
            Dict with decrypted credentials

        Raises:
            PermissionDeniedException: If user is not admin
            AccountNotFoundException: If account not found
        """
        # Permission check
        if user_role != "admin":
            raise PermissionDeniedException(
                "Only admin users can export credentials",
                {"user_id": user_id, "required_role": "admin"},
            )

        logger.warning(
            f"Credentials export requested for account: {account_id} by user: {user_id}"
        )

        # Get encrypted credentials
        creds = self.account_manager.get_account_credentials(account_id)

        if not creds:
            raise AccountNotFoundException(
                f"Account not found: {account_id}",
                {"account_id": account_id},
            )

        # Decrypt credentials
        access_key = self.kms_service.decrypt(creds["access_key_encrypted"])
        secret_key = self.kms_service.decrypt(creds["secret_key_encrypted"])

        # Log action (IMPORTANT for security audit)
        self.audit_manager.log_action(
            user_id=user_id,
            action="export_credentials",
            resource_type="account",
            resource_id=account_id,
            details={"reason": "admin_export"},
            ip_address=ip_address,
            status="success",
        )

        logger.warning(
            f"Credentials exported for account: {account_id} by user: {user_id}"
        )

        return {
            "account_id": account_id,
            "access_key": access_key,
            "secret_key": secret_key,
        }

    async def get_bedrock_quota(self, account_id: str) -> Dict[str, Any]:
        """Get Bedrock quota for an account."""
        account = await self.get_account(account_id)
        return account.get("bedrock_quota", {})

    async def refresh_bedrock_quota(
        self,
        account_id: str,
        user_id: str,
        user_role: str,
    ) -> Dict[str, Any]:
        """
        Refresh Bedrock quota information (Admin only).

        Args:
            account_id: AWS account ID
            user_id: User requesting refresh
            user_role: User role (must be 'admin')

        Returns:
            Updated quota information

        Raises:
            PermissionDeniedException: If user is not admin
        """
        # Permission check
        if user_role != "admin":
            raise PermissionDeniedException(
                "Only admin users can refresh quota",
                {"user_id": user_id, "required_role": "admin"},
            )

        logger.info(f"Refreshing Bedrock quota for account: {account_id}")

        # Get account to retrieve region
        account = await self.get_account(account_id)
        region = account.get("region", "us-east-1")

        # Get encrypted credentials
        creds = self.account_manager.get_account_credentials(account_id)

        if not creds:
            raise AccountNotFoundException(
                f"Account not found: {account_id}",
                {"account_id": account_id},
            )

        # Decrypt credentials
        access_key = self.kms_service.decrypt(creds["access_key_encrypted"])
        secret_key = self.kms_service.decrypt(creds["secret_key_encrypted"])

        # Get quota configuration
        from app.db.quota_config_manager import QuotaConfigManager
        quota_config_manager = QuotaConfigManager()
        quota_config = quota_config_manager.get_config()

        # Query quota from AWS using the account's region
        aws_service = AWSService(access_key, secret_key, region)

        # Use dynamic quota query if config exists, otherwise fallback to hardcoded
        if quota_config and quota_config.get("models"):
            quota = aws_service.get_bedrock_quota_dynamic(quota_config["models"])
        else:
            # Fallback to legacy method if no config
            logger.warning("No quota config found, using legacy quota query")
            quota = aws_service.get_bedrock_quota()

        # Update in database
        self.account_manager.update_bedrock_quota(account_id, quota)

        # Log action
        self.audit_manager.log_action(
            user_id=user_id,
            action="refresh_quota",
            resource_type="account",
            resource_id=account_id,
            details={"quota": quota, "region": region},
            status="success",
        )

        logger.info(f"Bedrock quota refreshed for account: {account_id} in region: {region}")
        return quota

    async def get_billing_address(self, account_id: str) -> Dict[str, Any]:
        """Get billing address for an account."""
        account = await self.get_account(account_id)
        return account.get("billing_address", {})

    async def update_billing_address(
        self,
        account_id: str,
        billing_address: Dict[str, str],
        user_id: str,
        user_role: str,
    ) -> bool:
        """
        Update billing address (Admin only).

        Args:
            account_id: AWS account ID
            billing_address: New billing address
            user_id: User updating address
            user_role: User role (must be 'admin')

        Returns:
            True if updated successfully

        Raises:
            PermissionDeniedException: If user is not admin
        """
        # Permission check
        if user_role != "admin":
            raise PermissionDeniedException(
                "Only admin users can update billing address",
                {"user_id": user_id, "required_role": "admin"},
            )

        success = self.account_manager.update_billing_address(
            account_id, billing_address
        )

        if success:
            # Log action
            self.audit_manager.log_action(
                user_id=user_id,
                action="update_billing_address",
                resource_type="account",
                resource_id=account_id,
                details={"billing_address": billing_address},
                status="success",
            )

        return success

    async def delete_account(
        self,
        account_id: str,
        user_id: str,
        user_role: str,
    ) -> bool:
        """
        Delete an account (Admin only).

        This performs a soft delete by setting status to 'inactive'.

        Args:
            account_id: AWS account ID
            user_id: User deleting account
            user_role: User role (must be 'admin')

        Returns:
            True if deleted successfully

        Raises:
            PermissionDeniedException: If user is not admin
            AccountNotFoundException: If account not found
        """
        # Permission check
        if user_role != "admin":
            raise PermissionDeniedException(
                "Only admin users can delete accounts",
                {"user_id": user_id, "required_role": "admin"},
            )

        # Verify account exists
        account = await self.get_account(account_id)
        if not account:
            raise AccountNotFoundException(
                f"Account not found: {account_id}",
                {"account_id": account_id},
            )

        # Soft delete account
        success = self.account_manager.delete_account(account_id)

        if success:
            # Log action
            self.audit_manager.log_action(
                user_id=user_id,
                action="delete_account",
                resource_type="account",
                resource_id=account_id,
                details={"account_name": account.get("account_name")},
                status="success",
            )

            logger.info(f"Account {account_id} deleted by user {user_id}")

        return success
