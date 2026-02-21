param name string
param location string = resourceGroup().location
param tags object = {}

param sku object = {
  name: 'Standard_B1ms'
  tier: 'Burstable'
}

param storage object = {
  storageSizeGB: 32
}

param databaseName string
param administratorLogin string
@secure()
param administratorLoginPassword string
param allowAzureIPsFirewall bool = false
param allowAllIPsFirewall bool = false
param version string = '16'

resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2022-12-01' = {
  location: location
  tags: tags
  name: name
  sku: sku
  properties: {
    version: version
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorLoginPassword
    storage: storage
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }

  resource database 'databases' = {
    name: databaseName
  }

  resource firewall_all 'firewallRules' = if (allowAllIPsFirewall) {
    name: 'allow-all-IPs'
    properties: {
      startIpAddress: '0.0.0.0'
      endIpAddress: '255.255.255.255'
    }
  }

  resource firewall_azure 'firewallRules' = if (allowAzureIPsFirewall) {
    name: 'allow-all-azure-internal-IPs'
    properties: {
      startIpAddress: '0.0.0.0'
      endIpAddress: '0.0.0.0'
    }
  }
}

output POSTGRES_DOMAIN_NAME string = postgresServer.properties.fullyQualifiedDomainName
output POSTGRES_NAME string = postgresServer.name
