
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('./supabase');
const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
const app = express();

app.use(cors());
app.use(express.json());

// ===============================
// FILE PATHS
// ===============================

const productsFile = path.join(
  __dirname,
  'data',
  'products.json'
);

// const ordersFile = path.join(
//   __dirname,
//   'data',
//   'orders.json'
// );

const uploadsFolder = path.join(
  __dirname,
  'uploads'
);

const adminFile = path.join(
  __dirname,
  'admin',
  'data',
  'admin.json'
);

const JWT_SECRET = process.env.JWT_SECRET;
// ===============================
// PAYSTACK CONFIGURATION
// ===============================

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

const PAYSTACK_CALLBACK_URL =
  process.env.PAYSTACK_CALLBACK_URL ||
  'http://localhost:4200/payment/callback';

if (!JWT_SECRET) {
  throw new Error(
    'JWT_SECRET is missing from the environment configuration.'
  );
}

// ===============================
// MAKE SURE FOLDERS EXIST
// ===============================

const dataFolder = path.join(__dirname, 'data');

if (!fs.existsSync(dataFolder)) {
  fs.mkdirSync(dataFolder, {
    recursive: true
  });
}

if (!fs.existsSync(uploadsFolder)) {
  fs.mkdirSync(uploadsFolder, {
    recursive: true
  });
}

if (!fs.existsSync(productsFile)) {
  fs.writeFileSync(productsFile, '[]');
}

// if (!fs.existsSync(ordersFile)) {
//   fs.writeFileSync(ordersFile, '[]');
// }

// ===============================
// SERVE PRODUCT IMAGES
// ===============================

app.use(
  '/uploads',
  express.static(uploadsFolder)
);

// ===============================
// IMAGE UPLOAD SETTINGS
// ===============================


const storage = multer.memoryStorage();

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'krude-streetwears/products',
        resource_type: 'image'
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve(result.secure_url);
      }
    );

    stream.end(buffer);
  });
}


const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Only JPG, JPEG, PNG and WEBP images are allowed.'
      )
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,

  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

// ===============================
// PRODUCT HELPERS
// ===============================

function getProducts() {
  const data = fs.readFileSync(productsFile, 'utf8');
  return JSON.parse(data);
}

function saveProducts(products) {
  fs.writeFileSync(
    productsFile,
    JSON.stringify(products, null, 2)
  );
}

// // ===============================
// // ORDER HELPERS
// // ===============================

// function getOrders() {
//   const data = fs.readFileSync(ordersFile, 'utf8');
//   return JSON.parse(data);
// }

// function saveOrders(orders) {
//   fs.writeFileSync(
//     ordersFile,
//     JSON.stringify(orders, null, 2)
//   );
// }

// ===============================
// ADMIN AUTHENTICATION MIDDLEWARE
// ===============================

function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: 'Authentication required'
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      message: 'Invalid authentication token'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'admin') {
      return res.status(403).json({
        message: 'Admin access required'
      });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      message: 'Invalid or expired token'
    });
  }
}

// ===============================
// GET ALL PRODUCTS
// PUBLIC - SUPABASE
// ===============================

app.get('/api/products', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('GET PRODUCTS ERROR:', error.message);
      return res.status(500).json({
        message: 'Could not load products'
      });
    }

    res.json(data);
  } catch (error) {
    console.error('GET PRODUCTS ERROR:', error);
    res.status(500).json({
      message: 'Could not load products'
    });
  }
});

// ===============================
// GET ONE PRODUCT
// PUBLIC - SUPABASE
// ===============================

app.get('/api/products/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: 'Invalid product ID'
      });
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('GET PRODUCT ERROR:', error.message);
      return res.status(500).json({
        message: 'Could not load product'
      });
    }

    if (!data) {
      return res.status(404).json({
        message: 'Product not found'
      });
    }

    res.json(data);
  } catch (error) {
    console.error('GET PRODUCT ERROR:', error);
    res.status(500).json({
      message: 'Could not load product'
    });
  }
});

// ===============================
// ADD PRODUCT
// ADMIN ONLY
// ===============================


 // ===============================
// ADD PRODUCT
// ADMIN ONLY - SUPABASE + CLOUDINARY
// ===============================

