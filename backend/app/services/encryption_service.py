"""
KMS encryption service for securing AWS credentials.
"""
import base64

import boto3
from botocore.exceptions import ClientError

from app.core.config import settings
from app.core.exceptions import EncryptionException
from app.core.logging import logger


class KMSService:
    """KMS encryption service for credential security."""

    def __init__(self, key_id: str | None = None, region: str | None = None):
        """
        Initialize KMS service.

        Args:
            key_id: KMS key ID (defaults to settings.kms_key_id)
            region: AWS region (defaults to settings.aws_region)
        """
        self.key_id = key_id or settings.kms_key_id
        self.region = region or settings.aws_region

        # Check if we're in development mode
        self.dev_mode = settings.environment == "development"

        if self.dev_mode:
            logger.warning("🚧 DEVELOPMENT MODE: Using mock encryption (base64) instead of KMS")
            self.kms = None
        else:
            self.kms = boto3.client(
                "kms",
                region_name=self.region,
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key,
            )
            logger.info(f"KMS service initialized with key: {self.key_id[:8]}...")

    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt plaintext using KMS (or mock encryption in dev mode).

        Args:
            plaintext: String to encrypt

        Returns:
            Base64-encoded ciphertext

        Raises:
            EncryptionException: If encryption fails
        """
        # Development mode: use simple base64 encoding as mock encryption
        if self.dev_mode:
            try:
                # Add a prefix to indicate this is mock encryption
                mock_encrypted = f"MOCK:{plaintext}"
                encrypted = base64.b64encode(mock_encrypted.encode("utf-8")).decode("utf-8")
                logger.debug("🚧 DEV: Used mock encryption (base64)")
                return encrypted
            except Exception as e:
                error_msg = f"Mock encryption failed: {str(e)}"
                logger.error(error_msg)
                raise EncryptionException(error_msg, {"error": str(e)})

        # Production mode: use real KMS
        try:
            response = self.kms.encrypt(
                KeyId=self.key_id,
                Plaintext=plaintext.encode("utf-8"),
            )

            ciphertext_blob = response["CiphertextBlob"]
            encrypted = base64.b64encode(ciphertext_blob).decode("utf-8")

            logger.debug(f"Successfully encrypted data using KMS key: {self.key_id[:8]}...")
            return encrypted

        except ClientError as e:
            error_msg = f"KMS encryption failed: {str(e)}"
            logger.error(error_msg)
            raise EncryptionException(error_msg, {"error": str(e)})
        except Exception as e:
            error_msg = f"Unexpected encryption error: {str(e)}"
            logger.error(error_msg)
            raise EncryptionException(error_msg, {"error": str(e)})

    def decrypt(self, ciphertext_base64: str) -> str:
        """
        Decrypt ciphertext using KMS (or mock decryption in dev mode).

        Args:
            ciphertext_base64: Base64-encoded ciphertext

        Returns:
            Decrypted plaintext string

        Raises:
            EncryptionException: If decryption fails
        """
        # Development mode: decode base64 mock encryption
        if self.dev_mode:
            try:
                decoded = base64.b64decode(ciphertext_base64).decode("utf-8")
                # Remove the MOCK: prefix
                if decoded.startswith("MOCK:"):
                    plaintext = decoded[5:]  # Remove "MOCK:" prefix
                    logger.debug("🚧 DEV: Used mock decryption (base64)")
                    return plaintext
                else:
                    # Handle old format without prefix
                    return decoded
            except Exception as e:
                error_msg = f"Mock decryption failed: {str(e)}"
                logger.error(error_msg)
                raise EncryptionException(error_msg, {"error": str(e)})

        # Production mode: use real KMS
        try:
            ciphertext_blob = base64.b64decode(ciphertext_base64)

            response = self.kms.decrypt(CiphertextBlob=ciphertext_blob)

            plaintext = response["Plaintext"].decode("utf-8")

            logger.debug("Successfully decrypted data using KMS")
            return plaintext

        except ClientError as e:
            error_msg = f"KMS decryption failed: {str(e)}"
            logger.error(error_msg)
            raise EncryptionException(error_msg, {"error": str(e)})
        except Exception as e:
            error_msg = f"Unexpected decryption error: {str(e)}"
            logger.error(error_msg)
            raise EncryptionException(error_msg, {"error": str(e)})
