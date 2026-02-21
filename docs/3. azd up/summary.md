# Azure Deployment (azd up) - Summary

## Overview
Deployment of budget tracking Azure Functions app to Azure. `azd up` provisioned infrastructure successfully, but `azd deploy` failed to upload code. Solution: use `func` CLI for code deployment.

## Final Deployment Configuration

### Subscription & Location
- **Subscription**: AzCode2602 (`39a80dcd-ea8f-4e43-a717-28c3630bc177`)
- **Location**: West US 3
- **Resource Group**: `rg-budget-tracker-dev`

### Deployed Resources
- **Function App**: `func-her6pjoufdt7i`
- **Storage Account**: `sther6pjoufdt7i`
- **PostgreSQL Database**: `psql-her6pjoufdt7i`
- **Function Deployed**: `processBudgetFile` [blobTrigger]

## Issues Encountered

### 1. Storage Account Policy Violation
**Error**: `RequestDisallowedByPolicy: Local authentication methods are not allowed`

**Solution**: Added exemption tag to storage account bicep:
```bicep
tags: union(tags, {
  'Az.Sec.DisableLocalAuth.Storage::Skip': 'true'
})
allowSharedKeyAccess: true
```

**Why needed**: Functions needs shared key access for file shares and we need SAS tokens for public uploads.

### 2. Location Issues
**Error 1**: Resource group existed in `eastus`, deployment tried `westus2`
**Error 2**: PostgreSQL not available in `eastus`

**Solution**: Changed to `westus3`
```bash
azd env set AZURE_LOCATION westus3
```

### 3. Code Deployment Failure
**Problem**: `azd deploy` showed "SUCCESS" but only `host.json` with `isDefaultHostConfig: true` appeared remotely

**Root cause**: Files were never uploaded

**Solution**: Use `func` CLI instead:
```bash
func azure functionapp publish func-her6pjoufdt7i --nozip
```

## File Changes Required

1. **`infra/core/storage/storage-account.bicep`** - Storage policy exemption + allowSharedKeyAccess
2. **`tsconfig.json`** - Changed `rootDir` from `"."` to `"src"`
3. **`.funcignore`** - Removed `node_modules` from exclusions
4. **Manual step** - Copy `dist/functions/` to root `functions/`

## Working Deployment Workflow

```bash
# Provision infrastructure (first time only)
azd up

# Build and deploy code
npm run build
cp -r dist/functions .
func azure functionapp publish func-her6pjoufdt7i --nozip
```

## Key Learnings

### Never Trust "SUCCESS" Messages
Always verify deployment in Azure Portal. If only `host.json` with `isDefaultHostConfig: true` appears, NO files were uploaded.

### Three Different Tools
- **azd** - Full app workflow (provision works, deploy doesn't)
- **az** - Azure resource management
- **func** - Functions-specific deployment (this works!)

### .funcignore Matters
If `node_modules` is excluded, dependencies won't upload and functions won't load.

## Outstanding Issue

**azd deploy doesn't work** - Needs investigation. Workaround: use `func` CLI.
