// server.js - Enhanced Node.js server with PostgreSQL using standard pg library
require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const cors = require('cors');
const {Pool} = require('pg'); // Use standard pg library instead of @vercel/postgres

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Parse POSTGRES_URL or use individual environment variables
let dbConfig;
if (process.env.POSTGRES_URL) {
  dbConfig = {
    connectionString: process.env.POSTGRES_URL,
    ssl: false // Set to true if you need SSL
  };
  console.log('📡 Using POSTGRES_URL for connection');
} else {
  dbConfig = {
    user: process.env.POSTGRES_USER || process.env.DB_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || 'yash2801',
    host: process.env.POSTGRES_HOST || process.env.DB_HOST || '45.79.126.149',
    port: process.env.POSTGRES_PORT || process.env.DB_PORT || 5432,
    database: process.env.POSTGRES_DATABASE || process.env.DB_NAME || 'gdees',
    ssl: false
  };
  console.log('📡 Using individual environment variables for connection');
}

console.log('🔍 Database Config:', {
  host: dbConfig.host || 'from connection string',
  port: dbConfig.port || 'from connection string',
  database: dbConfig.database || 'from connection string',
  user: dbConfig.user || 'from connection string'
});

// Create PostgreSQL connection pool
const pool = new Pool(dbConfig);

// Handle pool events with better error handling
pool.on('error', (err, client) => {
  console.error('❌ Unexpected error on idle client:', err.message);
  console.error('❌ Error code:', err.code);
  console.error('❌ Error details:', err.detail || 'No additional details');
});

pool.on('connect', (client) => {
  console.log('✅ New client connected to PostgreSQL');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  console.error('❌ Error code:', error.code);
  if (error.code === 'ECONNREFUSED') {
    console.error('❌ Connection refused. Check if PostgreSQL is running and accepting connections.');
    console.error('❌ Make sure your Linode server allows external connections.');
  } else if (error.code === 'ENOTFOUND') {
    console.error('❌ Host not found. Check your POSTGRES_URL host/IP address.');
  } else if (error.code === 'ETIMEDOUT') {
    console.error('❌ Connection timeout. Check firewall and network settings.');
  }
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Test connection function
async function testConnection() {
  console.log('🔍 Testing database connection...');
  try {
    const client = await pool.connect();
    console.log('✅ Successfully connected to PostgreSQL!');

    const result = await client.query('SELECT NOW() as current_time, current_database() as database_name, version() as pg_version');
    console.log('📅 Server time:', result.rows[0].current_time);
    console.log('🗄️ Database name:', result.rows[0].database_name);
    console.log('🐘 PostgreSQL version:', result.rows[0].pg_version.split(' ')[0] + ' ' + result.rows[0].pg_version.split(' ')[1]);

    client.release();
    return true;
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.error('❌ Error code:', error.code);

    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Possible solutions:');
      console.error('   1. Make sure PostgreSQL is running on your Linode server');
      console.error('   2. Check if PostgreSQL is listening on the correct port (5432)');
      console.error('   3. Verify your Linode server IP address is correct');
      console.error('   4. Check firewall settings on your Linode server');
    } else if (error.code === 'ENOTFOUND') {
      console.error('💡 Check your POSTGRES_URL - the host/IP might be incorrect');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('💡 Connection timeout - check network connectivity and firewall');
    } else if (error.code === '28P01') {
      console.error('💡 Authentication failed - check username/password');
    } else if (error.code === '3D000') {
      console.error('💡 Database "gdees" does not exist - create it first');
    }

    return false;
  }
}

// Database helper function
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('🔍 Query executed:', {
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      duration: duration + 'ms',
      rows: res.rowCount
    });
    return res;
  } catch (error) {
    console.error('❌ Database query error:', error.message);
    throw error;
  }
}

