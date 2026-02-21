param name string
param location string = resourceGroup().location
param tags object = {}

param applicationInsightsName string
param appServicePlanId string
param runtimeName string
param runtimeVersion string
param storageAccountName string
param appSettings object = {}

param kind string = 'functionapp,linux'

resource storageAccount 'Microsoft.Storage/storageAccounts@2021-09-01' existing = {
  name: storageAccountName
}

resource applicationInsights 'Microsoft.Insights/components@2020-02-02' existing = {
  name: applicationInsightsName
}

var customAppSettings = [for key in objectKeys(appSettings): {
  name: key
  value: appSettings[key]
}]

resource functionApp 'Microsoft.Web/sites@2022-03-01' = {
  name: name
  location: location
  tags: tags
  kind: kind
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlanId
    siteConfig: {
      ftpsState: 'FtpsOnly'
      minTlsVersion: '1.2'
      linuxFxVersion: '${toUpper(runtimeName)}|${runtimeVersion}'
      appSettings: union([
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'WEBSITE_CONTENTSHARE'
          value: toLower(name)
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: runtimeName
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: applicationInsights.properties.ConnectionString
        }
      ], customAppSettings)
    }
    httpsOnly: true
  }
}

output id string = functionApp.id
output name string = functionApp.name
output identityPrincipalId string = functionApp.identity.principalId
output uri string = 'https://${functionApp.properties.defaultHostName}'
