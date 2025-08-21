import { Pool } from 'pg';

const pool = new Pool({
  user: 'san',
  host: 'localhost',
  database: 'ephemeral',
  password: 'ing',
  port: 5432,
});

export default pool;