// Initialize database tables
async function initializeDatabase() {
  console.log('🚀 Initializing PostgreSQL database...');

  try {
    // Test connection first
    const testResult = await query('SELECT NOW() as current_time, current_database() as database_name');
    console.log('✅ Database connection successful!');
    console.log('📅 Server time:', testResult.rows[0].current_time);
    console.log('🗄️ Database name:', testResult.rows[0].database_name);

    // Create vendors table
    await query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(255),
        payment_terms VARCHAR(50) DEFAULT 'advance' CHECK (payment_terms IN ('advance', 'credit', 'mixed')),
        visit_frequency VARCHAR(50) DEFAULT 'weekly' CHECK (visit_frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),
        last_visit DATE,
        next_visit DATE,
        has_display VARCHAR(10) DEFAULT 'no' CHECK (has_display IN ('yes', 'no')),
        display_rent DECIMAL(10,2) DEFAULT 0,
        terms_conditions TEXT,
        remarks TEXT,
        status VARCHAR(50) DEFAULT 'active',
        date_added DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create brands table
    await query(`
      CREATE TABLE IF NOT EXISTS brands (
        id BIGSERIAL PRIMARY KEY,
        vendor_id BIGINT REFERENCES vendors(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        sku VARCHAR(100),
        category VARCHAR(100) DEFAULT 'groceries' CHECK (category IN ('groceries', 'dairy', 'beverages', 'snacks', 'personal_care', 'household', 'bakery', 'frozen', 'other')),
        date_added DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create issues table
    await query(`
      CREATE TABLE IF NOT EXISTS issues (
        id BIGSERIAL PRIMARY KEY,
        vendor_id BIGINT REFERENCES vendors(id) ON DELETE CASCADE,
        product_name VARCHAR(255) NOT NULL,
        issue_type VARCHAR(100) NOT NULL CHECK (issue_type IN ('expired', 'damaged', 'defective', 'wrong_delivery', 'poor_quality', 'short_delivery', 'other')),
        quantity INTEGER DEFAULT 1,
        date_found DATE DEFAULT CURRENT_DATE,
        estimated_loss DECIMAL(10,2) DEFAULT 0,
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
        resolved_date DATE,
        date_added DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create invoice_payments table
    await query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id BIGSERIAL PRIMARY KEY,
        vendor_id BIGINT REFERENCES vendors(id) ON DELETE CASCADE,
        invoice_number VARCHAR(100) NOT NULL,
        invoice_date DATE NOT NULL,
        invoice_amount DECIMAL(12,2) NOT NULL,
        total_items INTEGER DEFAULT 0,
        due_date DATE,
          invoice_status VARCHAR(50) DEFAULT 'pending' 
              CHECK (invoice_status IN ('pending', 'paid', 'partial', 'overdue')),
        date_added DATE DEFAULT CURRENT_DATE,
        last_updated DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(vendor_id, invoice_number)
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS invoice_payments (
          id BIGSERIAL PRIMARY KEY,
          invoice_id BIGINT REFERENCES invoices(id) ON DELETE CASCADE,
          payment_date DATE NOT NULL,
          payment_amount DECIMAL(12,2) NOT NULL,
          payment_method VARCHAR(50) CHECK (payment_method IN ('cheque', 'cash', 'online', 'card', '')),
          cheque_number VARCHAR(100),
          cheque_date DATE,
          payment_notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS credit_notes (
        id BIGSERIAL PRIMARY KEY,
        invoice_id BIGINT REFERENCES invoices(id) ON DELETE CASCADE,
        crn_number VARCHAR(100) NOT NULL,
        credit_date DATE NOT NULL DEFAULT CURRENT_DATE,
        credit_amount DECIMAL(12,2) NOT NULL,
        items_returned INTEGER DEFAULT 0,
        return_reason TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(crn_number)
      );`);


    // Create indexes for better performance
    await query('CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name)');
    await query('CREATE INDEX IF NOT EXISTS idx_brands_vendor_id ON brands(vendor_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_issues_vendor_id ON issues(vendor_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status)');
    await query('CREATE INDEX IF NOT EXISTS idx_invoice_payments_vendor_id ON invoice_payments(invoice_id)');

    console.log('✅ Database tables initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    console.error('❌ Make sure your PostgreSQL connection is configured correctly');
    return false;
  }
}

// API Routes

// Get all data
app.get('/api/data', async (req, res) => {
  try {
    console.log('📖 Fetching all data from PostgreSQL...');

    // Fetch all data in parallel
    const [vendorsResult, brandsResult, issuesResult, invoicesResult] = await Promise.all([
      query('SELECT * FROM vendors ORDER BY name'),
      query('SELECT b.*, v.name as vendor_name FROM brands b LEFT JOIN vendors v ON b.vendor_id = v.id ORDER BY v.name, b.name'),
      query('SELECT i.*, v.name as vendor_name, v.phone as vendor_phone FROM issues i LEFT JOIN vendors v ON i.vendor_id = v.id ORDER BY CASE WHEN i.status = $1 THEN 0 ELSE 1 END, i.date_found DESC', ['pending']),
      query('SELECT ip.*, v.name as vendor_name, v.phone as vendor_phone FROM invoices ip LEFT JOIN vendors v ON ip.vendor_id = v.id ORDER BY ip.invoice_date DESC')
    ]);

    const data = {
      vendors: vendorsResult.rows,
      brands: brandsResult.rows,
      issues: issuesResult.rows,
      invoicePayments: invoicesResult.rows,
      lastSaved: new Date().toISOString(),
      version: '3.0',
      database: 'PostgreSQL (gdees)'
    };

    console.log(`✅ Data fetched successfully. Records: vendors=${data.vendors.length}, brands=${data.brands.length}, issues=${data.issues.length}, invoices=${data.invoicePayments.length}`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error fetching data:', error);
    res.status(500).json({error: 'Failed to read database: ' + error.message});
  }
});

// Add vendor
app.post('/api/vendors', async (req, res) => {
  console.log('📝 POST /api/vendors - Adding new vendor:', req.body.name);
  try {
    const result = await query(`
      INSERT INTO vendors (
        name, contact_person, phone, email, payment_terms, 
        visit_frequency, last_visit, next_visit, has_display, 
        display_rent, terms_conditions, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *
    `, [
      req.body.name, req.body.contactPerson, req.body.phone,
      req.body.email, req.body.paymentTerms || 'advance',
      req.body.visitFrequency || 'weekly', req.body.lastVisit || null,
      req.body.nextVisit || null, req.body.hasDisplay || 'no',
      req.body.displayRent || 0, req.body.termsConditions,
      req.body.remarks
    ]);

    const vendor = result.rows[0];
    console.log(`✅ Vendor added successfully. ID: ${vendor.id}`);
    res.json({success: true, vendor});
  } catch (error) {
    console.error('❌ Error in POST /api/vendors:', error);
    res.status(500).json({error: 'Failed to add vendor: ' + error.message});
  }
});

// Add brand
app.post('/api/brands', async (req, res) => {
  console.log('📝 POST /api/brands - Adding new brand:', req.body.name);
  try {
    const result = await query(
      'INSERT INTO brands (vendor_id, name, sku, category) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.body.vendorId, req.body.name, req.body.sku, req.body.category || 'groceries']
    );

    const brand = result.rows[0];
    console.log(`✅ Brand added successfully. ID: ${brand.id}`);
    res.json({success: true, brand});
  } catch (error) {
    console.error('❌ Error in POST /api/brands:', error);
    res.status(500).json({error: 'Failed to add brand: ' + error.message});
  }
});

// Add issue
app.post('/api/issues', async (req, res) => {
  console.log('📝 POST /api/issues - Adding new issue for product:', req.body.productName);
  try {
    const result = await query(`
      INSERT INTO issues (
        vendor_id, product_name, issue_type, quantity, 
        date_found, estimated_loss, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `, [
      req.body.vendorId, req.body.productName, req.body.issueType,
      req.body.quantity || 1, req.body.dateFound || new Date().toISOString().split('T')[0],
      req.body.estimatedLoss || 0, req.body.description
    ]);

    const issue = result.rows[0];
    console.log(`✅ Issue added successfully. ID: ${issue.id}`);
    res.json({success: true, issue});
  } catch (error) {
    console.error('❌ Error in POST /api/issues:', error);
    res.status(500).json({error: 'Failed to add issue: ' + error.message});
  }
});

// Add/Update Invoice & Payment
// Add/Update Invoice
// Add/Update Invoice & Payment (using existing invoice_payments table structure)
app.post('/api/invoices', async (req, res) => {
  console.log('📝 POST /api/invoices - Processing invoice:', req.body.invoiceNumber);
  try {
    // Handle empty string dates by converting to null
    const dueDate = req.body.dueDate && req.body.dueDate.trim() !== '' ? req.body.dueDate : null;

    // Check if invoice already exists (same vendor + invoice number)
    const existingInvoice = await query(
      'SELECT * FROM invoices WHERE vendor_id = $1 AND invoice_number = $2',
      [req.body.vendorId, req.body.invoiceNumber]
    );

    let result;
    if (existingInvoice.rows.length > 0) {
      console.log(`🔄 Updating existing invoice: ${req.body.invoiceNumber}`);
      // Update existing invoice
      const updateResult = await query(`
        UPDATE invoices SET
          invoice_date = $1, invoice_amount = $2, total_items = $3, due_date = $4,
          last_updated = CURRENT_DATE
        WHERE vendor_id = $5 AND invoice_number = $6 RETURNING *
      `, [
        req.body.invoiceDate, req.body.invoiceAmount, req.body.totalItems || 0, dueDate,
        req.body.vendorId, req.body.invoiceNumber
      ]);
      result = {success: true, invoice: updateResult.rows[0], action: 'updated'};
    } else {
      console.log(`➕ Creating new invoice: ${req.body.invoiceNumber}`);
      // Create new invoice with default payment values
      const insertResult = await query(`
        INSERT INTO invoices (
          vendor_id, invoice_number, invoice_date, invoice_amount, total_items,
          due_date
        ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
      `, [
        req.body.vendorId, req.body.invoiceNumber, req.body.invoiceDate,
        req.body.invoiceAmount, req.body.totalItems || 0, dueDate
      ]);
      result = {success: true, invoice: insertResult.rows[0], action: 'created'};
    }

    console.log(`✅ Invoice processed successfully: ${result.action}`);
    res.json(result);
  } catch (error) {
    console.error('❌ Error in POST /api/invoices:', error);
    res.status(500).json({error: 'Failed to add/update invoice: ' + error.message});
  }
});

// Update issue status
app.put('/api/issues/:id', async (req, res) => {
  try {
    const issueId = req.params.id;
    const updateData = {
      ...req.body,
      resolved_date: req.body.status === 'resolved' ? new Date().toISOString().split('T')[0] : null
    };

    const result = await query(`
      UPDATE issues SET
        status = $1,
        resolved_date = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [updateData.status, updateData.resolved_date, issueId]);

    if (result.rows.length === 0) {
      return res.status(404).json({error: 'Issue not found'});
    }

    console.log(`✅ Issue updated successfully. ID: ${issueId}`);
    res.json({success: true, issue: result.rows[0]});
  } catch (error) {
    console.error('❌ Error updating issue:', error);
    res.status(500).json({error: 'Failed to update issue: ' + error.message});
  }
});

// Delete vendor
app.delete('/api/vendors/:id', async (req, res) => {
  try {
    const vendorId = req.params.id;
    const result = await query('DELETE FROM vendors WHERE id = $1 RETURNING *', [vendorId]);

    if (result.rows.length === 0) {
      return res.status(404).json({error: 'Vendor not found'});
    }

    console.log(`✅ Vendor deleted successfully. ID: ${vendorId}`);
    res.json({success: true});
  } catch (error) {
    console.error('❌ Error deleting vendor:', error);
    res.status(500).json({error: 'Failed to delete vendor: ' + error.message});
  }
});

// Delete brand
app.delete('/api/brands/:id', async (req, res) => {
  try {
    const brandId = req.params.id;
    const result = await query('DELETE FROM brands WHERE id = $1 RETURNING *', [brandId]);

    if (result.rows.length === 0) {
      return res.status(404).json({error: 'Brand not found'});
    }

    console.log(`✅ Brand deleted successfully. ID: ${brandId}`);
    res.json({success: true});
  } catch (error) {
    console.error('❌ Error deleting brand:', error);
    res.status(500).json({error: 'Failed to delete brand: ' + error.message});
  }
});

// Delete invoice
app.delete('/api/invoices/:id', async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const result = await query('DELETE FROM invoice_payments WHERE id = $1 RETURNING *', [invoiceId]);

    if (result.rows.length === 0) {
      return res.status(404).json({error: 'Invoice not found'});
    }

    console.log(`✅ Invoice deleted successfully. ID: ${invoiceId}`);
    res.json({success: true});
  } catch (error) {
    console.error('❌ Error deleting invoice:', error);
    res.status(500).json({error: 'Failed to delete invoice: ' + error.message});
  }
});

// Health check
app.get('/health', async (req, res) => {
  try {
    const result = await query('SELECT COUNT(*) as vendors FROM vendors');
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'PostgreSQL (gdees)',
      vendors: result.rows[0].vendors
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// API info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    message: 'GDEES Vendor Management API with PostgreSQL',
    version: '3.0',
    storage: 'PostgreSQL (gdees database)',
    endpoints: {
      data: '/api/data',
      vendors: '/api/vendors',
      brands: '/api/brands',
      issues: '/api/issues',
      invoices: '/api/invoices',
      health: '/health'
    }
  });
});

// Initialize database on startup
console.log('🚀 Starting GDEES Vendor Management Server...');

// Start server
app.listen(PORT, async () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📁 Using PostgreSQL database: gdees`);
  console.log(`🌐 Access at: http://localhost:${PORT}`);

  // Test connection first
  const connectionOk = await testConnection();
  if (!connectionOk) {
    console.error('❌ Database connection failed. Server started but database is not accessible.');
    console.error('🔧 Fix the connection issue and restart the server.');
    return;
  }

  try {
    await initializeDatabase();
    console.log('✅ Database initialization completed successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
  }
});
// Get complete invoices with payments and credits aggregated
app.get('/api/invoices-complete', async (req, res) => {
  try {
    console.log('📖 Fetching complete invoice data from invoices, invoice_payments, and credit_notes tables...');

    // 1️⃣ Fetch all invoices with vendor info
    const invoicesQuery = `
      SELECT i.*, v.name as vendor_name, v.phone as vendor_phone
      FROM invoices i
      LEFT JOIN vendors v ON i.vendor_id = v.id
      ORDER BY i.invoice_date DESC
    `;
    const invoicesResult = await query(invoicesQuery);
    const invoices = invoicesResult.rows;

    if (invoices.length === 0) {
      console.log('✅ No invoices found');
      return res.json({success: true, invoices: []});
    }

    // 2️⃣ Fetch all payments
    const paymentsQuery = `SELECT * FROM invoice_payments`;
    const paymentsResult = await query(paymentsQuery);
    const paymentsByInvoice = {};
    paymentsResult.rows.forEach(p => {
      if (!paymentsByInvoice[p.invoice_id]) paymentsByInvoice[p.invoice_id] = [];
      paymentsByInvoice[p.invoice_id].push({
        id: p.id,
        paymentDate: p.payment_date,
        paymentAmount: parseFloat(p.payment_amount || 0),
        paymentMethod: p.payment_method || '',
        chequeNumber: p.cheque_number || '',
        chequeDate: p.cheque_date || '',
        notes: p.payment_notes || ''
      });
    });

    // 3️⃣ Fetch all credit notes
    const creditsQuery = `SELECT * FROM credit_notes`;
    const creditsResult = await query(creditsQuery);
    const creditsByInvoice = {};
    creditsResult.rows.forEach(c => {
      if (!creditsByInvoice[c.invoice_id]) creditsByInvoice[c.invoice_id] = [];
      creditsByInvoice[c.invoice_id].push({
        id: c.id,
        crnNumber: c.crn_number,
        creditDate: c.credit_date,
        creditAmount: parseFloat(c.credit_amount || 0),
        itemsReturned: c.items_returned || 0,
        returnReason: c.return_reason || '',
        description: c.description || ''
      });
    });

    // 4️⃣ Combine and calculate totals
    const completeInvoices = invoices.map(invoice => {
      const invoicePayments = paymentsByInvoice[invoice.id] || [];
      const invoiceCredits = creditsByInvoice[invoice.id] || [];

      const totalPayments = invoicePayments.reduce((sum, p) => sum + p.paymentAmount, 0);
      const totalCredits = invoiceCredits.reduce((sum, c) => sum + c.creditAmount, 0);
      const outstanding = parseFloat(invoice.invoice_amount || 0) - totalPayments - totalCredits;

      // Determine payment status
      let paymentStatus = 'pending';
      if (outstanding <= 0) {
        paymentStatus = 'paid';
      } else if (totalPayments > 0) {
        paymentStatus = 'partial';
      } else if (invoice.due_date && new Date(invoice.due_date) < new Date()) {
        paymentStatus = 'overdue';
      }

      return {
        id: invoice.id,
        vendorId: invoice.vendor_id,
        invoiceNumber: invoice.invoice_number,
        invoiceDate: invoice.invoice_date,
        invoiceAmount: parseFloat(invoice.invoice_amount || 0),
        totalItems: invoice.total_items || 0,
        dueDate: invoice.due_date,
        paymentStatus,
        paymentAmount: totalPayments,
        totalCredits,
        outstanding,
        payments: invoicePayments,
        creditNotes: invoiceCredits,
        vendor_name: invoice.vendor_name,
        vendor_phone: invoice.vendor_phone,
        vendor_contact_person: invoice.contact_person
      };
    });

    console.log(`✅ Complete invoice data prepared. Records: ${completeInvoices.length}`);
    res.json({success: true, invoices: completeInvoices});

  } catch (error) {
    console.error('❌ Error fetching complete invoice data:', error);
    res.status(500).json({error: 'Failed to fetch invoice data: ' + error.message});
  }
});

// Record payment (update existing invoice_payments record)
app.post('/api/payments', async (req, res) => {
  console.log('📝 POST /api/payments - Recording payment for invoice:', req.body.invoiceId);
  try {
    const {
      invoiceId,
      paymentAmount,
      paymentMethod,
      paymentDate,
      chequeNumber,
      chequeDate,
      notes
    } = req.body;

    const effectiveChequeDate = chequeDate && chequeDate.trim() !== '' ? chequeDate : null;

    // 1️⃣ Check if a payment already exists for this invoice on the same date
    const existingPayment = await query(`
      SELECT * FROM invoice_payments
      WHERE invoice_id = $1 AND payment_date = $2
    `, [invoiceId, paymentDate]);

    let result;
    // 3️⃣ Insert a new payment record
    const insertResult = await query(`
      INSERT INTO invoice_payments (
        invoice_id, payment_date, payment_amount, payment_method,
        cheque_number, cheque_date, payment_notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
    `, [
      invoiceId,
      paymentDate,
      paymentAmount,
      paymentMethod,
      chequeNumber || null,
      effectiveChequeDate,
      notes || ''
    ]);

    result = {success: true, payment: insertResult.rows[0], action: 'created'};


    console.log(`✅ Payment recorded successfully for invoice ID: ${req.body.invoiceId}`);
    res.json({success: true, invoice: result});
  } catch (error) {
    console.error('❌ Error in POST /api/payments:', error);
    res.status(500).json({error: 'Failed to record payment: ' + error.message});
  }
});

// Add credit note to existing invoice
app.post('/api/credit-notes', async (req, res) => {
  console.log('📝 POST /api/credit-notes - Creating credit note for invoice:', req.body.invoiceId);
  try {
    const result = await query(`
      INSERT INTO credit_notes (
        invoice_id, crn_number, credit_date, credit_amount,
        items_returned, return_reason, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `, [
      req.body.invoiceId, req.body.crnNumber, req.body.creditDate,
      req.body.creditAmount, req.body.itemsReturned || 0,
      req.body.returnReason || '', req.body.description || ''
    ]);

    console.log(`✅ Credit note created successfully. ID: ${result.rows[0].id}`);
    res.json({success: true, creditNote: result.rows[0]});
  } catch (error) {
    console.error('❌ Error in POST /api/credit-notes:', error);
    res.status(500).json({error: 'Failed to create credit note: ' + error.message});
  }
});

module.exports = app;