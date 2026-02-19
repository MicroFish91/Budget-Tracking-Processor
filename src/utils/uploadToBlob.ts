import { BlobServiceClient, newPipeline, StorageSharedKeyCredential } from '@azure/storage-blob';
import * as fs from 'fs';
import * as path from 'path';

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING ?? 'UseDevelopmentStorage=true';
const BLOB_CONTAINER_NAME = 'budget-files';
const AZURITE_BLOB_SERVICE_VERSION = process.env.AZURITE_BLOB_SERVICE_VERSION ?? '2021-12-02';
const AZURITE_ACCOUNT_NAME = 'devstoreaccount1';
const AZURITE_ACCOUNT_KEY =
  'Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==';
const AZURITE_BLOB_ENDPOINT = 'http://127.0.0.1:10000/devstoreaccount1';

function createBlobServiceClient(): BlobServiceClient {
  if (AZURE_STORAGE_CONNECTION_STRING !== 'UseDevelopmentStorage=true') {
    return BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
  }

  const credential = new StorageSharedKeyCredential(AZURITE_ACCOUNT_NAME, AZURITE_ACCOUNT_KEY);
  const pipeline = newPipeline(credential);

  // Azure SDK v12.31.0 defaults to a newer x-ms-version than Azurite 3.35.0 supports.
  pipeline.factories.unshift({
    create: (nextPolicy: any) => ({
      sendRequest: async (request: any) => {
        request.headers.set('x-ms-version', AZURITE_BLOB_SERVICE_VERSION);
        return nextPolicy.sendRequest(request);
      },
    }),
  } as any);

  return new BlobServiceClient(AZURITE_BLOB_ENDPOINT, pipeline);
}

async function uploadFile(filePath: string): Promise<void> {
  try {
    console.log(`Uploading file: ${filePath}`);

    // Create BlobServiceClient
    const blobServiceClient = createBlobServiceClient();

    // Get container client (create if doesn't exist)
    const containerClient = blobServiceClient.getContainerClient(BLOB_CONTAINER_NAME);
    await containerClient.createIfNotExists();
    console.log(`Container "${BLOB_CONTAINER_NAME}" is ready`);

    // Read file
    const fileName = path.basename(filePath);
    const fileContent = fs.readFileSync(filePath);

    // Upload blob
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
    await blockBlobClient.upload(fileContent, fileContent.length);

    console.log(`✅ Successfully uploaded "${fileName}" to container "${BLOB_CONTAINER_NAME}"`);
    console.log(`Blob URL: ${blockBlobClient.url}`);
  } catch (error) {
    console.error('❌ Error uploading file:', error);
    process.exit(1);
  }
}

// Get file path from command line arguments
const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: npm run upload:blob <file-path>');
  console.error('Example: npm run upload:blob samples/budget-sample.csv');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

uploadFile(filePath);
