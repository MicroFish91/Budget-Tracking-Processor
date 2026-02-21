# Budget Recording App - Excel/CSV to PostgreSQL

An Azure Functions application that automatically processes Excel and CSV files uploaded to Azure Blob Storage, parses budget entries, and stores them in a PostgreSQL database.

## Features

- 🔄 Automatic processing of files uploaded to Azure Blob Storage
- 📊 Support for both Excel (.xlsx, .xls) and CSV file formats
- 🗄️ PostgreSQL database storage with transaction support
- 🔍 Flexible column name recognition (case-insensitive)
- 🛡️ Input validation and error handling
- 📝 Comprehensive logging and monitoring
- 🚀 One-command deployment with Azure Developer CLI
- 🧪 Local development environment with Docker

## Architecture

```
┌─────────────────┐
│  Blob Storage   │
│  (budget-files) │
└────────┬────────┘
         │ Upload CSV/Excel
         ▼
┌─────────────────┐
│ Azure Function  │
│  Blob Trigger   │
└────────┬────────┘
         │ Parse & Validate
         ▼
┌─────────────────┐
│   PostgreSQL    │
│ (budget_entries)│
└─────────────────┘
```

## Database Schema

```sql
CREATE TABLE budget_entries (
    id SERIAL PRIMARY KEY,
    entry_date DATE NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    entry_type VARCHAR(20) NOT NULL, -- 'income' or 'expense'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source_file VARCHAR(255)
);
```

## Dependencies

- [Node.js 20+](https://nodejs.org/)
- [Azure Functions Core Tools v4](https://learn.microsoft.com/azure/azure-functions/functions-run-local)
- [Azure Developer CLI (azd)](https://learn.microsoft.com/azure/developer/azure-developer-cli/install-azd)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for local development)
- [Azure subscription](https://azure.microsoft.com/free/)

## File Format

Files should contain these columns (case-insensitive):

| Column | Required | Description |
|--------|----------|-------------|
| date | ✅ | Transaction date |
| category | ✅ | Budget category |
| description | ❌ | Optional details |
| amount | ✅ | Transaction amount |
| type | ✅ | "income" or "expense" |

Example CSV:
```csv
date,category,description,amount,type
2024-01-15,Groceries,Weekly shopping,245.67,expense
2024-01-16,Salary,Monthly payment,5000.00,income
```

## Project Structure

```
.
├── functions/
│   └── processBudgetFile.ts        # Main blob trigger function
├── src/
│   ├── functions/                   # TypeScript source
│   └── utils/
│       └── uploadToBlob.ts         # Blob upload utility
├── migrations/                      # Database migrations
├── infra/                          # Bicep infrastructure templates
├── samples/                        # Sample CSV/Excel files
├── docker-compose.yml              # Local PostgreSQL service
├── azure.yaml                      # Azure Developer CLI config
└── local.settings.json             # Local configuration
```

## Available Scripts

```bash
npm run build              # Compile TypeScript
npm run watch              # Watch mode for development
npm start                  # Start Azure Functions locally
npm run clean              # Clean build output

# Docker services
npm run docker:up          # Start PostgreSQL in Docker
npm run docker:down        # Stop PostgreSQL
npm run docker:logs        # View PostgreSQL logs

# Blob upload utilities
npm run upload:sample      # Upload sample CSV to Azurite
npm run upload:blob <path> # Upload any file to Azurite

# Database migrations
npm run migrate:local:up      # Run migrations locally
npm run migrate:local:down    # Rollback locally
npm run migrate:local:create  # Create new migration
npm run migrate:remote:up     # Run migrations on Azure
```