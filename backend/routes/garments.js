const express = require('express');
const router = express.Router();
const Garment = require('../models/Garment');
const Order = require('../models/Order');
const DeliveryItem = require('../models/DeliveryItem');

// Update garment status (PENDING | STITCHED | DELIVERED)
router.patch('/:garment_id', async (req, res) => {
  try {
    const { garment_id } = req.params;
    const { status } = req.body;
    if (!status || !['PENDING', 'STITCHED', 'DELIVERED'].includes(status)) {
      return res.status(400).json({ error: 'status must be PENDING, STITCHED, or DELIVERED' });
    }
    const garment = await Garment.findOne({ garment_id });
    if (!garment) return res.status(404).json({ error: 'Garment not found' });
    garment.status = status;
    if (status === 'DELIVERED') {
      garment.quantity_delivered = garment.quantity;
    } else if (status === 'PENDING') {
      garment.quantity_delivered = 0;
    }
    await garment.save();
    if (status === 'DELIVERED') {
      const allGarments = await Garment.find({ order_id: garment.order_id });
      const allDelivered = allGarments.every((g) => (g.quantity_delivered || 0) >= g.quantity);
      if (allDelivered) {
        await Order.findOneAndUpdate(
          { order_id: garment.order_id },
          { status: 'COMPLETED' }
        );
      }
    }
    res.json(garment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete garment and remove from database; recalculate order total
router.delete('/:garment_id', async (req, res) => {
  try {
    const { garment_id } = req.params;
    const garment = await Garment.findOne({ garment_id });
    if (!garment) return res.status(404).json({ error: 'Garment not found' });
    const order_id = garment.order_id;
    await DeliveryItem.deleteMany({ garment_id });
    await Garment.deleteOne({ garment_id });
    const remaining = await Garment.find({ order_id });
    const total_estimated_amount = remaining.reduce((s, g) => s + g.quantity * g.price_per_piece, 0);
    await Order.findOneAndUpdate(
      { order_id },
      { total_estimated_amount }
    );
    res.json({ deleted: garment_id, order_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
