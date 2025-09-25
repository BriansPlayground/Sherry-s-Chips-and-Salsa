const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

// Google Calendar API setup
const calendarId = process.env.GOOGLE_CALENDAR_ID || '2a0d64c24145f8947f34bd6a4282da0fec4f7772e3fed8cd16f14cff6942863f@group.calendar.google.com';
const apiKey = process.env.GOOGLE_API_KEY || 'AIzaSyCUSMCfivBFmoQ1YTGG-dSHRUTJba5H15E';
const calendar = google.calendar({ version: 'v3', auth: apiKey });

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.static('.'));

// Database setup
const db = new sqlite3.Database('./sherrys_eats.db');

// Initialize database tables
db.serialize(() => {
  // Orders table
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    delivery_date TEXT,
    delivery_location TEXT,
    event_id INTEGER,
    total_amount REAL,
    status TEXT DEFAULT 'pending',
    payment_status TEXT DEFAULT 'unpaid',
    notes TEXT,
    FOREIGN KEY (event_id) REFERENCES events (id)
  )`);

  // Order items table
  db.run(`CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    product_type TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders (id)
  )`);

  // Inventory table
  db.run(`CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_name TEXT NOT NULL,
    current_stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 10,
    unit TEXT DEFAULT 'units',
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Customers table
  db.run(`CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT UNIQUE,
    email TEXT UNIQUE,
    heard_from TEXT,
    referral_names TEXT,
    referral_emails TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    email_optin BOOLEAN DEFAULT 1,
    sms_optin BOOLEAN DEFAULT 1
  )`);

  // Events table
  db.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    event_date DATETIME,
    location TEXT,
    google_calendar_id TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // City requests table
  db.run(`CREATE TABLE IF NOT EXISTS city_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city TEXT NOT NULL,
    email TEXT NOT NULL,
    request_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending'
  )`);

  // Insert default inventory items
  db.run(`INSERT OR IGNORE INTO inventory (item_name, current_stock, min_stock, unit) VALUES 
    ('Chips (1lb bags)', 50, 20, 'bags'),
    ('Mild Salsa (16oz)', 30, 15, 'jars'),
    ('Enjoyable Salsa (16oz)', 25, 15, 'jars'),
    ('Burn Your Ass Hot Salsa (16oz)', 20, 10, 'jars'),
    ('Inferno Salsa (16oz)', 15, 10, 'jars'),
    ('Mild Salsa (32oz)', 20, 10, 'jars'),
    ('Enjoyable Salsa (32oz)', 15, 10, 'jars'),
    ('Burn Your Ass Hot Salsa (32oz)', 10, 5, 'jars'),
    ('Inferno Salsa (32oz)', 8, 5, 'jars')`
  );
});

// API Routes

