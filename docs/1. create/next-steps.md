# Next Steps - Budget Recording App

This guide covers local debugging, database migrations, and deployment to Azure.

## 📋 Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Local Database Migrations](#local-database-migrations)
3. [Local Debugging](#local-debugging)
4. [Deployment to Azure](#deployment-to-azure)
5. [Remote Database Migrations](#remote-database-migrations)
6. [Testing the Application](#testing-the-application)
7. [Troubleshooting](#troubleshooting)

---

## 🔧 Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Local Services (PostgreSQL + Azurite)

Start PostgreSQL and Azurite using Docker Compose:

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL** on `localhost:5432`
  - Database: `budgetdb`
  - User: `postgres`
  - Password: `postgres`
- **Azurite** on ports `10000-10002` (Blob, Queue, Table emulator)

Verify services are running:

```bash
docker-compose ps
```

### 3. Verify Configuration

Ensure `local.settings.json` contains:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "DATABASE_URL": "postgresql://postgres:postgres@localhost:5432/budgetdb",
    "NODE_ENV": "development"
  }
}
```

---

## 🗄️ Local Database Migrations

### Run Initial Migration

Create the `budget_entries` table:

```bash
npm run migrate:local:up
```

Expected output:
```
> 1708371600000_create-budget-entries-table
Migration completed successfully
```

### Verify Table Creation

Connect to PostgreSQL and verify:

```bash
# Using psql
docker exec -it budget-db psql -U postgres -d budgetdb

# List tables
\dt

# Describe budget_entries table
\d budget_entries

# Exit
\q
```

### Create New Migrations

To add new migrations:

```bash
npm run migrate:local:create add-new-column

# Edit the generated file in migrations/
# Then run:
npm run migrate:local:up
```

### Rollback Migration

```bash
npm run migrate:local:down
```

---

## 🐛 Local Debugging

### Method 1: VS Code Debugging

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Set breakpoints** in `src/functions/processBudgetFile.ts`

3. **Press F5** or use the Debug panel to start debugging

4. **Upload a file** to trigger the function (see [Testing](#testing-the-application))

### Method 2: Command Line with Logs

1. **Start Functions in watch mode:**
   ```bash
   npm start
   ```

2. **Monitor logs** - Function runtime will display:
   - Function registration
   - Blob trigger activation
   - Processing logs
   - Errors and warnings

3. **Upload test files** to the `budget-files` container

### Create the Blob Container

The function triggers on files in the `budget-files` container. Create it using Azure Storage Explorer or Azure CLI:

#### Using Azure Storage Explorer
1. Download [Azure Storage Explorer](https://azure.microsoft.com/features/storage-explorer/)
2. Connect to **Local Emulator (Azurite)**
3. Expand **Blob Containers**
4. Create new container: `budget-files`

#### Using Azure CLI
```bash
# Install Azure Storage extension (one-time)
az extension add --name storage-blob-preview

# Create container in Azurite
az storage container create \
  --name budget-files \
  --connection-string "UseDevelopmentStorage=true"
```

### Upload Test Files

**Option 1: Azure Storage Explorer**
1. Open `budget-files` container
2. Click "Upload" → "Upload Files"
3. Select `samples/budget-sample.csv`

**Option 2: Azure CLI**
```bash
az storage blob upload \
  --container-name budget-files \
  --file samples/budget-sample.csv \
  --name budget-sample.csv \
  --connection-string "UseDevelopmentStorage=true"
```

**Option 3: curl (direct to Azurite)**
```bash
curl -X PUT \
  "http://127.0.0.1:10000/devstoreaccount1/budget-files/budget-sample.csv" \
  -H "x-ms-blob-type: BlockBlob" \
  --data-binary "@samples/budget-sample.csv"
```

### Verify Processing

Check logs in terminal for:
```
Processing blob: budget-sample.csv, size: XXX bytes
Parsed 10 entries from budget-sample.csv
Successfully saved 10 entries to database
```

Query the database:
```bash
docker exec -it budget-db psql -U postgres -d budgetdb -c "SELECT * FROM budget_entries;"
```

---

## 🚀 Deployment to Azure

### Prerequisites

- Azure subscription
- Azure Developer CLI (`azd`) installed
- Azure CLI (`az`) installed (optional but recommended)

### Step 1: Authenticate

```bash
azd auth login
```

### Step 2: Initialize Environment

```bash
azd init
```

When prompted:
- **Environment name**: Choose a name (e.g., `budget-app-dev`)
- This will be used as a prefix for all Azure resources

### Step 3: Set Database Password

Set a strong password for PostgreSQL:

```bash
azd env set DATABASE_ADMIN_PASSWORD "YourStrongPassword123!"
```

### Step 4: Deploy Everything

This single command will:
1. Create resource group
2. Provision Azure resources (Storage, Functions, PostgreSQL)
3. Run database migrations automatically
4. Deploy function code

```bash
azd up
```

Select:
- **Subscription**: Choose your Azure subscription
- **Location**: Choose Azure region (e.g., `eastus`, `westus2`)

Deployment takes ~5-10 minutes.

### Step 5: Verify Deployment

After deployment completes, `azd` outputs:

```
Endpoint: https://func-xxxxx.azurewebsites.net
Storage Account: stxxxxx
Database: psql-xxxxx.postgres.database.azure.com
```

---

## 🔄 Remote Database Migrations

### Automatic Migrations (Recommended)

Migrations run automatically during `azd up` via post-provision hooks.

### Manual Migrations

If you need to run migrations manually:

1. **Get database connection string:**
   ```bash
   azd env get-value DATABASE_URL
   ```

2. **Run migration:**
   ```bash
   export DATABASE_URL=$(azd env get-value DATABASE_URL)
   npm run migrate:remote:up
   ```

3. **Verify:**
   ```bash
   # Using psql with the connection string
   psql "$(azd env get-value DATABASE_URL)" -c "\dt"
   ```

### Rollback Remote Migration

```bash
export DATABASE_URL=$(azd env get-value DATABASE_URL)
npm run migrate:remote:down
```

---

## 🧪 Testing the Application

### Test in Azure

1. **Get storage account name:**
   ```bash
   azd env get-value STORAGE_ACCOUNT_NAME
   ```

2. **Upload via Azure Portal:**
   - Navigate to Storage Account in Azure Portal
   - Go to **Containers** → **budget-files**
   - Click **Upload**
   - Select `samples/budget-sample.csv`

3. **Upload via Azure CLI:**
   ```bash
   az storage blob upload \
     --account-name $(azd env get-value STORAGE_ACCOUNT_NAME) \
     --container-name budget-files \
     --file samples/budget-sample.csv \
     --name "test-$(date +%s).csv" \
     --auth-mode login
   ```

### Monitor Execution

1. **View logs in Azure Portal:**
   - Navigate to Function App
   - Select **Functions** → **processBudgetFile**
   - Click **Monitor**
   - View execution history

2. **Query Application Insights:**
   - Function App → **Application Insights**
   - **Logs** → Run query:
   ```kusto
   traces
   | where timestamp > ago(1h)
   | where message contains "Processing blob"
   | project timestamp, message
   | order by timestamp desc
   ```

3. **Verify database entries:**
   ```bash
   psql "$(azd env get-value DATABASE_URL)" \
     -c "SELECT * FROM budget_entries ORDER BY created_at DESC LIMIT 10;"
   ```

---

## 🔍 Troubleshooting

### Local Development Issues

#### PostgreSQL Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart services
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

#### Azurite Not Running
```
Error: ECONNREFUSED - connect to 127.0.0.1:10000
```

**Solution:**
```bash
# Restart Azurite
docker-compose restart azurite

# Or install globally and run
npm install -g azurite
azurite --silent --location ./azurite-data
```

#### Function Not Triggering

**Solutions:**
1. Ensure `budget-files` container exists
2. Check `local.settings.json` has correct `AzureWebJobsStorage`
3. Restart function app: Stop (Ctrl+C) and `npm start`
4. Clear Azurite data: `docker-compose down -v && docker-compose up -d`

### Migration Issues

#### Migration Already Applied
```
Error: Migration already applied
```

**Solution:** This is normal if migration was already run. To force re-run:
```bash
# Local
docker exec -it budget-db psql -U postgres -d budgetdb -c "DROP TABLE IF EXISTS pgmigrations CASCADE;"
npm run migrate:local:up
```

#### Database Connection Issues
```
Error: password authentication failed
```

**Solution:**
- Check `DATABASE_URL` in `local.settings.json` or environment
- Verify PostgreSQL is running: `docker-compose ps`
- Check credentials: `postgres:postgres@localhost:5432/budgetdb`

### Deployment Issues

#### azd up fails with "Invalid password"

**Solution:**
```bash
# Set a strong password (min 8 chars, uppercase, lowercase, number, special char)
azd env set DATABASE_ADMIN_PASSWORD "MySecurePass123!"
azd up
```

#### Migrations fail during deployment

**Solution:**
```bash
# Check post-provision hook logs
azd deploy --debug

# Manually run migrations
export DATABASE_URL=$(azd env get-value DATABASE_URL)
npm run migrate:remote:up
```

#### Function Not Processing Files

**Solutions:**
1. **Check container exists:**
   - Azure Portal → Storage Account → Containers
   - Should have `budget-files` container

2. **Check function configuration:**
   ```bash
   # Get function app name
   azd env get-value FUNCTION_APP_NAME
   
   # View app settings in portal
   az functionapp config appsettings list \
     --name $(azd env get-value FUNCTION_APP_NAME) \
     --resource-group rg-$(azd env get-value AZURE_ENV_NAME)
   ```

3. **Check function logs:**
   - Portal → Function App → Functions → processBudgetFile → Monitor

### Database Query Issues

#### Permission Denied

**Solution:**
```bash
# Connect as admin user specified during deployment
psql "postgresql://budgetadmin:YourPassword@psql-xxxxx.postgres.database.azure.com:5432/budgetdb?sslmode=require"
```

---

## 📚 Additional Resources

- [Azure Functions Node.js Developer Guide](https://learn.microsoft.com/azure/azure-functions/functions-reference-node)
- [Azure Developer CLI Documentation](https://learn.microsoft.com/azure/developer/azure-developer-cli/)
- [node-pg-migrate Documentation](https://salsita.github.io/node-pg-migrate/)
- [Azure PostgreSQL Flexible Server](https://learn.microsoft.com/azure/postgresql/flexible-server/)

---

## 🎯 Next Actions

1. ✅ Set up local development environment
2. ✅ Run database migrations locally
3. ✅ Test with sample CSV files
4. ✅ Deploy to Azure with `azd up`
5. ✅ Upload files to Azure Storage
6. ✅ Monitor processing in Application Insights

**Happy coding! 🚀**
