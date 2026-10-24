
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

async function importProducts() {
  try {
    const filePath = path.join(__dirname, 'data', 'products.json');
    const products = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (!Array.isArray(products) || products.length === 0) {
      throw new Error('Products file is empty or invalid.');
    }

    const rows = products.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      image: product.image || null,
      sizes: product.sizes || [],
      stock: product.stock ?? 0,
      description: product.description || ''
    }));

    const { data, error } = await supabase
      .from('products')
      .upsert(rows, { onConflict: 'id' })
      .select('id');

    if (error) {
      throw new Error(error.message);
    }

    console.log(`SUCCESS: ${data.length} products imported or updated.`);
    console.log('Existing product IDs have been preserved.');
  } catch (error) {
    console.error('Product import failed:', error.message);
    process.exitCode = 1;
  }
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  console.error('Supabase settings are missing from .env.');
  process.exitCode = 1;
} else {
  importProducts();
}
