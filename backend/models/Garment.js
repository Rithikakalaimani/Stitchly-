const mongoose = require('mongoose');

const garmentSchema = new mongoose.Schema({
  garment_id: { type: String, required: true, unique: true },
  order_id: { type: String, required: true, ref: 'Order' },
  type: { type: String, required: true }, // blouse, saree fall, shirt, etc.
  quantity: { type: Number, required: true, min: 1 },
  price_per_piece: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['PENDING', 'STITCHED', 'DELIVERED'], default: 'PENDING' },
  quantity_delivered: { type: Number, default: 0 }, // running total delivered
  image: { type: String, default: '' }, // optional base64 data URL
}, { timestamps: true });

module.exports = mongoose.model('Garment', garmentSchema);
