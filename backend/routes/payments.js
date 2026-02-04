const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const Garment = require('../models/Garment');
const { genId } = require('../utils/ids');

router.post('/', async (req, res) => {
  try {
    const { order_id, amount_paid, mode } = req.body;
    if (!order_id || amount_paid == null || !mode) {
      return res.status(400).json({ error: 'order_id, amount_paid and mode required' });
    }
    const order = await Order.findOne({ order_id });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const payment_id = genId('P');
    const payment = await Payment.create({
      payment_id,
      order_id,
      amount_paid: Number(amount_paid),
      mode: mode === 'UPI' ? 'UPI' : 'cash',
    });
    res.status(201).json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Apply payment to customer balance (any order) – allocates FIFO across open orders with due
router.post('/apply-to-balance', async (req, res) => {
  try {
    const { customer_id, amount_paid, mode } = req.body;
    if (!customer_id || amount_paid == null || !mode) {
      return res.status(400).json({ error: 'customer_id, amount_paid and mode required' });
    }
    const amount = Number(amount_paid);
    if (amount <= 0) return res.status(400).json({ error: 'amount_paid must be positive' });

    const orders = await Order.find({ customer_id, status: 'OPEN' }).sort({ order_date: 1 });
    if (orders.length === 0) return res.status(400).json({ error: 'No open orders for this customer' });

    const orderIds = orders.map((o) => o.order_id);
    const [garments, payments] = await Promise.all([
      Garment.find({ order_id: { $in: orderIds } }),
      Payment.find({ order_id: { $in: orderIds } }),
    ]);

    const paidByOrder = payments.reduce((acc, p) => {
      acc[p.order_id] = (acc[p.order_id] || 0) + p.amount_paid;
      return acc;
    }, {});
    const estimatedByOrder = garments.reduce((acc, g) => {
      acc[g.order_id] = (acc[g.order_id] || 0) + g.quantity * g.price_per_piece;
      return acc;
    }, {});

    const ordersWithDue = orders
      .map((o) => ({
        order_id: o.order_id,
        due: Math.max(0, (estimatedByOrder[o.order_id] || 0) - (paidByOrder[o.order_id] || 0)),
      }))
      .filter((o) => o.due > 0);

    if (ordersWithDue.length === 0) return res.status(400).json({ error: 'No remaining balance on open orders' });

    const created = [];
    let remaining = amount;
    const paymentMode = mode === 'UPI' ? 'UPI' : 'cash';

    for (const { order_id, due } of ordersWithDue) {
      if (remaining <= 0) break;
      const apply = Math.min(remaining, due);
      const payment_id = genId('P');
      const payment = await Payment.create({
        payment_id,
        order_id,
        amount_paid: apply,
        mode: paymentMode,
      });
      created.push(payment);
      remaining -= apply;
    }

    res.status(201).json({ created, total_applied: amount - remaining });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.order_id) filter.order_id = req.query.order_id;
    const payments = await Payment.find(filter).sort({ payment_date: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