app.post(
  '/api/products',
  authenticateAdmin,
  upload.single('image'),
  async (req, res) => {
    try {
      let sizes = [];

      if (req.body.sizes) {
        try {
          sizes = JSON.parse(req.body.sizes);
        } catch {
          sizes = req.body.sizes
            .split(',')
            .map(size => size.trim())
            .filter(Boolean);
        }
      }

      let image = '';

      if (req.file) {
        image = await uploadToCloudinary(req.file.buffer);
      }

      const newProduct = {
        name: req.body.name || '',
        price: Number(req.body.price) || 0,
        category: req.body.category || '',
        image,
        sizes,
        stock: Number(req.body.stock) || 0,
        description: req.body.description || ''
      };

      const { data, error } = await supabase
        .from('products')
        .insert([newProduct])
        .select('*')
        .single();

      if (error) {
        console.error('ADD PRODUCT SUPABASE ERROR:', error.message);
        return res.status(500).json({
          message: 'Could not add product'
        });
      }

      res.status(201).json({
        message: 'Product added successfully',
        product: data
      });
    } catch (error) {
      console.error('ADD PRODUCT ERROR:', error.message || error);
      res.status(500).json({
        message: 'Could not add product'
      });
    }
  }
);

// ===============================
// UPDATE PRODUCT
// ADMIN ONLY
// ===============================


 // ===============================
// UPDATE PRODUCT
// ADMIN ONLY - SUPABASE + CLOUDINARY
// ===============================

app.put(
  '/api/products/:id',
  authenticateAdmin,
  upload.single('image'),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          message: 'Invalid product ID'
        });
      }

      const { data: existingProduct, error: fetchError } =
        await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .maybeSingle();

      if (fetchError) {
        console.error('FETCH PRODUCT ERROR:', fetchError.message);
        return res.status(500).json({
          message: 'Could not load product'
        });
      }

      if (!existingProduct) {
        return res.status(404).json({
          message: 'Product not found'
        });
      }

      let sizes = existingProduct.sizes || [];

      if (req.body.sizes !== undefined) {
        try {
          sizes = JSON.parse(req.body.sizes);
        } catch {
          sizes = String(req.body.sizes)
            .split(',')
            .map(size => size.trim())
            .filter(Boolean);
        }
      }

      let image = existingProduct.image || '';

      if (req.file) {
        image = await uploadToCloudinary(req.file.buffer);
      }

      const updatedProduct = {
        name: req.body.name ?? existingProduct.name,
        price: req.body.price !== undefined
          ? Number(req.body.price)
          : existingProduct.price,
        category: req.body.category ?? existingProduct.category,
        image,
        sizes,
        stock: req.body.stock !== undefined
          ? Number(req.body.stock)
          : existingProduct.stock,
        description: req.body.description ?? existingProduct.description
      };

      const { data, error } = await supabase
        .from('products')
        .update(updatedProduct)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('UPDATE PRODUCT SUPABASE ERROR:', error.message);
        return res.status(500).json({
          message: 'Could not update product'
        });
      }

      res.json({
        message: 'Product updated successfully',
        product: data
      });
    } catch (error) {
      console.error('UPDATE PRODUCT ERROR:', error.message || error);
      res.status(500).json({
        message: 'Could not update product'
      });
    }
  }
);


// ===============================
// DELETE PRODUCT
// ADMIN ONLY
// ===============================


 // ===============================
// DELETE PRODUCT
// ADMIN ONLY - SUPABASE
// ===============================

app.delete(
  '/api/products/:id',
  authenticateAdmin,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          message: 'Invalid product ID'
        });
      }

      const { data: existingProduct, error: fetchError } =
        await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .maybeSingle();

      if (fetchError) {
        console.error('FETCH PRODUCT ERROR:', fetchError.message);
        return res.status(500).json({
          message: 'Could not load product'
        });
      }

      if (!existingProduct) {
        return res.status(404).json({
          message: 'Product not found'
        });
      }

      const { data, error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('DELETE PRODUCT SUPABASE ERROR:', error.message);
        return res.status(500).json({
          message: 'Could not delete product'
        });
      }

      if (!data) {
        return res.status(404).json({
          message: 'Product not found'
        });
      }

      res.json({
        message: 'Product deleted successfully',
        product: data
      });
    } catch (error) {
      console.error('DELETE PRODUCT ERROR:', error.message || error);
      res.status(500).json({
        message: 'Could not delete product'
      });
    }
  }
);


