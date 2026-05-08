const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runSqlFile(filePath) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not found in environment');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  try {
    await client.connect();
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`Running ${path.basename(filePath)}...`);
    await client.query(sql);
    console.log(`Finished ${path.basename(filePath)}.`);
  } catch (err) {
    console.error(`Error running ${filePath}:`, err.message);
  } finally {
    await client.end();
  }
}

const file = process.argv[2];
if (!file) {
  console.error('Usage: node db_tool.js <file.sql>');
  process.exit(1);
}

runSqlFile(path.resolve(__dirname, '..', file));
