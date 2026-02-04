require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const customerRoutes = require('./routes/customers');
const orderRoutes = require('./routes/orders');
const deliveryRoutes = require('./routes/deliveries');
const paymentRoutes = require('./routes/payments');
const dashboardRoutes = require('./routes/dashboard');
const garmentRoutes = require('./routes/garments');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tailor';

app.use(cors());
app.use(express.json());

app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/garments', garmentRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
