const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  payment_id: { type: String, required: true, unique: true },
  order_id: { type: String, required: true, ref: 'Order' },
  amount_paid: { type: Number, required: true, min: 0 },
  payment_date: { type: Date, default: Date.now },
  mode: { type: String, enum: ['cash', 'UPI'], required: true },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