// ===============================
// GET ALL ORDERS
// ADMIN ONLY
// ===============================


 // ===============================
 // GET ALL ORDERS
 // ADMIN ONLY — SUPABASE
 // ===============================

app.get('/api/orders', authenticateAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('GET ORDERS SUPABASE ERROR:', error.message);
      return res.status(500).json({
        message: 'Could not load orders'
      });
    }

    const orders = (data || []).map(order => ({
      ...order,
      deliveryFee: order.delivery_fee ?? 0,
      deliveryMethod: order.delivery_method || 'Standard Delivery',
      paymentMethod: order.payment_method || 'Payment on confirmation',
      paymentReference: order.payment_reference || '',
      paymentStatus: order.payment_status || 'unpaid',
      paymentInstructions: order.payment_instructions || '',
      estimatedDelivery: order.estimated_delivery || '',
      paystackAmount: order.paystack_amount ?? null,
      paidAt: order.paid_at || null,
      whatsappOptIn: order.whatsapp_opt_in === true,
      createdAt: order.created_at
    }));

    res.json(orders);
  } catch (error) {
    console.error('GET ORDERS ERROR:', error.message || error);
    res.status(500).json({
      message: 'Could not load orders'
    });
  }
});

// ===============================
// GET ONE ORDER
// ADMIN ONLY — SUPABASE
// ===============================

app.get('/api/orders/:id', authenticateAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        message: 'Invalid order ID'
      });
    }

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('GET ORDER SUPABASE ERROR:', error.message);
      return res.status(500).json({
        message: 'Could not load order'
      });
    }

    if (!order) {
      return res.status(404).json({
        message: 'Order not found'
      });
    }

    res.json({
      ...order,
      deliveryFee: order.delivery_fee ?? 0,
      deliveryMethod: order.delivery_method || 'Standard Delivery',
      paymentMethod: order.payment_method || 'Payment on confirmation',
      paymentReference: order.payment_reference || '',
      paymentStatus: order.payment_status || 'unpaid',
      paymentInstructions: order.payment_instructions || '',
      estimatedDelivery: order.estimated_delivery || '',
      paystackAmount: order.paystack_amount ?? null,
      paidAt: order.paid_at || null,
      whatsappOptIn: order.whatsapp_opt_in === true,
      createdAt: order.created_at
    });
  } catch (error) {
    console.error('GET ORDER ERROR:', error.message || error);
    res.status(500).json({
      message: 'Could not load order'
    });
  }
});



// // ===============================
// // GET ONE ORDER
// // ADMIN ONLY
// // ===============================



// ===============================
// CREATE ORDER
// PUBLIC
// SAVES WHATSAPP CONSENT
// ===============================


 // CREATE ORDER — SUPABASE
