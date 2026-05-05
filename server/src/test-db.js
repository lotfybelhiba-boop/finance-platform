import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL.replace('/mynds_finance', '/postgres') // connect to default postgres db first
});

async function test() {
  try {
    await client.connect();
    console.log("SUCCESS: Connected to PostgreSQL!");
    const res = await client.query('SELECT NOW()');
    console.log("Time from DB:", res.rows[0].now);
    await client.end();
  } catch (err) {
    console.error("FAILURE: Connection failed!");
    console.error(err.message);
    process.exit(1);
  }
}

test();