// Submit new order
app.post('/api/orders', (req, res) => {
  const { customer, items, delivery_date, delivery_location, event_id, notes } = req.body;
  
  db.run(`INSERT INTO customers (name, phone, email, heard_from, referral_names, referral_emails, email_optin, sms_optin) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?) 
          ON CONFLICT(phone) DO UPDATE SET 
          name = excluded.name, 
          email = excluded.email, 
          heard_from = excluded.heard_from,
          referral_names = excluded.referral_names,
          referral_emails = excluded.referral_emails,
          email_optin = excluded.email_optin, 
          sms_optin = excluded.sms_optin`, 
    [customer.name, customer.phone, customer.email, customer.heard_from, customer.referral_names, customer.referral_emails, customer.email_optin, customer.sms_optin],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const customer_id = this.lastID;
      const total_amount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

      db.run(`INSERT INTO orders (customer_name, customer_phone, customer_email, delivery_date, delivery_location, event_id, total_amount, notes) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [customer.name, customer.phone, customer.email, delivery_date, delivery_location, event_id || null, total_amount, notes],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          const order_id = this.lastID;

          // Insert order items
          const itemPromises = items.map(item => {
            return new Promise((resolve, reject) => {
              db.run(`INSERT INTO order_items (order_id, product_type, product_name, quantity, unit_price, total_price) 
                      VALUES (?, ?, ?, ?, ?, ?)`,
                [order_id, item.type, item.name, item.quantity, item.unit_price, item.quantity * item.unit_price],
                (err) => {
                  if (err) reject(err);
                  else resolve();
                }
              );
            });
          });

          Promise.all(itemPromises)
            .then(() => {
              res.json({ 
                success: true, 
                order_id: order_id,
                message: 'Order submitted successfully!' 
              });
            })
            .catch(err => {
              res.status(500).json({ error: err.message });
            });
        }
      );
    }
  );
});

// Get all orders
app.get('/api/orders', (req, res) => {
  db.all(`SELECT o.*, e.title as event_name,
          GROUP_CONCAT(oi.product_name || ' x' || oi.quantity) as items
          FROM orders o 
          LEFT JOIN events e ON o.event_id = e.id
          LEFT JOIN order_items oi ON o.id = oi.order_id 
          GROUP BY o.id 
          ORDER BY o.order_date DESC`, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get production list (what needs to be made)
app.get('/api/production-list', (req, res) => {
  const query = `
    SELECT 
      oi.product_name,
      SUM(oi.quantity) as total_needed,
      i.current_stock,
      (SUM(oi.quantity) - i.current_stock) as need_to_make,
      e.title as event_name
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    LEFT JOIN inventory i ON oi.product_name = i.item_name
    LEFT JOIN events e ON o.event_id = e.id
    WHERE o.status = 'pending' AND o.delivery_date >= date('now')
    GROUP BY oi.product_name
    HAVING need_to_make > 0
    ORDER BY need_to_make DESC
  `;
  
  db.all(query, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get inventory
app.get('/api/inventory', (req, res) => {
  db.all('SELECT * FROM inventory ORDER BY item_name', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Update inventory
app.post('/api/inventory/update', (req, res) => {
  const { item_name, new_stock } = req.body;
  
  db.run('UPDATE inventory SET current_stock = ?, last_updated = CURRENT_TIMESTAMP WHERE item_name = ?',
    [new_stock, item_name], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, message: 'Inventory updated' });
    }
  );
});

// Get customers
app.get('/api/customers', (req, res) => {
  db.all(`SELECT c.*, 
          GROUP_CONCAT(DISTINCT e.title) as events_attended
          FROM customers c
          LEFT JOIN orders o ON c.phone = o.customer_phone
          LEFT JOIN events e ON o.event_id = e.id
          GROUP BY c.id
          ORDER BY c.created_date DESC`, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Event Management Routes

// Get all events
app.get('/api/events', (req, res) => {
  db.all('SELECT * FROM events ORDER BY event_date DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get event by ID
app.get('/api/events/:id', (req, res) => {
  db.get('SELECT * FROM events WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(row);
  });
});

// Create new event
app.post('/api/events', (req, res) => {
  const { title, description, event_date, location, google_calendar_id } = req.body;
  
  db.run(`INSERT INTO events (title, description, event_date, location, google_calendar_id) 
          VALUES (?, ?, ?, ?, ?)`,
    [title, description, event_date, location, google_calendar_id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ 
        success: true, 
        event_id: this.lastID,
        message: 'Event created successfully!' 
      });
    }
  );
});

// Update event
app.post('/api/events/update', (req, res) => {
  const { id, title, description, event_date, location, google_calendar_id } = req.body;
  
  db.run(`UPDATE events SET title = ?, description = ?, event_date = ?, location = ?, google_calendar_id = ? 
          WHERE id = ?`,
    [title, description, event_date, location, google_calendar_id, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ 
        success: true, 
        message: 'Event updated successfully!' 
      });
    }
  );
});

// Delete event
app.post('/api/events/delete/:id', (req, res) => {
  db.run('DELETE FROM events WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ 
      success: true, 
      message: 'Event deleted successfully!' 
    });
  });
});

// Get orders by event
app.get('/api/orders/event/:eventId', (req, res) => {
  db.all(`SELECT o.*, e.title as event_name,
          GROUP_CONCAT(oi.product_name || ' x' || oi.quantity) as items
          FROM orders o 
          LEFT JOIN events e ON o.event_id = e.id
          LEFT JOIN order_items oi ON o.id = oi.order_id 
          WHERE o.event_id = ?
          GROUP BY o.id 
          ORDER BY o.order_date DESC`, [req.params.eventId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get customers by event
app.get('/api/customers/event/:eventId', (req, res) => {
  db.all(`SELECT DISTINCT c.*, e.title as event_name
          FROM customers c
          JOIN orders o ON c.phone = o.customer_phone
          LEFT JOIN events e ON o.event_id = e.id
          WHERE o.event_id = ?
          ORDER BY c.created_date DESC`, [req.params.eventId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get production list by event
app.get('/api/production-list/event/:eventId', (req, res) => {
  const query = `
    SELECT 
      oi.product_name,
      SUM(oi.quantity) as total_needed,
      i.current_stock,
      (SUM(oi.quantity) - i.current_stock) as need_to_make,
      e.title as event_name
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    LEFT JOIN inventory i ON oi.product_name = i.item_name
    LEFT JOIN events e ON o.event_id = e.id
    WHERE o.status = 'pending' AND o.event_id = ? AND o.delivery_date >= date('now')
    GROUP BY oi.product_name
    HAVING need_to_make > 0
    ORDER BY need_to_make DESC
  `;
  
  db.all(query, [req.params.eventId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get cities with events
app.get('/api/cities', (req, res) => {
  // Return the Michigan cities that Sherry's Eats serves
  const cities = [
    'Metamora', 'Davison', 'Lapeer', 'Imlay City', 'Capac', 
    'Armada', 'Waterford', 'Clarkston', 'Oxford', 'Lake Orion', 'Auburn Hills'
  ];
  res.json(cities);
});

// Get events from Google Calendar (delivery events only)
app.get('/api/calendar-events', async (req, res) => {
  try {
    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: new Date().toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    });

    // Get all events from the delivery calendar (no filtering needed since it's the delivery calendar)
    const events = response.data.items.map(event => ({
        id: event.id,
        title: event.summary || 'Untitled Event',
        description: event.description || '',
        start: event.start.dateTime || event.start.date,
        location: event.location || '',
        google_calendar_id: event.id
      }));

    console.log(`Filtered ${events.length} delivery events from Google Calendar`);
    res.json(events);
  } catch (error) {
    console.error('Error fetching calendar events:', error.message);
    res.json([]);
  }
});

// Get events by city
app.get('/api/events/city/:city', (req, res) => {
  const city = req.params.city;
  
  db.all(`SELECT * FROM events 
          WHERE location = ? AND event_date >= date('now')
          ORDER BY event_date ASC`, [city], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// City requests
app.post('/api/city-requests', (req, res) => {
  const { city, email } = req.body;
  
  db.run('INSERT INTO city_requests (city, email) VALUES (?, ?)',
    [city, email], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ 
        success: true, 
        message: 'City request submitted successfully!' 
      });
    }
  );
});

// Get city requests
app.get('/api/city-requests', (req, res) => {
  db.all('SELECT * FROM city_requests ORDER BY request_date DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Update city request status
app.post('/api/city-requests/update/:id', (req, res) => {
  const { status } = req.body;
  
  db.run('UPDATE city_requests SET status = ? WHERE id = ?',
    [status, req.params.id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ 
        success: true, 
        message: 'City request status updated successfully!' 
      });
    }
  );
});

// Google Calendar integration (existing) - DISABLED FOR NOW
app.get('/api/deliveries', async (req, res) => {
  // Temporarily disabled due to API key restrictions
  res.json({ items: [] });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Sherry's Eats server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
