param name string
param location string = resourceGroup().location
param tags object = {}

param allowBlobPublicAccess bool = false
param containers array = []
param kind string = 'StorageV2'
param minimumTlsVersion string = 'TLS1_2'
param sku object = { name: 'Standard_LRS' }

resource storage 'Microsoft.Storage/storageAccounts@2022-05-01' = {
  name: name
  location: location
  tags: union(tags, {
    'Az.Sec.DisableLocalAuth.Storage::Skip': 'true'
  })
  kind: kind
  sku: sku
  properties: {
    minimumTlsVersion: minimumTlsVersion
    allowBlobPublicAccess: allowBlobPublicAccess
    allowSharedKeyAccess: true
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Allow'
    }
  }

  resource blobServices 'blobServices' = if (!empty(containers)) {
    name: 'default'
    resource container 'containers' = [for container in containers: {
      name: container.name
      properties: {
        publicAccess: contains(container, 'publicAccess') ? container.publicAccess : 'None'
      }
    }]
  }
}

output id string = storage.id
output name string = storage.name
output primaryEndpoints object = storage.properties.primaryEndpoints