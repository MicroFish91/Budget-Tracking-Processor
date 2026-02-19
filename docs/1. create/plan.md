# Budget Recording App - Excel/CSV to PostgreSQL

## Problem Statement
Create an Azure-based application that automatically processes Excel and CSV files uploaded to blob storage, parses budget records, and stores them in a PostgreSQL database. The project will be an Azure Developer CLI (azd) template for easy deployment.

## Proposed Approach
- **Runtime**: Node.js/TypeScript
- **Trigger**: Azure Blob Storage trigger (Azure Functions)
- **Database**: PostgreSQL (Azure Database for PostgreSQL Flexible Server)
- **Schema**: Fixed schema for budget tracking (expenses/income with categories, amounts, dates, descriptions)
- **Infrastructure**: Azure Developer CLI (azd) template with Bicep

## Technology Stack
- Azure Functions (Node.js v4 programming model)
- TypeScript
- PostgreSQL with pg library
- xlsx library for Excel parsing
- csv-parser for CSV parsing
- Azure Blob Storage
- node-pg-migrate for database migrations

## Database Schema (Budget App)
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

Expected CSV/Excel format:
- date, category, description, amount, type

## Workplan

### Phase 1: Project Setup
- [ ] Initialize Node.js/TypeScript project structure
- [ ] Set up Azure Functions with blob trigger
- [ ] Add necessary dependencies (xlsx, csv-parser, pg, node-pg-migrate)
- [ ] Configure TypeScript and build setup
- [ ] Set up database migration framework

### Phase 2: Azure Developer CLI (azd) Setup
- [ ] Create azure.yaml configuration
- [ ] Create Bicep infrastructure templates
  - [ ] Azure Storage Account (for blob storage)
  - [ ] Azure Functions (consumption plan)
  - [ ] Azure Database for PostgreSQL Flexible Server
  - [ ] Configure connection strings and app settings
- [ ] Create .azure folder structure with environment configs
- [ ] Add post-provision hook to run migrations on remote database

### Phase 3: Function Implementation
- [ ] Implement blob trigger function
- [ ] Add file type detection (.xlsx vs .csv)
- [ ] Implement Excel parser
- [ ] Implement CSV parser
- [ ] Add data validation logic
- [ ] Implement PostgreSQL connection and insertion logic
- [ ] Add error handling and logging

### Phase 4: Database Migrations
- [ ] Create initial migration for budget_entries table
- [ ] Add npm scripts for migration commands (up, down, create)
- [ ] Create migration README with usage instructions
- [ ] Configure separate migrations for local vs remote environments

### Phase 5: Local Development Setup
- [ ] Create local.settings.json template
- [ ] Add local PostgreSQL database setup instructions (Docker recommended)
- [ ] Configure Azurite for local blob storage testing
- [ ] Document local migration workflow
- [ ] Create sample CSV/Excel files for testing
Help me scaffold a base project.  The project should be a golang server connected to a postgres backend.  I eventually plan to host this project on Azure.


### Phase 6: Documentation
- [ ] Create comprehensive README.md
- [ ] Create NEXT-STEPS.md with:
  - Local debugging instructions
  - Local database migration setup
  - Remote database migration (post-deployment)
  - Deployment instructions with azd
  - Testing instructions
  - Troubleshooting guide

## Database Migration Strategy

### Local Development
- Use Docker Compose to spin up local PostgreSQL instance
- Run migrations manually via npm scripts: `npm run migrate:local:up`
- Environment-specific connection strings in local.settings.json

### Remote/Azure Deployment
- Migrations run automatically via azd post-provision hooks
- Alternative: Manual migration via `npm run migrate:remote:up` with Azure DB connection
- Migration state tracked in `pgmigrations` table
- Connection string injected from Azure Key Vault or App Settings

### Migration Commands
```bash
# Local development
npm run migrate:local:up          # Run pending migrations
npm run migrate:local:down        # Rollback last migration
npm run migrate:local:create <name>  # Create new migration

# Remote/Azure
npm run migrate:remote:up         # Run on Azure PostgreSQL
npm run migrate:remote:down       # Rollback on Azure
```

## Notes & Considerations
- Use parameterized queries to prevent SQL injection
- Handle malformed files gracefully with try-catch
- Log processing results (success/failure) for monitoring
- Consider batch inserts for better performance with large files
- Add file size limits to prevent memory issues
- Store processed files in a separate container for audit trail
- Migrations are idempotent and version-controlled
- Use transaction-wrapped migrations for data safety
- Include migration rollback strategy in documentation

---

## Project Status: ✅ COMPLETE

All phases implemented successfully! See:
- **[NEXT-STEPS.md](./NEXT-STEPS.md)** for debugging and deployment
- **[create-transcript.md](./create-transcript.md)** for complete conversation history
- **[samples-readme.md](./samples-readme.md)** for sample file documentation

### Documentation Organization
- All markdown files (except main README.md) moved to `docs/` folder
- Complete project creation transcript saved for reference
- Links updated in main README
