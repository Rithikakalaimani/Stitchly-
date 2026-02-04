const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Garment = require('../models/Garment');
const Delivery = require('../models/Delivery');
const DeliveryItem = require('../models/DeliveryItem');
const Payment = require('../models/Payment');
const Customer = require('../models/Customer');
const { genId } = require('../utils/ids');

// List all orders (optional: ?customer_id=, ?status=)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.customer_id) filter.customer_id = req.query.customer_id;
    if (req.query.status) filter.status = req.query.status;
    const orders = await Order.find(filter).sort({ order_date: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single order with garments, deliveries, payments and billing summary
router.get('/:order_id', async (req, res) => {
  try {
    const order = await Order.findOne({ order_id: req.params.order_id });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const [garments, deliveries, payments, customer] = await Promise.all([
      Garment.find({ order_id: order.order_id }),
      Delivery.find({ order_id: order.order_id }).sort({ delivery_date: 1 }),
      Payment.find({ order_id: order.order_id }),
      Customer.findOne({ customer_id: order.customer_id }),
    ]);
    const deliveryItems = await DeliveryItem.find({
      delivery_id: { $in: deliveries.map((d) => d.delivery_id) },
    });
    const totalEstimated = garments.reduce((s, g) => s + g.quantity * g.price_per_piece, 0);
    const deliveredValue = garments.reduce((s, g) => s + (g.quantity_delivered || 0) * g.price_per_piece, 0);
    const totalPaid = payments.reduce((s, p) => s + p.amount_paid, 0);
    const pendingAmount = deliveredValue - totalPaid;
    res.json({
      order,
      customer: customer || null,
      garments,
      deliveries,
      deliveryItems,
      payments,
      billing: {
        total_estimated_amount: totalEstimated,
        delivered_value: deliveredValue,
        total_paid: totalPaid,
        balance: pendingAmount,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create order with garments
router.post('/', async (req, res) => {
  try {
    const { customer_id, garments: garmentsInput } = req.body; 
    if (!customer_id) return res.status(400).json({ error: 'customer_id required' });
    const customer = await Customer.findOne({ customer_id });
    if (!customer) return res.status(400).json({ error: 'Customer not found' });
    if (!Array.isArray(garmentsInput) || garmentsInput.length === 0) {
      return res.status(400).json({ error: 'garments array required with at least one item' });
    }
    const order_id = genId('O');
    const order = await Order.create({
      order_id,
      customer_id,
      total_estimated_amount: 0,
      status: 'OPEN',
    });
    const garments = [];
    let totalEstimated = 0;
    for (const g of garmentsInput) {
      const garment_id = genId('G');
      const qty = Math.max(1, Number(g.quantity) || 1);
      const price = Math.max(0, Number(g.price_per_piece) || 0);
      totalEstimated += qty * price;
      const garment = await Garment.create({
        garment_id,
        order_id,
        type: g.type || 'other',
        quantity: qty,
        price_per_piece: price,
        status: 'PENDING',
        image: g.image || '',
      });
      garments.push(garment);
    }
    order.total_estimated_amount = totalEstimated;
    await order.save();
    res.status(201).json({ order, garments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
