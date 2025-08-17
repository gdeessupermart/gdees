// server.js - Serverless Vendor Management System for Vercel
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// In-memory database (persists during function lifetime)
let database = {
  vendors: [],
  brands: [],
  issues: [],
  lastSaved: new Date().toISOString(),
  version: '1.0'
};

// Initialize with sample data if empty
function initializeDatabase() {
  if (database.vendors.length === 0) {
    database.vendors = [
      { 
        id: 1672531200000, 
        name: "Fresh Farms Co.", 
        contact: "john@freshfarms.com", 
        phone: "+1-555-0123",
        status: "active",
        dateAdded: "2024-01-01"
      },
      { 
        id: 1672617600000, 
        name: "Dairy Delights", 
        contact: "mary@dairydelights.com", 
        phone: "+1-555-0456",
        status: "active",
        dateAdded: "2024-01-02"
      }
    ];
    
    database.brands = [
      { 
        id: 1672704000000, 
        vendorId: 1672531200000, 
        name: "Farm Fresh", 
        category: "Produce",
        dateAdded: "2024-01-03"
      },
      { 
        id: 1672790400000, 
        vendorId: 1672617600000, 
        name: "Creamy Choice", 
        category: "Dairy",
        dateAdded: "2024-01-04"
      }
    ];
    
    database.issues = [
      {
        id: 1672876800000,
        vendorId: 1672531200000,
        title: "Late delivery",
        description: "Order #123 was delivered 2 days late",
        status: "pending",
        dateAdded: "2024-01-05"
      }
    ];
  }
}

// API Routes

// Get all data
app.get('/api/data', (req, res) => {
  try {
    initializeDatabase();
    res.json(database);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read database' });
  }
});

// Add vendor
app.post('/api/vendors', (req, res) => {
  try {
    initializeDatabase();
    const vendor = {
      id: Date.now(),
      ...req.body,
      dateAdded: new Date().toISOString().split('T')[0]
    };
    database.vendors.push(vendor);
    database.lastSaved = new Date().toISOString();
    
    res.json({ success: true, vendor });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add vendor' });
  }
});

// Add brand
app.post('/api/brands', (req, res) => {
  try {
    initializeDatabase();
    const brand = {
      id: Date.now(),
      ...req.body,
      dateAdded: new Date().toISOString().split('T')[0]
    };
    database.brands.push(brand);
    database.lastSaved = new Date().toISOString();
    
    res.json({ success: true, brand });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add brand' });
  }
});

// Add issue
app.post('/api/issues', (req, res) => {
  try {
    initializeDatabase();
    const issue = {
      id: Date.now(),
      ...req.body,
      status: 'pending',
      dateAdded: new Date().toISOString().split('T')[0]
    };
    database.issues.push(issue);
    database.lastSaved = new Date().toISOString();
    
    res.json({ success: true, issue });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add issue' });
  }
});

// Update issue status
app.put('/api/issues/:id', (req, res) => {
  try {
    initializeDatabase();
    const issue = database.issues.find(i => i.id == req.params.id);

    if (issue) {
      Object.assign(issue, req.body);
      if (req.body.status === 'resolved') {
        issue.resolvedDate = new Date().toISOString().split('T')[0];
      }
      database.lastSaved = new Date().toISOString();
      
      res.json({ success: true, issue });
    } else {
      res.status(404).json({ error: 'Issue not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update issue' });
  }
});

// Delete vendor
app.delete('/api/vendors/:id', (req, res) => {
  try {
    initializeDatabase();
    const vendorId = parseInt(req.params.id);

    database.vendors = database.vendors.filter(v => v.id !== vendorId);
    database.brands = database.brands.filter(b => b.vendorId !== vendorId);
    database.issues = database.issues.filter(i => i.vendorId !== vendorId);
    database.lastSaved = new Date().toISOString();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete vendor' });
  }
});

// Delete brand
app.delete('/api/brands/:id', (req, res) => {
  try {
    initializeDatabase();
    database.brands = database.brands.filter(b => b.id != req.params.id);
    database.lastSaved = new Date().toISOString();
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete brand' });
  }
});

// Create backup
app.get('/api/backup', (req, res) => {
  try {
    initializeDatabase();
    const backupData = {
      ...database,
      backupCreated: new Date().toISOString()
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="backup_${new Date().toISOString().split('T')[0]}.json"`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (error) {
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: {
      vendors: database.vendors.length,
      brands: database.brands.length,
      issues: database.issues.length
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Supermart Vendor Management API',
    version: '1.0',
    endpoints: {
      data: '/api/data',
      vendors: '/api/vendors',
      brands: '/api/brands',
      issues: '/api/issues',
      backup: '/api/backup',
      health: '/health'
    }
  });
});

// Export for Vercel serverless deployment
module.exports = app;
