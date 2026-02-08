# Account Platform Backend

FastAPI backend service for Account Platform - A cloud-native AWS account management system.

## Features

- **Account Management**: Create, read, and manage AWS accounts
- **Credential Security**: KMS-encrypted AKSK storage
- **Quota Monitoring**: Real-time Bedrock Claude 4.5 TPM quota tracking
- **Role-Based Access Control**: Admin and user permission levels
- **Audit Logging**: Complete operation tracking with automatic cleanup
- **RESTful API**: Clean, documented API endpoints

## Tech Stack

- **Python 3.12+** - Modern Python with type hints
- **FastAPI** - High-performance async web framework
- **Pydantic** - Data validation and settings management
- **boto3** - AWS SDK for Python
- **DynamoDB** - NoSQL database
- **AWS KMS** - Credential encryption
- **Docker** - Containerized deployment

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application entry
│   ├── api/                    # API route handlers
│   │   ├── health.py
│   │   ├── auth.py
│   │   ├── accounts.py
│   │   └── dashboard.py
│   ├── services/               # Business logic layer
│   │   ├── account_service.py
│   │   ├── aws_service.py
│   │   ├── encryption_service.py
│   │   └── quota_service.py
│   ├── db/                     # Data access layer
│   │   ├── dynamodb.py
│   │   └── models.py
│   ├── middleware/             # Authentication & request processing
│   │   └── cognito_auth.py
│   ├── schemas/                # Pydantic models
│   │   ├── account.py
│   │   ├── auth.py
│   │   └── dashboard.py
│   ├── core/                   # Core configuration
│   │   ├── config.py
│   │   ├── logging.py
│   │   └── exceptions.py
│   └── utils/                  # Utility functions
├── tests/
│   ├── unit/
│   └── integration/
├── pyproject.toml
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

## Prerequisites

- Python 3.12+
- uv (recommended) or pip
- Docker & Docker Compose (for local development)
- AWS CLI configured with appropriate credentials

## Installation

### Using uv (Recommended)

```bash
# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create virtual environment
uv venv

# Activate virtual environment
source .venv/bin/activate  # Linux/Mac
# or
.venv\Scripts\activate  # Windows

# Install dependencies
uv sync

# Install development dependencies
uv sync --extra dev
```

### Using pip

```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
pip install -e .

# Install development dependencies
pip install -e ".[dev]"
```

## Configuration

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# AWS Settings
AWS_REGION=us-east-1

# DynamoDB Tables
DYNAMODB_ACCOUNTS_TABLE=account-platform-aws-accounts-dev
DYNAMODB_USERS_TABLE=account-platform-users-dev
DYNAMODB_AUDIT_LOGS_TABLE=account-platform-audit-logs-dev

# KMS
KMS_KEY_ID=your-kms-key-id

# Cognito
COGNITO_USER_POOL_ID=your-user-pool-id
COGNITO_REGION=us-east-1
```

## Running Locally

### Option 1: Direct Python

```bash
# Activate virtual environment
source .venv/bin/activate

# Run with uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or using uv
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Option 2: Docker Compose (with DynamoDB Local)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

Services:
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **DynamoDB Local**: http://localhost:8001
- **DynamoDB Admin**: http://localhost:8002

## API Documentation

Once running, access the interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## Development

### Code Quality

```bash
# Format code with black
uv run black app/

# Lint with ruff
uv run ruff check app/

# Type check with mypy
uv run mypy app/

# Run all checks
uv run black app/ && uv run ruff check app/ && uv run mypy app/
```

### Testing

```bash
# Run all tests
uv run pytest

# Run with coverage
uv run pytest --cov=app --cov-report=html

# Run specific test file
uv run pytest tests/unit/test_services.py

# Run with verbose output
uv run pytest -v

# Run integration tests only
uv run pytest -m integration
```

### Database Setup (Local)

If using DynamoDB Local, create tables:

```bash
# Using Python script (TODO: create script)
uv run python scripts/create_tables.py

# Or manually using AWS CLI
aws dynamodb create-table \
    --table-name account-platform-aws-accounts-dev \
    --attribute-definitions \
        AttributeName=account_id,AttributeType=S \
        AttributeName=created_by,AttributeType=S \
    --key-schema \
        AttributeName=account_id,KeyType=HASH \
    --global-secondary-indexes \
        "IndexName=created_by-index,KeySchema=[{AttributeName=created_by,KeyType=HASH}],Projection={ProjectionType=ALL}" \
    --billing-mode PAY_PER_REQUEST \
    --endpoint-url http://localhost:8001
```

## Deployment

### Build Docker Image

```bash
# Build image
docker build -t account-platform-backend:latest .

# Tag for ECR
docker tag account-platform-backend:latest <ECR_URI>:latest

# Push to ECR
docker push <ECR_URI>:latest
```

### Deploy to ECS

After pushing image to ECR, update the ECS service:

```bash
aws ecs update-service \
    --cluster <cluster-name> \
    --service <service-name> \
    --force-new-deployment
```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `ENVIRONMENT` | Environment name | No | `development` |
| `LOG_LEVEL` | Logging level | No | `INFO` |
| `AWS_REGION` | AWS region | Yes | `us-east-1` |
| `DYNAMODB_ACCOUNTS_TABLE` | Accounts table name | Yes | - |
| `DYNAMODB_USERS_TABLE` | Users table name | Yes | - |
| `DYNAMODB_AUDIT_LOGS_TABLE` | Audit logs table name | Yes | - |
| `KMS_KEY_ID` | KMS key for encryption | Yes | - |
| `COGNITO_USER_POOL_ID` | Cognito user pool ID | Yes | - |

## Security

- All AWS credentials encrypted with KMS
- JWT-based authentication via Cognito
- Role-based access control (Admin/User)
- Audit logging for sensitive operations
- Non-root Docker container
- Environment variable configuration

## Troubleshooting

### DynamoDB Connection Issues

Check if DynamoDB endpoint is correct:

```bash
# For local development
DYNAMODB_ENDPOINT_URL=http://localhost:8001

# For AWS
# Leave empty or omit the variable
```

### KMS Permission Errors

Ensure the ECS task role has KMS permissions:

```json
{
  "Effect": "Allow",
  "Action": [
    "kms:Encrypt",
    "kms:Decrypt",
    "kms:DescribeKey"
  ],
  "Resource": "arn:aws:kms:region:account:key/key-id"
}
```

### Cognito JWT Validation Fails

Verify Cognito configuration:

```bash
# Check user pool ID
aws cognito-idp describe-user-pool --user-pool-id <pool-id>

# Verify region matches
COGNITO_REGION=us-east-1
```

## License

MIT License - see LICENSE file for details.
