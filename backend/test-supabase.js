
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !secretKey) {
  console.error('Missing Supabase URL or secret key in backend .env');
  process.exit(1);
}

const supabase = createClient(url, secretKey);

async function testConnection() {
  try {
    const { error } = await supabase
      .from('products')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Supabase query failed:', error.message);
      process.exitCode = 1;
      return;
    }

    console.log('SUCCESS: Backend connected to Supabase.');
    console.log('Products table is accessible.');
  } catch {
    console.error('Connection failed. Check your Supabase configuration.');
    process.exitCode = 1;
  }
}

testConnection();