app.post('/api/orders', async (req, res) => {
  try {
    const whatsappOptIn =
      req.body.whatsappOptIn === true ||
      req.body.customer?.whatsappOptIn === true;

    const customer = {
      firstName: req.body.customer?.firstName || '',
      lastName: req.body.customer?.lastName || '',
      phone: req.body.customer?.phone || '',
      email: req.body.customer?.email || '',
      address: req.body.customer?.address || '',
      city: req.body.customer?.city || '',
      region: req.body.customer?.region || '',
      whatsappOptIn
    };

    const newOrder = {
      customer,
      items: Array.isArray(req.body.items) ? req.body.items : [],
      subtotal: Number(req.body.subtotal) || 0,
      delivery_fee: Number(req.body.deliveryFee) || 0,
      total: Number(req.body.total) || 0,
      payment_method:
        req.body.paymentMethod || 'Payment on confirmation',
      delivery_method:
        req.body.deliveryMethod || 'Standard Delivery',
      status: 'Pending',
      whatsapp_opt_in: whatsappOptIn,
      payment_status: 'unpaid',
      created_at: new Date().toISOString()
    };

    const { data: order, error } = await supabase
      .from('orders')
      .insert(newOrder)
      .select()
      .single();

    if (error) {
      console.error('CREATE ORDER SUPABASE ERROR:', error.message);
      return res.status(500).json({
        message: 'Could not create order'
      });
    }

    const responseOrder = {
      ...order,
      deliveryFee: order.delivery_fee ?? 0,
      deliveryMethod: order.delivery_method || 'Standard Delivery',
      paymentMethod:
        order.payment_method || 'Payment on confirmation',
      paymentReference: order.payment_reference || '',
      paymentStatus: order.payment_status || 'unpaid',
      paymentInstructions: order.payment_instructions || '',
      estimatedDelivery: order.estimated_delivery || '',
      paystackAmount: order.paystack_amount ?? null,
      paidAt: order.paid_at || null,
      whatsappOptIn: order.whatsapp_opt_in === true,
      createdAt: order.created_at
    };

    return res.status(201).json({
      message: 'Order created successfully',
      order: responseOrder
    });
  } catch (error) {
    console.error(
      'CREATE ORDER ERROR:',
      error.message || error
    );
    return res.status(500).json({
      message: 'Could not create order'
    });
  }
});


// ===============================
// UPDATE ORDER
// ADMIN ONLY
// PRESERVES EXISTING ORDER FIELDS
// ===============================


 // UPDATE ORDER — SUPABASE
app.put('/api/orders/:id', authenticateAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        message: 'Invalid order ID'
      });
    }

    // Load the existing order so unspecified fields are preserved.
    const { data: existingOrder, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('FETCH ORDER ERROR:', fetchError.message);
      return res.status(500).json({
        message: 'Could not load order'
      });
    }

    if (!existingOrder) {
      return res.status(404).json({
        message: 'Order not found'
      });
    }

    const body = req.body || {};

    const updates = {
      status: body.status ?? existingOrder.status,
      rider: body.rider ?? existingOrder.rider,
      delivery_fee:
        body.deliveryFee ?? existingOrder.delivery_fee,
      total: body.total ?? existingOrder.total,
      estimated_delivery:
        body.estimatedDelivery ?? existingOrder.estimated_delivery,
      payment_method:
        body.paymentMethod ?? existingOrder.payment_method,
      payment_status:
        body.paymentStatus ?? existingOrder.payment_status,
      payment_instructions:
        body.paymentInstructions ?? existingOrder.payment_instructions
    };

    const { data: order, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('UPDATE ORDER SUPABASE ERROR:', error.message);
      return res.status(500).json({
        message: 'Could not update order'
      });
    }

    const responseOrder = {
      ...order,
      deliveryFee: order.delivery_fee ?? 0,
      deliveryMethod: order.delivery_method || 'Standard Delivery',
      paymentMethod:
        order.payment_method || 'Payment on confirmation',
      paymentReference: order.payment_reference || '',
      paymentStatus: order.payment_status || 'unpaid',
      paymentInstructions: order.payment_instructions || '',
      estimatedDelivery: order.estimated_delivery || '',
      paystackAmount: order.paystack_amount ?? null,
      paidAt: order.paid_at || null,
      whatsappOptIn: order.whatsapp_opt_in === true,
      createdAt: order.created_at
    };

    return res.json({
      message: 'Order updated successfully',
      order: responseOrder
    });
  } catch (error) {
    console.error('UPDATE ORDER ERROR:', error.message || error);
    return res.status(500).json({
      message: 'Could not update order'
    });
  }
});


// ===============================
// DELETE ORDER
// ADMIN ONLY
// ===============================


 // DELETE ORDER — SUPABASE
