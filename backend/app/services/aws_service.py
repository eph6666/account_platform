"""
AWS service integration for account management.
"""
import hashlib
import random
import time
from typing import Any, Dict, Optional

import boto3
from botocore.exceptions import ClientError

from app.core.config import settings
from app.core.exceptions import AWSServiceException, InvalidCredentialsException
from app.core.logging import logger


class AWSService:
    """AWS API integration service."""

    def __init__(
        self,
        access_key: str,
        secret_key: str,
        region: str | None = None,
    ):
        """
        Initialize AWS service with credentials.

        Args:
            access_key: AWS access key ID
            secret_key: AWS secret access key
            region: AWS region (defaults to settings.aws_region)
        """
        self.access_key = access_key
        self.secret_key = secret_key
        self.region = region or settings.aws_region

        # Check if we're in development mode
        self.dev_mode = settings.environment == "development"

        if self.dev_mode:
            logger.warning("🚧 DEVELOPMENT MODE: Using mock AWS API responses")
            self.session = None
        else:
            self.session = boto3.Session(
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                region_name=self.region,
            )
            logger.info(f"AWS service initialized for region: {self.region}")

    def verify_credentials(self) -> Dict[str, Any]:
        """
        Verify AWS credentials are valid using STS GetCallerIdentity.

        Returns:
            Dict with account information:
            - valid: bool
            - account_id: str
            - user_arn: str
            - user_id: str

        Raises:
            InvalidCredentialsException: If credentials are invalid
        """
        # Development mode: return mock data
        if self.dev_mode:
            # Generate a fake but consistent account ID based on access key
            hash_obj = hashlib.md5(self.access_key.encode())
            account_id = str(int(hash_obj.hexdigest()[:12], 16))[:12].zfill(12)

            result = {
                "valid": True,
                "account_id": account_id,
                "user_arn": f"arn:aws:iam::{account_id}:user/dev-user",
                "user_id": "AIDACKCEVSQ6C2EXAMPLE",
            }
            logger.info(f"🚧 DEV: Mock credentials verified for account: {result['account_id']}")
            return result

        # Production mode: use real STS
        try:
            sts = self.session.client("sts")
            identity = sts.get_caller_identity()

            result = {
                "valid": True,
                "account_id": identity["Account"],
                "user_arn": identity["Arn"],
                "user_id": identity["UserId"],
            }

            logger.info(f"Credentials verified for account: {result['account_id']}")
            return result

        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            error_msg = f"Invalid AWS credentials: {error_code}"
            logger.error(error_msg)
            raise InvalidCredentialsException(
                error_msg, {"error_code": error_code, "error": str(e)}
            )

    def get_billing_address(self) -> Optional[Dict[str, str]]:
        """
        Get billing address for the AWS account.

        Uses AWS Account API to retrieve contact information.

        Returns:
            Dict with billing address or None if unavailable
        """
        # Development mode: return mock data
        if self.dev_mode:
            # Randomly choose between a few mock addresses
            mock_addresses = [
                {
                    "country": "US",
                    "state": "California",
                    "city": "San Francisco",
                    "address": "123 Market St",
                    "postal_code": "94102",
                },
                {
                    "country": "CN",
                    "state": "Beijing",
                    "city": "Beijing",
                    "address": "Chaoyang District",
                    "postal_code": "100000",
                },
                {
                    "country": "JP",
                    "state": "Tokyo",
                    "city": "Tokyo",
                    "address": "Shibuya",
                    "postal_code": "150-0002",
                },
            ]
            # Use access key to deterministically pick an address
            index = sum(ord(c) for c in self.access_key) % len(mock_addresses)
            address = mock_addresses[index]
            logger.info("🚧 DEV: Returned mock billing address")
            return address

        # Production mode: use real AWS Account API
        try:
            account = self.session.client("account", region_name=self.region)
            response = account.get_contact_information()

            contact = response.get("ContactInformation", {})

            billing_address = {
                "country": contact.get("CountryCode", ""),
                "state": contact.get("StateOrRegion", ""),
                "city": contact.get("City", ""),
                "address": contact.get("AddressLine1", ""),
                "postal_code": contact.get("PostalCode", ""),
            }

            logger.info("Retrieved billing address from AWS Account API")
            return billing_address

        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            logger.warning(
                f"Could not retrieve billing address: {error_code}. "
                "This may require additional IAM permissions."
            )
            return None
        except Exception as e:
            logger.error(f"Unexpected error getting billing address: {e}")
            return None

    def get_bedrock_quota(self) -> Dict[str, Any]:
        """
        Get Bedrock Claude 4.5 TPM quota for Sonnet (standard and 1M context) and Opus.

        Tries Service Quotas API first, falls back to Bedrock API.

        Returns:
            Dict with quota information:
            - claude_sonnet_45_v1_tpm: int (Sonnet V1 standard TPM quota)
            - claude_sonnet_45_v1_1m_tpm: int (Sonnet V1 1M context TPM quota)
            - claude_opus_45_tpm: int (Opus TPM quota)
            - last_updated: int (timestamp)
        """
        # Development mode: return mock quota
        if self.dev_mode:
            # Generate realistic TPM quotas for all three variants
            sonnet_v1_quotas = [100000, 200000, 400000, 600000, 800000]
            sonnet_1m_quotas = [20000, 40000, 80000, 100000, 200000]
            opus_quotas = [40000, 80000, 100000, 200000, 400000]

            # Use access key to deterministically pick quotas
            index = sum(ord(c) for c in self.access_key) % len(sonnet_v1_quotas)
            sonnet_v1_tpm = sonnet_v1_quotas[index]
            sonnet_1m_tpm = sonnet_1m_quotas[index]
            opus_tpm = opus_quotas[index]

            result = {
                "claude_sonnet_45_v1_tpm": sonnet_v1_tpm,
                "claude_sonnet_45_v1_1m_tpm": sonnet_1m_tpm,
                "claude_opus_45_tpm": opus_tpm,
                "last_updated": int(time.time()),
                "note": "Mock quota for development",
            }
            logger.info(f"🚧 DEV: Returned mock Bedrock quota: Sonnet V1 {sonnet_v1_tpm} TPM, Sonnet 1M {sonnet_1m_tpm} TPM, Opus {opus_tpm} TPM")
            return result

        # Production mode: try real APIs
        # Try Service Quotas API first
        quota = self._get_quota_from_service_quotas()
        if quota:
            return quota

        # Fallback to Bedrock API
        return self._get_quota_from_bedrock_api()

    def _get_quota_from_service_quotas(self) -> Optional[Dict[str, Any]]:
        """
        Get quota from Service Quotas API using specific QuotaCodes.

        Returns:
            Quota dict or None if unavailable
        """
        try:
            quotas = self.session.client("service-quotas", region_name=self.region)

            # Define specific QuotaCodes for Claude 4.5 quotas
            # These are the Global cross-region TPM quotas
            QUOTA_CODES = {
                "sonnet_v1": "L-27C57EE8",  # Sonnet 4.5 V1
                "sonnet_v1_1m": "L-4B26E44A",  # Sonnet 4.5 V1 1M Context
                "opus_45": "L-3ABF6ACC",  # Opus 4.5
            }

            sonnet_v1_tpm = 0
            sonnet_v1_1m_tpm = 0
            opus_tpm = 0
            found_quotas = []

            # Query each quota by QuotaCode
            for quota_key, quota_code in QUOTA_CODES.items():
                try:
                    response = quotas.get_service_quota(
                        ServiceCode="bedrock",
                        QuotaCode=quota_code
                    )
                    quota = response.get("Quota", {})
                    quota_name = quota.get("QuotaName", "")
                    quota_value = int(quota.get("Value", 0))

                    if quota_key == "sonnet_v1":
                        sonnet_v1_tpm = quota_value
                        found_quotas.append(f"Sonnet V1: {quota_name}")
                        logger.info(f"✓ Retrieved Sonnet 4.5 V1 quota: {quota_value} TPM")
                    elif quota_key == "sonnet_v1_1m":
                        sonnet_v1_1m_tpm = quota_value
                        found_quotas.append(f"Sonnet V1 1M: {quota_name}")
                        logger.info(f"✓ Retrieved Sonnet 4.5 V1 1M Context quota: {quota_value} TPM")
                    elif quota_key == "opus_45":
                        opus_tpm = quota_value
                        found_quotas.append(f"Opus 4.5: {quota_name}")
                        logger.info(f"✓ Retrieved Opus 4.5 quota: {quota_value} TPM")

                except ClientError as e:
                    error_code = e.response.get("Error", {}).get("Code", "Unknown")
                    logger.warning(f"Could not retrieve {quota_key} quota (code: {quota_code}): {error_code}")

            # If we found at least one quota, return the result
            if sonnet_v1_tpm > 0 or sonnet_v1_1m_tpm > 0 or opus_tpm > 0:
                logger.info(f"Successfully retrieved quotas - Sonnet V1: {sonnet_v1_tpm}, Sonnet V1 1M: {sonnet_v1_1m_tpm}, Opus: {opus_tpm}")
                return {
                    "claude_sonnet_45_v1_tpm": sonnet_v1_tpm,
                    "claude_sonnet_45_v1_1m_tpm": sonnet_v1_1m_tpm,
                    "claude_opus_45_tpm": opus_tpm,
                    "last_updated": int(time.time()),
                    "found_quotas": found_quotas,
                }

            logger.warning("Could not retrieve any Claude 4.5 TPM quotas")
            return None

        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            logger.warning(f"Service Quotas API error: {error_code}")
            return None

    def _get_quota_from_bedrock_api(self) -> Dict[str, Any]:
        """
        Get quota information from Bedrock API (fallback).

        Returns:
            Dict with available information (quota values set to 0 as not directly available)
        """
        try:
            bedrock = self.session.client("bedrock", region_name=self.region)

            # List foundation models
            response = bedrock.list_foundation_models(byProvider="Anthropic")

            models = response.get("modelSummaries", [])

            # Find Claude 4.5 models
            claude_45_models = [
                m
                for m in models
                if "claude" in m.get("modelId", "").lower()
                and ("4.5" in m.get("modelId", "") or "opus-4" in m.get("modelId", ""))
            ]

            result = {
                "claude_sonnet_45_v1_tpm": 0,  # Not directly available from Bedrock API
                "claude_sonnet_45_v1_1m_tpm": 0,  # Not directly available from Bedrock API
                "claude_opus_45_tpm": 0,  # Not directly available from Bedrock API
                "models_available": len(claude_45_models),
                "model_ids": [m.get("modelId") for m in claude_45_models],
                "note": "TPM quota not directly available from Bedrock API - requires Service Quotas API access",
                "last_updated": int(time.time()),
            }

            logger.warning(
                f"Bedrock API fallback: Found {len(claude_45_models)} Claude 4.5 models but cannot retrieve TPM quotas. "
                f"Grant servicequotas:GetServiceQuota permission to access quota information."
            )
            return result

        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            error_msg = f"Bedrock API error: {error_code}"
            logger.error(error_msg)
            raise AWSServiceException(
                error_msg, {"error_code": error_code, "error": str(e)}
            )

    def get_bedrock_quota_dynamic(self, models_config: list) -> Dict[str, Any]:
        """
        Get Bedrock quota dynamically based on configuration.

        Args:
            models_config: List of model configurations from quota_config table.
                           Each config should have: model_id, quota_code_tpm, has_1m_context, etc.

        Returns:
            Dict with quota information for all configured models
        """
        # Development mode: return mock quotas
        if self.dev_mode:
            result = {"last_updated": int(time.time())}

            # Generate mock quotas for each enabled model
            for model in models_config:
                if not model.get("enabled", False):
                    continue

                model_id = model["model_id"]
                # Use model_id to deterministically generate quota
                seed = sum(ord(c) for c in f"{self.access_key}{model_id}") % 5
                tpm_values = [100000, 200000, 400000, 600000, 800000]

                # Standard TPM
                field_name = model_id.replace("-", "_").replace(".", "_") + "_tpm"
                result[field_name] = tpm_values[seed]

                # 1M context variant if applicable
                if model.get("has_1m_context", False):
                    field_name_1m = field_name.replace("_tpm", "_1m_tpm")
                    result[field_name_1m] = tpm_values[seed] // 5  # 1M typically has lower quota

            logger.info(f"🚧 DEV: Returned mock quota for {len([m for m in models_config if m.get('enabled')])} models")
            return result

        # Production mode: query Service Quotas API
        try:
            quotas_client = self.session.client("service-quotas", region_name=self.region)
            result = {"last_updated": int(time.time())}

            for model in models_config:
                if not model.get("enabled", False):
                    continue

                model_id = model["model_id"]
                quota_code_tpm = model.get("quota_code_tpm")

                # Query standard TPM quota
                if quota_code_tpm:
                    try:
                        response = quotas_client.get_service_quota(
                            ServiceCode="bedrock",
                            QuotaCode=quota_code_tpm
                        )
                        quota_value = int(response.get("Quota", {}).get("Value", 0))
                        field_name = model_id.replace("-", "_").replace(".", "_") + "_tpm"
                        result[field_name] = quota_value
                        logger.info(f"✓ Retrieved {model_id} TPM quota: {quota_value}")
                    except ClientError as e:
                        logger.warning(f"Could not retrieve {model_id} TPM quota: {e}")
                        field_name = model_id.replace("-", "_").replace(".", "_") + "_tpm"
                        result[field_name] = 0

                # Query 1M context TPM quota if applicable
                if model.get("has_1m_context", False):
                    quota_code_tpm_1m = model.get("quota_code_tpm_1m")
                    if quota_code_tpm_1m:
                        try:
                            response = quotas_client.get_service_quota(
                                ServiceCode="bedrock",
                                QuotaCode=quota_code_tpm_1m
                            )
                            quota_value = int(response.get("Quota", {}).get("Value", 0))
                            field_name = model_id.replace("-", "_").replace(".", "_") + "_1m_tpm"
                            result[field_name] = quota_value
                            logger.info(f"✓ Retrieved {model_id} 1M context TPM quota: {quota_value}")
                        except ClientError as e:
                            logger.warning(f"Could not retrieve {model_id} 1M context TPM quota: {e}")
                            field_name = model_id.replace("-", "_").replace(".", "_") + "_1m_tpm"
                            result[field_name] = 0

            logger.info(f"Successfully retrieved quotas for configured models")
            return result

        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            logger.error(f"Error querying quotas: {error_code}")
            # Return empty result with timestamp
            return {"last_updated": int(time.time())}

    def test_bedrock_access(self) -> bool:
        """
        Test if credentials have Bedrock access.

        Returns:
            True if Bedrock is accessible
        """
        # Development mode: always return True
        if self.dev_mode:
            logger.info("🚧 DEV: Mock Bedrock access verified")
            return True

        # Production mode: test real access
        try:
            bedrock = self.session.client("bedrock", region_name=self.region)
            bedrock.list_foundation_models()
            logger.info("Bedrock access verified")
            return True
        except ClientError:
            logger.warning("No Bedrock access with these credentials")
            return False
