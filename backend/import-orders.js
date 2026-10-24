
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function importOrders() {
  try {
    if (
      !process.env.SUPABASE_URL ||
      !process.env.SUPABASE_SECRET_KEY
    ) {
      throw new Error('Supabase settings are missing from .env.');
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY
    );

    const filePath = path.join(__dirname, 'data', 'orders.json');
    const orders = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (!Array.isArray(orders)) {
      throw new Error('The orders file must contain an array.');
    }

    if (orders.length === 0) {
      console.log('No local orders to import.');
      return;
    }

    const ids = orders.map(order => String(order.id));

    if (
      ids.some(id => !id || id === 'undefined') ||
      new Set(ids).size !== ids.length
    ) {
      throw new Error('Order IDs are missing or duplicated.');
    }

    const rows = orders.map(order => ({
      id: order.id,
      customer: order.customer || {},
      whatsapp_opt_in: Boolean(
        order.whatsappOptIn ??
        order.customer?.whatsappOptIn ??
        false
      ),
      items: order.items || [],
      subtotal: order.subtotal ?? 0,
      delivery_fee: order.deliveryFee ?? 0,
      total: order.total ?? 0,
      delivery_method: order.deliveryMethod ?? null,
      payment_method: order.paymentMethod ?? null,
      status: order.status ?? 'pending',
      payment_reference: order.paymentReference ?? null,
      created_at: order.createdAt ?? new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('orders')
      .upsert(rows, { onConflict: 'id' })
      .select('id');

    if (error) {
      throw new Error(error.message);
    }

    console.log(`SUCCESS: ${data.length} orders imported or updated.`);
    console.log('Your original local orders file remains unchanged.');
  } catch (error) {
    console.error('Order import failed:', error.message);
    process.exitCode = 1;
  }
}

importOrders();