app.delete('/api/orders/:id', authenticateAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        message: 'Invalid order ID'
      });
    }

    const { data: deletedOrder, error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('DELETE ORDER SUPABASE ERROR:', error.message);
      return res.status(500).json({
        message: 'Could not delete order'
      });
    }

    if (!deletedOrder) {
      return res.status(404).json({
        message: 'Order not found'
      });
    }

    return res.json({
      message: 'Order deleted successfully',
      order: {
        ...deletedOrder,
        deliveryFee: deletedOrder.delivery_fee ?? 0,
        deliveryMethod:
          deletedOrder.delivery_method || 'Standard Delivery',
        paymentMethod:
          deletedOrder.payment_method || 'Payment on confirmation',
        paymentReference: deletedOrder.payment_reference || '',
        paymentStatus: deletedOrder.payment_status || 'unpaid',
        paymentInstructions: deletedOrder.payment_instructions || '',
        estimatedDelivery: deletedOrder.estimated_delivery || '',
        paystackAmount: deletedOrder.paystack_amount ?? null,
        paidAt: deletedOrder.paid_at || null,
        whatsappOptIn: deletedOrder.whatsapp_opt_in === true,
        createdAt: deletedOrder.created_at
      }
    });
  } catch (error) {
    console.error('DELETE ORDER ERROR:', error.message || error);
    return res.status(500).json({
      message: 'Could not delete order'
    });
  }
});


// ===============================
// ADMIN LOGIN
// ===============================

app.post('/api/admin/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: 'Username and password are required'
      });
    }

    let admin;

    // Use Render environment variables in production.
    if (
      process.env.ADMIN_USERNAME &&
      process.env.ADMIN_PASSWORD_HASH
    ) {
      admin = {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD_HASH
      };
    } else if (fs.existsSync(adminFile)) {
      // Use the local configuration file during development.
      admin = JSON.parse(
        fs.readFileSync(adminFile, 'utf8')
      );
    } else {
      console.error('Admin configuration is missing.');

      return res.status(500).json({
        message: 'Admin configuration is missing'
      });
    }

    if (username !== admin.username) {
      return res.status(401).json({
        message: 'Invalid username or password'
      });
    }

    const passwordMatch = bcrypt.compareSync(
      password,
      admin.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: 'Invalid username or password'
      });
    }

    const token = jwt.sign(
      {
        username: admin.username,
        role: 'admin'
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({
  message: 'Login successful',
  token: token,
  admin: {
    username: admin.username,
    role: 'admin'
  }
});

  } catch (error) {
    console.error('Admin login error:', error.message);

    return res.status(500).json({
      message: 'Unable to log in'
    });
  }
});

 
 // PUBLIC - AMOUNT COMES FROM SAVED ORDER
// ===============================

