"""
FastAPI application entry point.

Configures and initializes the Account Platform API service.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import accounts, admin, auth, dashboard, health
from app.core.config import settings
from app.core.logging import logger
from app.db.dynamodb import DynamoDBClient


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.

    Handles startup and shutdown events.
    """
    # Startup
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"AWS Region: {settings.aws_region}")

    # Initialize DynamoDB client
    try:
        dynamodb_client = DynamoDBClient()
        app.state.dynamodb_client = dynamodb_client
        logger.info("DynamoDB client initialized")

        # Create tables if they don't exist (development only)
        if settings.environment == "development":
            logger.info("Creating DynamoDB tables (if not exist)...")
            dynamodb_client.create_tables()
    except Exception as e:
        logger.error(f"Failed to initialize DynamoDB: {e}")
        # Continue anyway for testing without DynamoDB

    logger.info("Application started successfully")

    yield

    # Shutdown
    logger.info("Shutting down application...")
    logger.info("Application shutdown completed")


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="""
    Account Platform API - Cloud-native AWS account management system

    ## Features

    - **Account Management**: Securely manage multiple AWS accounts
    - **Credential Encryption**: KMS-encrypted AKSK storage
    - **Quota Monitoring**: Real-time Bedrock Claude 4.5 TPM quota tracking
    - **Role-Based Access**: Admin and user permission levels
    - **Audit Logging**: Complete operation tracking

    ## Authentication

    All requests require a valid JWT token from AWS Cognito:

    ```
    Authorization: Bearer <your-jwt-token>
    ```
    """,
    docs_url=settings.docs_url,
    openapi_url=settings.openapi_url,
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(
    health.router,
    tags=["health"],
)

app.include_router(
    auth.router,
    prefix=settings.api_prefix,
    tags=["auth"],
)

app.include_router(
    accounts.router,
    prefix=settings.api_prefix,
    tags=["accounts"],
)

app.include_router(
    dashboard.router,
    prefix=settings.api_prefix,
    tags=["dashboard"],
)

app.include_router(
    admin.router,
    prefix=settings.api_prefix,
    tags=["admin"],
)


# Root endpoint
@app.get("/", summary="API information")
async def root():
    """Root endpoint with API information."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "description": "Account Platform API",
        "documentation": settings.docs_url,
        "health": "/health",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.environment == "development",
        log_level=settings.log_level.lower(),
    )
