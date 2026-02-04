const mongoose = require('mongoose');

const deliveryItemSchema = new mongoose.Schema({
  delivery_id: { type: String, required: true, ref: 'Delivery' },
  garment_id: { type: String, required: true, ref: 'Garment' },
  quantity_delivered: { type: Number, required: true, min: 1 },
}, { timestamps: true });

module.exports = mongoose.model('DeliveryItem', deliveryItemSchema);
