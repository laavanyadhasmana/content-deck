
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function init() {
  try {
    console.log('🔧 Initializing database...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('✅ Database tables created successfully!');
    process.exit(0);
  } catch (err) {
    console.log('⚠️ Database init error (may already exist):', err.message);
    process.exit(0);
  }
}

init();
