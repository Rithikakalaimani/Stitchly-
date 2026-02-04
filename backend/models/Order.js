const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  order_id: { type: String, required: true, unique: true },
  customer_id: { type: String, required: true, ref: 'Customer' },
  order_date: { type: Date, default: Date.now },
  total_estimated_amount: { type: Number, default: 0 },
  status: { type: String, enum: ['OPEN', 'COMPLETED'], default: 'OPEN' },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
