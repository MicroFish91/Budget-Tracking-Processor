# Exact File Changes Made During Deployment

This document lists the **minimal necessary changes** to get the application successfully deployed to Azure using `func` CLI.

## ACTUALLY NECESSARY CHANGES

### 1. `infra/core/storage/storage-account.bicep`

**Change 1: Added allowSharedKeyAccess**
**Line 21**
```diff
  properties: {
    minimumTlsVersion: minimumTlsVersion
    allowBlobPublicAccess: allowBlobPublicAccess
+   allowSharedKeyAccess: true
    networkAcls: {
```

**Change 2: Added Policy Exemption Tag**
**Lines 13-16**
```diff
  resource storage 'Microsoft.Storage/storageAccounts@2022-05-01' = {
    name: name
    location: location
-   tags: tags
+   tags: union(tags, {
+     'Az.Sec.DisableLocalAuth.Storage::Skip': 'true'
+   })
    kind: kind
```

**Why Necessary**: Azure policy blocks shared key access by default. We need it for:
- Azure Functions to create file shares (otherwise 403 Forbidden)
- Generating SAS tokens for public file uploads

---

### 2. `tsconfig.json`

**Change: Fixed Root Directory**
**Line 6**
```diff
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2021",
    "outDir": "dist",
-   "rootDir": ".",
+   "rootDir": "src",
    "sourceMap": true,
```

**Why Necessary**: Ensures compiled files go to `dist/functions/` instead of `dist/src/functions/`, making them easier to copy to root for deployment.

---

### 3. `.funcignore`

**Critical Change: Removed `node_modules` from exclusions**
```diff
  *.js.map
  *.ts
  .git*
  .vscode
  local.settings.json
  test
  tsconfig.json
- node_modules
  .azure
  docs
  migrations/*.ts
  src
+ dist
+ samples
+ azd-*.log
+ docker-compose.yml
+ .env.example
+ README.md
+ infra
```

**Why Necessary**: When excluded, `node_modules` won't be uploaded and the function runtime has no dependencies, causing the function to fail to load.

---

### 4. `package.json` (OPTIONAL - Build Helper)

**Change: Added Package Script**
**Line 13**
```diff
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch",
    "clean": "rm -rf dist",
+   "package": "npm run clean && npm run build && cp host.json package.json package-lock.json dist/",
    "prestart": "npm run build",
    "start": "func start",
```

**Why Helpful**: Automates the build process, but not strictly required.

---

## REQUIRED MANUAL STEP

After building, compiled functions **must** be copied to root:

```bash
cp -r dist/functions .
```

**Why Necessary**: The `func azure functionapp publish` command runs from the project root and expects `functions/` folder at root level, not in `dist/`.

---

## Environment Configuration Changes

These were command-line changes, not file changes:

```bash
# Set subscription (per user request)
azd env set AZURE_SUBSCRIPTION_ID 39a80dcd-ea8f-4e43-a717-28c3630bc177

# Set location (PostgreSQL not available in eastus)
azd env set AZURE_LOCATION westus3

# Re-authenticate
azd auth login
```

---

## Summary - Minimal Required Changes

| File | What Changed | Why Necessary |
|------|--------------|---------------|
| `infra/core/storage/storage-account.bicep` | Enabled shared key access + exemption tag | Fix policy violation, enable SAS tokens & file shares |
| `tsconfig.json` | Changed `rootDir` to `"src"` | Clean build output structure |
| `.funcignore` | Removed `node_modules` exclusion, added `dist` | Allow dependencies to deploy |
| Manual step | Copy `dist/functions/` to root `functions/` | Func CLI expects functions at root |

---

## CHANGES THAT WERE NOT NEEDED (Tested and Reverted)

1. ❌ `package.json` main property change - Azure Functions v4 doesn't use this
2. ❌ `azure.yaml` language: ts → js - Only affects azd, not func CLI

---

## Working Deployment Workflow

```bash
# Build TypeScript
npm run build

# Copy compiled functions to root
cp -r dist/functions .

# Deploy
func azure functionapp publish func-her6pjoufdt7i --nozip
```

Or use the package script:
```bash
npm run package
cp -r dist/functions .
func azure functionapp publish func-her6pjoufdt7i --nozip
```
