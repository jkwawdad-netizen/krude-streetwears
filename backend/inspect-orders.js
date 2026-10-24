
const fs = require('fs');
const path = require('path');

try {
  const filePath = path.join(__dirname, 'data', 'orders.json');
  const orders = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (!Array.isArray(orders)) {
    throw new Error('Expected the orders file to contain an array.');
  }

  console.log('Total local orders:', orders.length);

  if (orders.length > 0) {
    const first = orders[0];

    console.log('Order field names:', Object.keys(first));
    console.log('Customer field type:', typeof first.customer);
    console.log('Items field type:', Array.isArray(first.items)
      ? 'array'
      : typeof first.items);

    if (first.customer && typeof first.customer === 'object') {
      console.log('Customer field names:', Object.keys(first.customer));
    }

    if (Array.isArray(first.items) && first.items.length > 0) {
      console.log('First item field names:', Object.keys(first.items[0]));
    }
  }
} catch (error) {
  console.error('Inspection failed:', error.message);
  process.exitCode = 1;
}
