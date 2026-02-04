const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  delivery_id: { type: String, required: true, unique: true },
  order_id: { type: String, required: true, ref: 'Order' },
  delivery_date: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Delivery', deliverySchema);
