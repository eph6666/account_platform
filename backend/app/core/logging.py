"""
Structured logging configuration.
"""
import logging
import sys

from app.core.config import settings


def setup_logging():
    """Configure structured logging for the application."""

    # Create logger
    logger = logging.getLogger("account_platform")
    logger.setLevel(getattr(logging, settings.log_level))

    # Create console handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(getattr(logging, settings.log_level))

    # Create formatter
    formatter = logging.Formatter(
        fmt="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(formatter)

    # Add handler to logger
    logger.addHandler(handler)

    return logger


# Export logger instance
logger = setup_logging()
