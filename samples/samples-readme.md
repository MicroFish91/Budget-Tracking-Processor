# Sample Files for Budget Tracking

This directory contains sample CSV and Excel files that demonstrate the expected format for budget entry uploads.

## File Format

All files should contain the following columns:

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| date | Date | Yes | Date of the transaction (YYYY-MM-DD or MM/DD/YYYY) |
| category | String | Yes | Category of the budget entry (e.g., Groceries, Salary, etc.) |
| description | String | No | Additional details about the transaction |
| amount | Number | Yes | Transaction amount (positive number) |
| type | String | Yes | Either "income" or "expense" |

## Column Name Variations

The parser supports case-insensitive column names:
- `date`, `Date`, `DATE`
- `category`, `Category`, `CATEGORY`
- `description`, `Description`, `DESCRIPTION`
- `amount`, `Amount`, `AMOUNT`
- `type`, `Type`, `TYPE`

## Sample Files

- **budget-sample.csv**: CSV file with 10 sample budget entries

## Testing Locally

1. Start local services:
   ```bash
   docker-compose up -d
   ```

2. Run migrations:
   ```bash
   npm run migrate:local:up
   ```

3. Start the function app:
   ```bash
   npm start
   ```

4. Upload a sample file to the `budget-files` container in Azurite using Azure Storage Explorer or the Azure CLI.
