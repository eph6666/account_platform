"""
Custom exceptions for Account Platform.
"""


class AccountPlatformException(Exception):
    """Base exception for Account Platform."""

    def __init__(self, message: str, detail: dict | None = None):
        self.message = message
        self.detail = detail or {}
        super().__init__(self.message)


class InvalidCredentialsException(AccountPlatformException):
    """Raised when AWS credentials are invalid."""
    pass


class EncryptionException(AccountPlatformException):
    """Raised when encryption/decryption fails."""
    pass


class AccountNotFoundException(AccountPlatformException):
    """Raised when account is not found."""
    pass


class PermissionDeniedException(AccountPlatformException):
    """Raised when user doesn't have permission."""
    pass


class AWSServiceException(AccountPlatformException):
    """Raised when AWS service call fails."""
    pass
