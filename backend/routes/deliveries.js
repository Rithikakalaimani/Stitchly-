const express = require('express');
const router = express.Router();
const Delivery = require('../models/Delivery');
const DeliveryItem = require('../models/DeliveryItem');
const Garment = require('../models/Garment');
const Order = require('../models/Order');
const { genId } = require('../utils/ids');

// Create delivery with items; auto-update garment quantity_delivered and status
router.post('/', async (req, res) => {
  try {
    const { order_id, items } = req.body; // items: [{ garment_id, quantity_delivered }]
    if (!order_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'order_id and items array required' });
    }
    const order = await Order.findOne({ order_id });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Order already completed' });
    }
    const delivery_id = genId('D');
    const delivery = await Delivery.create({
      delivery_id,
      order_id,
    });
    const createdItems = [];
    for (const it of items) {
      const garment = await Garment.findOne({
        order_id,
        garment_id: it.garment_id,
      });
      if (!garment) continue;
      const qty = Math.min(
        Math.max(0, Math.floor(Number(it.quantity_delivered) || 0)),
        garment.quantity - (garment.quantity_delivered || 0)
      );
      if (qty <= 0) continue;
      await DeliveryItem.create({
        delivery_id,
        garment_id: garment.garment_id,
        quantity_delivered: qty,
      });
      const newDelivered = (garment.quantity_delivered || 0) + qty;
      garment.quantity_delivered = newDelivered;
      garment.status = newDelivered >= garment.quantity ? 'DELIVERED' : 'STITCHED';
      await garment.save();
      createdItems.push({ garment_id: garment.garment_id, quantity_delivered: qty });
    }
    const allGarments = await Garment.find({ order_id });
    const allDelivered = allGarments.every(
      (g) => (g.quantity_delivered || 0) >= g.quantity
    );
    if (allDelivered) {
      order.status = 'COMPLETED';
      await order.save();
    }
    const deliveryItems = await DeliveryItem.find({ delivery_id });
    res.status(201).json({
      delivery,
      deliveryItems,
      order_updated: order,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.order_id) filter.order_id = req.query.order_id;
    const deliveries = await Delivery.find(filter).sort({ delivery_date: -1 });
    res.json(deliveries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
