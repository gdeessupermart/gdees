// server.js - Lightweight Node.js Vendor Management System
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = 'database.json';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize database
async function initializeDatabase() {
try {
await fs.access(DB_FILE);
console.log('Database file exists');
} catch (error) {
console.log('Creating new database file...');
const initialData = {
vendors: [],
brands: [],
issues: [],
lastSaved: new Date().toISOString(),
version: '1.0'
};
await fs.writeFile(DB_FILE, JSON.stringify(initialData, null, 2));
console.log('Database file created');
}
}

// Read database
async function readDatabase() {
try {
const data = await fs.readFile(DB_FILE, 'utf8');
return JSON.parse(data);
} catch (error) {
console.error('Error reading database:', error);
return { vendors: [], brands: [], issues: [] };
}
}

// Write database
async function writeDatabase(data) {
try {
data.lastSaved = new Date().toISOString();
await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
return true;
} catch (error) {
console.error('Error writing database:', error);
return false;
}
}

// API Routes

// Get all data
app.get('/api/data', async (req, res) => {
try {
const data = await readDatabase();
res.json(data);
} catch (error) {
res.status(500).json({ error: 'Failed to read database' });
}
});

// Add vendor
app.post('/api/vendors', async (req, res) => {
try {
const data = await readDatabase();
const vendor = {
id: Date.now(),
...req.body,
dateAdded: new Date().toISOString().split('T')[0]
};
data.vendors.push(vendor);

if (await writeDatabase(data)) {
res.json({ success: true, vendor });
} else {
res.status(500).json({ error: 'Failed to save vendor' });
}
} catch (error) {
res.status(500).json({ error: 'Failed to add vendor' });
}
});

// Add brand
app.post('/api/brands', async (req, res) => {
try {
const data = await readDatabase();
const brand = {
id: Date.now(),
...req.body,
dateAdded: new Date().toISOString().split('T')[0]
};
data.brands.push(brand);

if (await writeDatabase(data)) {
res.json({ success: true, brand });
} else {
res.status(500).json({ error: 'Failed to save brand' });
}
} catch (error) {
res.status(500).json({ error: 'Failed to add brand' });
}
});

// Add issue
app.post('/api/issues', async (req, res) => {
try {
const data = await readDatabase();
const issue = {
id: Date.now(),
...req.body,
status: 'pending',
dateAdded: new Date().toISOString().split('T')[0]
};
data.issues.push(issue);

if (await writeDatabase(data)) {
res.json({ success: true, issue });
} else {
res.status(500).json({ error: 'Failed to save issue' });
}
} catch (error) {
res.status(500).json({ error: 'Failed to add issue' });
}
});

// Update issue status
app.put('/api/issues/:id', async (req, res) => {
try {
const data = await readDatabase();
const issue = data.issues.find(i => i.id == req.params.id);

if (issue) {
Object.assign(issue, req.body);
if (req.body.status === 'resolved') {
issue.resolvedDate = new Date().toISOString().split('T')[0];
}

if (await writeDatabase(data)) {
res.json({ success: true, issue });
} else {
res.status(500).json({ error: 'Failed to update issue' });
}
} else {
res.status(404).json({ error: 'Issue not found' });
}
} catch (error) {
res.status(500).json({ error: 'Failed to update issue' });
}
});

// Delete vendor
app.delete('/api/vendors/:id', async (req, res) => {
try {
const data = await readDatabase();
const vendorId = parseInt(req.params.id);

data.vendors = data.vendors.filter(v => v.id !== vendorId);
data.brands = data.brands.filter(b => b.vendorId !== vendorId);
data.issues = data.issues.filter(i => i.vendorId !== vendorId);

if (await writeDatabase(data)) {
res.json({ success: true });
} else {
res.status(500).json({ error: 'Failed to delete vendor' });
}
} catch (error) {
res.status(500).json({ error: 'Failed to delete vendor' });
}
});

// Delete brand
app.delete('/api/brands/:id', async (req, res) => {
try {
const data = await readDatabase();
data.brands = data.brands.filter(b => b.id != req.params.id);

if (await writeDatabase(data)) {
res.json({ success: true });
} else {
res.status(500).json({ error: 'Failed to delete brand' });
}
} catch (error) {
res.status(500).json({ error: 'Failed to delete brand' });
}
});

// Create backup
app.get('/api/backup', async (req, res) => {
try {
const data = await readDatabase();
const backupData = {
...data,
backupCreated: new Date().toISOString()
};

res.setHeader('Content-Type', 'application/json');
res.setHeader('Content-Disposition', `attachment; filename="backup_${new Date().toISOString().split('T')[0]}.json"`);
res.send(JSON.stringify(backupData, null, 2));
} catch (error) {
res.status(500).json({ error: 'Failed to create backup' });
}
});

// Start server
async function startServer() {
await initializeDatabase();

app.listen(PORT, () => {
console.log(`🚀 Supermart Vendor Management Server running on http://localhost:${PORT}`);
console.log(`📁 Database file: ${path.resolve(DB_FILE)}`);
console.log('📊 Ready to manage your vendors!');
});
}

startServer().catch(console.error);