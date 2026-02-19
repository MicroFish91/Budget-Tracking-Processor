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

## Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [Azure Functions Core Tools v4](https://learn.microsoft.com/azure/azure-functions/functions-run-local)
- [Azure Developer CLI (azd)](https://learn.microsoft.com/azure/developer/azure-developer-cli/install-azd)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for local development)
- [Azure subscription](https://azure.microsoft.com/free/)

## Quick Start

### 1. Clone and Install

```bash
cd blob-trigger-node
npm install
```

### 2. Local Development

See [docs/NEXT-STEPS.md](./docs/NEXT-STEPS.md) for detailed local debugging instructions.

### 3. Deploy to Azure

```bash
# Initialize azd environment
azd auth login
azd init

# Provision and deploy
azd up
```

See [docs/NEXT-STEPS.md](./docs/NEXT-STEPS.md) for detailed deployment instructions.

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
├── src/
│   └── functions/
│       └── processBudgetFile.ts    # Main blob trigger function
├── migrations/                      # Database migrations
├── infra/                          # Bicep infrastructure templates
├── samples/                        # Sample CSV/Excel files
├── docker-compose.yml              # Local dev services
├── azure.yaml                      # Azure Developer CLI config
└── local.settings.json             # Local configuration
```

## Available Scripts

```bash
npm run build              # Compile TypeScript
npm run watch              # Watch mode for development
npm start                  # Start Azure Functions locally
npm run clean              # Clean build output

# Database migrations
npm run migrate:local:up      # Run migrations locally
npm run migrate:local:down    # Rollback locally
npm run migrate:local:create  # Create new migration
npm run migrate:remote:up     # Run migrations on Azure
```

## Environment Variables

### Local Development
Configured in `local.settings.json`:
- `DATABASE_URL`: PostgreSQL connection string
- `AzureWebJobsStorage`: Azurite connection
- `FUNCTIONS_WORKER_RUNTIME`: Set to "node"

### Production (Azure)
Automatically configured by Bicep templates:
- `DATABASE_URL`: Azure PostgreSQL connection
- `AzureWebJobsStorage`: Azure Storage connection
- `APPLICATIONINSIGHTS_CONNECTION_STRING`: Monitoring

## Monitoring

Application telemetry is sent to Application Insights:
- Function execution logs
- Performance metrics
- Error tracking
- Custom events

Access via Azure Portal → Your Function App → Application Insights

## Contributing

See [docs/plan.md](./docs/plan.md) for the implementation plan and architecture decisions.

## License

MIT

## Next Steps

For detailed instructions on debugging, deployment, and troubleshooting, see [docs/NEXT-STEPS.md](./docs/NEXT-STEPS.md).

## Documentation

- **[README.md](./README.md)** - This file, project overview
- **[docs/NEXT-STEPS.md](./docs/NEXT-STEPS.md)** - Detailed debugging, deployment, and troubleshooting guide
- **[docs/plan.md](./docs/plan.md)** - Implementation plan and architecture decisions
- **[docs/samples-readme.md](./docs/samples-readme.md)** - Sample file format and testing instructions
- **[docs/create-transcript.md](./docs/create-transcript.md)** - Complete project creation transcript
