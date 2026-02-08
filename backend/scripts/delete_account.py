#!/usr/bin/env python3
"""
Script to delete an AWS account from DynamoDB.
Usage: python delete_account.py <account_id>
"""
import sys
import os

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def delete_account(account_id: str) -> bool:
    """
    Delete an account from DynamoDB.

    Args:
        account_id: The account ID to delete

    Returns:
        True if deleted successfully, False otherwise
    """
    # Get configuration from environment
    endpoint_url = os.getenv('DYNAMODB_ENDPOINT_URL')
    region = os.getenv('AWS_REGION', 'us-east-1')
    table_name = os.getenv('DYNAMODB_ACCOUNTS_TABLE', 'account-platform-aws-accounts-dev')
    access_key = os.getenv('AWS_ACCESS_KEY_ID', 'test')
    secret_key = os.getenv('AWS_SECRET_ACCESS_KEY', 'test')

    # Initialize DynamoDB client
    dynamodb = boto3.resource(
        'dynamodb',
        region_name=region,
        endpoint_url=endpoint_url,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key
    )

    table = dynamodb.Table(table_name)

    try:
        # First, check if the account exists
        response = table.get_item(Key={'account_id': account_id})

        if 'Item' not in response:
            print(f"❌ Account {account_id} not found in table {table_name}")
            return False

        # Display account info before deleting
        account = response['Item']
        print(f"\n📋 Found account:")
        print(f"  ID: {account.get('account_id')}")
        print(f"  Name: {account.get('account_name')}")
        print(f"  Email: {account.get('account_email', 'N/A')}")
        print(f"  Status: {account.get('status')}")
        print(f"  Created by: {account.get('created_by')}")

        # Confirm deletion
        confirm = input(f"\n⚠️  Are you sure you want to delete this account? (yes/no): ")

        if confirm.lower() != 'yes':
            print("❌ Deletion cancelled")
            return False

        # Delete the account
        table.delete_item(Key={'account_id': account_id})
        print(f"✅ Successfully deleted account {account_id}")
        return True

    except ClientError as e:
        print(f"❌ Error deleting account: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


def main():
    """Main entry point."""
    if len(sys.argv) != 2:
        print("Usage: python delete_account.py <account_id>")
        print("Example: python delete_account.py 262389653165")
        sys.exit(1)

    account_id = sys.argv[1]
    success = delete_account(account_id)
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