app.post('/api/payments/paystack/initialize', async (req, res) => {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(503).json({
        message: 'Online payments are not configured yet.'
      });
    }

    const orderId = Number(req.body.orderId);

    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        message: 'A valid order ID is required.'
      });
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError) {
      console.error('PAYSTACK ORDER FETCH ERROR:', orderError);
      return res.status(500).json({
        message: 'Could not retrieve the order.'
      });
    }

    if (!order) {
      return res.status(404).json({
        message: 'Order not found.'
      });
    }

    if (order.payment_method !== 'Paystack') {
      return res.status(400).json({
        message: 'This order was not created for Paystack payment.'
      });
    }

    if (order.payment_status === 'paid') {
      return res.status(409).json({
        message: 'This order has already been paid.'
      });
    }

    const email = String(order.customer?.email || '').trim();

    if (!email) {
      return res.status(400).json({
        message: 'A valid customer email is required for online payment.'
      });
    }

    const amountInPesewas = Math.round(Number(order.subtotal) * 100);

    if (!Number.isSafeInteger(amountInPesewas) || amountInPesewas <= 0) {
      return res.status(400).json({
        message: 'The order subtotal is invalid for online payment.'
      });
    }

    const paystackResponse = await fetch(
      'https://api.paystack.co/transaction/initialize',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          amount: String(amountInPesewas),
          currency: 'GHS',
          callback_url: PAYSTACK_CALLBACK_URL,
          metadata: {
            orderId: order.id,
            customerName:
              `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim()
          }
        })
      }
    );

    const result = await paystackResponse.json();

    if (
      !paystackResponse.ok ||
      !result.status ||
      !result.data?.authorization_url ||
      !result.data?.reference
    ) {
      console.error('PAYSTACK INITIALIZE ERROR:', result);
      return res.status(502).json({
        message: result.message || 'Could not initialize Paystack payment.'
      });
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_reference: result.data.reference,
        payment_status: 'pending',
        payment_method: 'Paystack',
        paystack_amount: amountInPesewas
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('PAYSTACK ORDER UPDATE ERROR:', updateError);
      return res.status(500).json({
        message: 'Payment was initialized, but the order could not be updated. Please contact the shop before trying again.'
      });
    }

    return res.json({
      message: 'Payment initialized successfully.',
      authorizationUrl: result.data.authorization_url,
      reference: result.data.reference
    });
  } catch (error) {
    console.error('PAYSTACK INITIALIZE ERROR:', error);
    return res.status(500).json({
      message: 'Could not start online payment.'
    });
  }
});

// ===============================
// PAYSTACK: VERIFY PAYMENT
// PUBLIC CALLBACK, VERIFIED SERVER-SIDE
// ===============================

app.get('/api/payments/paystack/verify/:reference', async (req, res) => {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(503).json({
        message: 'Online payments are not configured yet.'
      });
    }

    const reference = String(req.params.reference || '').trim();

    if (!reference || reference.length > 200) {
      return res.status(400).json({
        message: 'A valid payment reference is required.'
      });
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('payment_reference', reference)
      .maybeSingle();

    if (orderError) {
      console.error('PAYSTACK ORDER FETCH ERROR:', orderError);
      return res.status(500).json({
        message: 'Could not retrieve the order for this payment.'
      });
    }

    if (!order) {
      return res.status(404).json({
        message: 'No order was found for this payment reference.'
      });
    }

    if (order.payment_status === 'paid') {
      return res.json({
        verified: true,
        paymentStatus: 'paid',
        orderId: order.id
      });
    }

    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const result = await paystackResponse.json();

    if (!paystackResponse.ok || !result.status || !result.data) {
      console.error('PAYSTACK VERIFY ERROR:', result);
      return res.status(502).json({
        message: 'Could not verify the payment with Paystack.'
      });
    }

    const transaction = result.data;
    const expectedAmount = Number(order.paystack_amount);

    const amountMatches =
      Number.isSafeInteger(expectedAmount) &&
      Number(transaction.amount) === expectedAmount;

    const currencyMatches = transaction.currency === 'GHS';
    const referenceMatches = transaction.reference === reference;
    const successful = transaction.status === 'success';

    if (
      !successful ||
      !amountMatches ||
      !currencyMatches ||
      !referenceMatches
    ) {
      const paymentStatus = successful
        ? 'verification_failed'
        : 'unpaid';

      const { error: updateError } = await supabase
        .from('orders')
        .update({ payment_status: paymentStatus })
        .eq('id', order.id);

      if (updateError) {
        console.error('PAYSTACK STATUS UPDATE ERROR:', updateError);
        return res.status(500).json({
          message: 'Could not update the payment status.'
        });
      }

      return res.status(400).json({
        verified: false,
        paymentStatus,
        message: 'Payment could not be confirmed for the expected amount and currency.'
      });
    }

    const paidAt = new Date().toISOString();

    const { error: paidUpdateError } = await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        payment_method: 'Paystack',
        paid_at: paidAt
      })
      .eq('id', order.id);

    if (paidUpdateError) {
      console.error('PAYSTACK PAID UPDATE ERROR:', paidUpdateError);
      return res.status(500).json({
        message: 'Payment was verified, but the order status could not be saved. Please contact the shop.'
      });
    }

    return res.json({
      verified: true,
      paymentStatus: 'paid',
      orderId: order.id
    });
  } catch (error) {
    console.error('PAYSTACK VERIFY ERROR:', error);
    return res.status(500).json({
      message: 'Could not verify the payment.'
    });
  }
});

// ===============================
// START SERVER
// ===============================

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(
    `Krūde backend running on http://localhost:${PORT}`
  );

  console.log(
    'Backend server is active and waiting for requests...'
  );

  console.log('Admin configuration path:', adminFile);
});

// ===============================
// SERVER ERROR HANDLING
// ===============================

server.on('error', (error) => {
  console.error('SERVER ERROR:', error);
});

process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('UNHANDLED REJECTION:', error);
});

process.on('exit', (code) => {
  console.log('NODE PROCESS EXITED WITH CODE:', code);
});
