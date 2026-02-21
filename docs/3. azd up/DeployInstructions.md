# Deployment Instructions

## Deployment Flow

1. **Run `azd up`** to provision infrastructure and attempt deployment
2. **Verify deployment** by querying the remote function app
3. **Fix issues or redeploy** if needed
4. **Run database migrations**

## Step 1: Run `azd up`

```bash
azd up
```

This provisions all Azure resources and attempts to deploy the function code.

## Step 2: Verify Deployment

Query the remote function app to ensure files uploaded correctly:

```bash
func azure functionapp list-functions <function-app-name>
```

**Expected**: Should show `processBudgetFile` function listed.

**Check in Azure Portal**:
- Navigate to Function App → Functions
- Verify `processBudgetFile` appears
- Check App Files to ensure `package.json`, `functions/`, and `node_modules/` are present

**If only `host.json` appears**: Files didn't upload correctly.

## Step 3: Fix Deployment Issues

### If deployment succeeded
✅ Proceed to Step 4 (database migrations).

### If deployment failed with errors
Check error messages and resolve issues (e.g., storage policy violations, location restrictions, firewall rules). Then retry `azd up`.

### If no errors but function not showing
Fall back to using `func` CLI to deploy (since `azd up` already provisioned infrastructure):

```bash
npm run build
cp -r dist/functions .
func azure functionapp publish <function-app-name> --nozip
```

This manually uploads the function files to the already-provisioned infrastructure.

## Step 4: Run Database Migrations

```bash
export DATABASE_URL=$(azd env get-value DATABASE_URL)
npm run migrate:remote:up
```

### Verify Migration Success

Query the database logs to ensure migrations ran correctly:

```bash
az postgres flexible-server server-logs list \
  --resource-group <resource-group-name> \
  --name <postgres-server-name> \
  --query "[0].name" -o tsv
```

Download and check the latest log file:

```bash
LOG_FILE=$(az postgres flexible-server server-logs list \
  --resource-group <resource-group-name> \
  --name <postgres-server-name> \
  --query "[0].name" -o tsv)

az postgres flexible-server server-logs download \
  --resource-group <resource-group-name> \
  --name <postgres-server-name> \
  --name "$LOG_FILE"

# Check for migration-related errors
grep -i "error\|failed\|CREATE TABLE" "$LOG_FILE"
```

**Expected**: Should see `CREATE TABLE` statements for `budget_entries` and no error messages.

**If errors found**: Review the specific SQL errors and fix schema/migration issues, then retry migration.

### Common Migration Issues

**PostgreSQL firewall errors**: Add your local IP to the PostgreSQL firewall rules:

```bash
MY_IP=$(curl -s ifconfig.me)
az postgres flexible-server firewall-rule create \
  --resource-group <resource-group-name> \
  --name <postgres-server-name> \
  --rule-name AllowLocalMachine \
  --start-ip-address $MY_IP \
  --end-ip-address $MY_IP
```

Then retry the migration command.

**Check migration output**: Review command output for any connection or SQL errors and resolve as needed before proceeding.

## Success Criteria

Deployment is complete when:
1. ✅ Function appears in `func azure functionapp list-functions` output
2. ✅ Azure Portal shows the function under Functions blade
3. ✅ App Files shows `package.json`, `functions/`, and `node_modules/`
4. ✅ Database migrations complete without errors
