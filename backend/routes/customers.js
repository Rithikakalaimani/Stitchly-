const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Garment = require('../models/Garment');
const Payment = require('../models/Payment');
const DeliveryItem = require('../models/DeliveryItem');
const { genId } = require('../utils/ids');

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;
const SEARCH_LIMIT = 50;

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, MAX_LIMIT);
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    let query = {};
    if (search.length > 0) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      query = { $or: [{ name: regex }, { phone: regex }] };
    }

    const searchLimit = search.length > 0 ? Math.min(limit, SEARCH_LIMIT) : limit;
    const customers = await Customer.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(searchLimit)
      .lean();

    if (customers.length === 0) {
      return res.json(customers);
    }

    const customerIds = customers.map((c) => c.customer_id);
    const orders = await Order.find({ customer_id: { $in: customerIds } }).lean();
    const orderIds = orders.map((o) => o.order_id);
    if (orderIds.length === 0) {
      customers.forEach((c) => { c.due = 0; });
      return res.json(customers);
    }

    const [garments, payments] = await Promise.all([
      Garment.find({ order_id: { $in: orderIds } }).lean(),
      Payment.find({ order_id: { $in: orderIds } }).lean(),
    ]);
    const estimatedByOrder = garments.reduce((acc, g) => {
      if (!acc[g.order_id]) acc[g.order_id] = 0;
      acc[g.order_id] += g.quantity * g.price_per_piece;
      return acc;
    }, {});
    const paidByOrder = payments.reduce((acc, p) => {
      acc[p.order_id] = (acc[p.order_id] || 0) + p.amount_paid;
      return acc;
    }, {});
    const dueByCustomer = {};
    orders.forEach((o) => {
      const estimated = estimatedByOrder[o.order_id] || o.total_estimated_amount || 0;
      const paid = paidByOrder[o.order_id] || 0;
      const due = Math.max(0, estimated - paid);
      dueByCustomer[o.customer_id] = (dueByCustomer[o.customer_id] || 0) + due;
    });
    customers.forEach((c) => {
      c.due = dueByCustomer[c.customer_id] || 0;
    });

    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, phone, address, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const customer_id = genId('C');
    const customer = await Customer.create({
      customer_id,
      name,
      phone: phone || '',
      address: address || '',
      notes: notes || '',
    });
    res.status(201).json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// All orders, garments, payments for this customer (one page view)
router.get('/:customer_id/overview', async (req, res) => {
  try {
    const { customer_id } = req.params;
    const customer = await Customer.findOne({ customer_id });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    const orders = await Order.find({ customer_id }).sort({ order_date: -1 });
    const orderIds = orders.map((o) => o.order_id);
    const [garments, payments] = await Promise.all([
      Garment.find({ order_id: { $in: orderIds } }).sort({ createdAt: 1 }),
      Payment.find({ order_id: { $in: orderIds } }),
    ]);
    const orderMap = Object.fromEntries(orders.map((o) => [o.order_id, o]));
    const paidByOrder = payments.reduce((acc, p) => {
      acc[p.order_id] = (acc[p.order_id] || 0) + p.amount_paid;
      return acc;
    }, {});
    const garmentByOrder = garments.reduce((acc, g) => {
      if (!acc[g.order_id]) acc[g.order_id] = [];
      acc[g.order_id].push(g);
      return acc;
    }, {});
    let totalEstimated = 0;
    let totalDeliveredValue = 0;
    const orderSummaries = orders.map((o) => {
      const gs = garmentByOrder[o.order_id] || [];
      const estimated = gs.reduce((s, g) => s + g.quantity * g.price_per_piece, 0);
      const deliveredVal = gs.reduce((s, g) => s + (g.quantity_delivered || 0) * g.price_per_piece, 0);
      const paid = paidByOrder[o.order_id] || 0;
      totalEstimated += estimated;
      totalDeliveredValue += deliveredVal;
      return {
        order_id: o.order_id,
        order_date: o.order_date,
        status: o.status,
        total_estimated_amount: estimated,
        delivered_value: deliveredVal,
        total_paid: paid,
        balance: deliveredVal - paid,
        due: Math.max(0, estimated - paid),
      };
    });
    const totalPaid = Object.values(paidByOrder).reduce((s, n) => s + n, 0);
    res.json({
      customer,
      orders: orderSummaries,
      garments,
      payments,
      summary: {
        total_estimated_amount: totalEstimated,
        total_delivered_value: totalDeliveredValue,
        total_paid: totalPaid,
        remaining: Math.max(0, totalEstimated - totalPaid),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear all order details (delete all garments) for this customer
router.delete('/:customer_id/garments', async (req, res) => {
  try {
    const { customer_id } = req.params;
    const customer = await Customer.findOne({ customer_id });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    const orders = await Order.find({ customer_id });
    const orderIds = orders.map((o) => o.order_id);
    const garments = await Garment.find({ order_id: { $in: orderIds } });
    const garmentIds = garments.map((g) => g.garment_id);
    await DeliveryItem.deleteMany({ garment_id: { $in: garmentIds } });
    const result = await Garment.deleteMany({ order_id: { $in: orderIds } });
    await Order.updateMany(
      { order_id: { $in: orderIds } },
      { $set: { total_estimated_amount: 0 } }
    );
    res.json({ deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:customer_id', async (req, res) => {
  try {
    const customer = await Customer.findOne({ customer_id: req.params.customer_id });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:customer_id', async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { customer_id: req.params.customer_id },
      { $set: req.body },
      { new: true }
    );
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:customer_id', async (req, res) => {
  try {
    const { customer_id } = req.params;
    const customer = await Customer.findOne({ customer_id });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    const orders = await Order.find({ customer_id });
    const orderIds = orders.map((o) => o.order_id);
    const garments = await Garment.find({ order_id: { $in: orderIds } });
    const garmentIds = garments.map((g) => g.garment_id);
    await DeliveryItem.deleteMany({ garment_id: { $in: garmentIds } });
    await Garment.deleteMany({ order_id: { $in: orderIds } });
    await Payment.deleteMany({ order_id: { $in: orderIds } });
    await Order.deleteMany({ customer_id });
    await Customer.deleteOne({ customer_id });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
