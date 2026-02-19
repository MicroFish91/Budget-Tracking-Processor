import { app, InvocationContext } from '@azure/functions';
import { Readable } from 'stream';
import * as XLSX from 'xlsx';
import csv from 'csv-parser';
import { Pool } from 'pg';

interface BudgetEntry {
  date: string;
  category: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

export async function processBudgetFile(blob: Buffer, context: InvocationContext): Promise<void> {
  const blobName = context.triggerMetadata.name as string;
  context.log(`Processing blob: ${blobName}, size: ${blob.length} bytes`);

  try {
    const fileExtension = blobName.split('.').pop()?.toLowerCase();
    let entries: BudgetEntry[];

    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      entries = await parseExcelFile(blob, context);
    } else if (fileExtension === 'csv') {
      entries = await parseCsvFile(blob, context);
    } else {
      throw new Error(`Unsupported file type: ${fileExtension}`);
    }

    context.log(`Parsed ${entries.length} entries from ${blobName}`);

    if (entries.length > 0) {
      await saveBudgetEntries(entries, blobName, context);
      context.log(`Successfully saved ${entries.length} entries to database`);
    } else {
      context.warn('No valid entries found in file');
    }
  } catch (error) {
    context.error(`Error processing blob ${blobName}:`, error);
    throw error;
  }
}

async function parseExcelFile(buffer: Buffer, context: InvocationContext): Promise<BudgetEntry[]> {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  context.log(`Parsed ${data.length} rows from Excel file`);
  return data.map((row: any) => mapRowToBudgetEntry(row, context)).filter(Boolean) as BudgetEntry[];
}

async function parseCsvFile(buffer: Buffer, context: InvocationContext): Promise<BudgetEntry[]> {
  return new Promise((resolve, reject) => {
    const entries: BudgetEntry[] = [];
    const stream = Readable.from(buffer);

    stream
      .pipe(csv())
      .on('data', (row) => {
        const entry = mapRowToBudgetEntry(row, context);
        if (entry) {
          entries.push(entry);
        }
      })
      .on('end', () => {
        context.log(`Parsed ${entries.length} rows from CSV file`);
        resolve(entries);
      })
      .on('error', (error) => {
        context.error('Error parsing CSV:', error);
        reject(error);
      });
  });
}

function mapRowToBudgetEntry(row: any, context: InvocationContext): BudgetEntry | null {
  try {
    // Support various column name variations
    const date = row.date || row.Date || row.DATE;
    const category = row.category || row.Category || row.CATEGORY;
    const description = row.description || row.Description || row.DESCRIPTION || '';
    const amount = parseFloat(row.amount || row.Amount || row.AMOUNT || '0');
    const type = (row.type || row.Type || row.TYPE || 'expense').toLowerCase();

    if (!date || !category || isNaN(amount)) {
      context.warn(`Skipping invalid row: ${JSON.stringify(row)}`);
      return null;
    }

    if (type !== 'income' && type !== 'expense') {
      context.warn(`Invalid type "${type}", defaulting to "expense"`);
    }

    return {
      date: new Date(date).toISOString().split('T')[0],
      category,
      description,
      amount,
      type: type === 'income' ? 'income' : 'expense'
    };
  } catch (error) {
    context.warn(`Error mapping row: ${error}, Row: ${JSON.stringify(row)}`);
    return null;
  }
}

async function saveBudgetEntries(
  entries: BudgetEntry[],
  sourceFile: string,
  context: InvocationContext
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const insertQuery = `
      INSERT INTO budget_entries (entry_date, category, description, amount, entry_type, source_file)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    for (const entry of entries) {
      await client.query(insertQuery, [
        entry.date,
        entry.category,
        entry.description,
        entry.amount,
        entry.type,
        sourceFile
      ]);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    context.error('Error saving to database:', error);
    throw error;
  } finally {
    client.release();
  }
}

app.storageBlob('processBudgetFile', {
  path: 'budget-files/{name}',
  connection: 'AzureWebJobsStorage',
  handler: processBudgetFile
});
