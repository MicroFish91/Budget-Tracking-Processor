targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the environment')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

@description('PostgreSQL administrator username')
@secure()
param databaseAdminUsername string = 'budgetadmin'

@description('PostgreSQL administrator password')
@secure()
param databaseAdminPassword string

@description('Id of the user or app to assign application roles')
param principalId string = ''

var abbrs = loadJsonContent('./abbreviations.json')
var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))
var tags = { 'azd-env-name': environmentName }

resource rg 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: '${abbrs.resourcesResourceGroups}${environmentName}'
  location: location
  tags: tags
}

module monitoring './core/monitor/monitoring.bicep' = {
  name: 'monitoring'
  scope: rg
  params: {
    location: location
    tags: tags
    logAnalyticsName: '${abbrs.operationalInsightsWorkspaces}${resourceToken}'
    applicationInsightsName: '${abbrs.insightsComponents}${resourceToken}'
  }
}

module storage './core/storage/storage-account.bicep' = {
  name: 'storage'
  scope: rg
  params: {
    name: '${abbrs.storageStorageAccounts}${resourceToken}'
    location: location
    tags: tags
  }
}

module database './core/database/postgresql/flexibleserver.bicep' = {
  name: 'database'
  scope: rg
  params: {
    name: '${abbrs.dBforPostgreSQLServers}${resourceToken}'
    location: location
    tags: tags
    databaseName: 'budgetdb'
    administratorLogin: databaseAdminUsername
    administratorLoginPassword: databaseAdminPassword
    allowAzureIPsFirewall: true
  }
}

module functionApp './core/host/functions.bicep' = {
  name: 'functionApp'
  scope: rg
  params: {
    name: '${abbrs.webSitesFunctions}${resourceToken}'
    location: location
    tags: union(tags, { 'azd-service-name': 'api' })
    applicationInsightsName: monitoring.outputs.applicationInsightsName
    appServicePlanId: appServicePlan.outputs.id
    runtimeName: 'node'
    runtimeVersion: '20'
    storageAccountName: storage.outputs.name
    appSettings: {
      AzureWebJobsStorage__accountName: storage.outputs.name
      DATABASE_URL: 'postgresql://${databaseAdminUsername}:${databaseAdminPassword}@${database.outputs.POSTGRES_DOMAIN_NAME}:5432/budgetdb?sslmode=require'
      NODE_ENV: 'production'
    }
  }
}

module appServicePlan './core/host/appserviceplan.bicep' = {
  name: 'appServicePlan'
  scope: rg
  params: {
    name: '${abbrs.webServerFarms}${resourceToken}'
    location: location
    tags: tags
    sku: {
      name: 'Y1'
      tier: 'Dynamic'
    }
  }
}

output AZURE_LOCATION string = location
output AZURE_TENANT_ID string = tenant().tenantId
output APPLICATIONINSIGHTS_CONNECTION_STRING string = monitoring.outputs.applicationInsightsConnectionString
output DATABASE_URL string = 'postgresql://${databaseAdminUsername}:${databaseAdminPassword}@${database.outputs.POSTGRES_DOMAIN_NAME}:5432/budgetdb?sslmode=require'
output STORAGE_ACCOUNT_NAME string = storage.outputs.name
output FUNCTION_APP_NAME string = functionApp.outputs.name
