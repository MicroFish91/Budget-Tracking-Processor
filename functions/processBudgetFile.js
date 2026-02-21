"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processBudgetFile = processBudgetFile;
const functions_1 = require("@azure/functions");
const stream_1 = require("stream");
const XLSX = __importStar(require("xlsx"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});
async function processBudgetFile(blob, context) {
    const blobName = context.triggerMetadata.name;
    context.log(`Processing blob: ${blobName}, size: ${blob.length} bytes`);
    try {
        const fileExtension = blobName.split('.').pop()?.toLowerCase();
        let entries;
        if (fileExtension === 'xlsx' || fileExtension === 'xls') {
            entries = await parseExcelFile(blob, context);
        }
        else if (fileExtension === 'csv') {
            entries = await parseCsvFile(blob, context);
        }
        else {
            throw new Error(`Unsupported file type: ${fileExtension}`);
        }
        context.log(`Parsed ${entries.length} entries from ${blobName}`);
        if (entries.length > 0) {
            await saveBudgetEntries(entries, blobName, context);
            context.log(`Successfully saved ${entries.length} entries to database`);
        }
        else {
            context.warn('No valid entries found in file');
        }
    }
    catch (error) {
        context.error(`Error processing blob ${blobName}:`, error);
        throw error;
    }
}
async function parseExcelFile(buffer, context) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    context.log(`Parsed ${data.length} rows from Excel file`);
    return data.map((row) => mapRowToBudgetEntry(row, context)).filter(Boolean);
}
async function parseCsvFile(buffer, context) {
    return new Promise((resolve, reject) => {
        const entries = [];
        const stream = stream_1.Readable.from(buffer);
        stream
            .pipe((0, csv_parser_1.default)())
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
function mapRowToBudgetEntry(row, context) {
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
    }
    catch (error) {
        context.warn(`Error mapping row: ${error}, Row: ${JSON.stringify(row)}`);
        return null;
    }
}
async function saveBudgetEntries(entries, sourceFile, context) {
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
    }
    catch (error) {
        await client.query('ROLLBACK');
        context.error('Error saving to database:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
functions_1.app.storageBlob('processBudgetFile', {
    path: 'budget-files/{name}',
    connection: 'AzureWebJobsStorage',
    handler: processBudgetFile
});
//# sourceMappingURL=processBudgetFile.js.map