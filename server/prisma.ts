import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const path = require('path');

// Ensure database file exists or is accessible via absolute path
const dbPath = path.join(process.cwd(), 'dev.db');
// URL format for better-sqlite3 adapter seems to be expected in config
const url = `file:${dbPath}`;

console.log('Initializing PrismaBetterSqlite3 with url:', url);

const adapter = new PrismaBetterSqlite3({
  url
});

const prisma = new PrismaClient({ adapter });

export default prisma;
