const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Garment = require('../models/Garment');
const Payment = require('../models/Payment');
const Customer = require('../models/Customer');

function getDateRange(period) {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let start = new Date(end);
  switch (period) {
    case 'day':
      start.setHours(0, 0, 0, 0);
      break;
    case '1week':
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case '2weeks':
      start.setDate(start.getDate() - 14);
      start.setHours(0, 0, 0, 0);
      break;
    case '1month':
      start.setMonth(start.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
      break;
    case '3months':
      start.setMonth(start.getMonth() - 3);
      start.setHours(0, 0, 0, 0);
      break;
    case '6months':
      start.setMonth(start.getMonth() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    case '1year':
      start.setFullYear(start.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      return null;
  }
  return { start, end };
}

// Dashboard: pending orders, total pending money, total estimated, total paid (with period filter)
router.get('/', async (req, res) => {
  try {
    const period = req.query.period || 'all';
    const openOrders = await Order.find({ status: 'OPEN' }).sort({ order_date: -1 });
    const allOrders = await Order.find();
    const orderIds = allOrders.map((o) => o.order_id);
    const garments = await Garment.find({ order_id: { $in: orderIds } });
    const estimatedByOrder = garments.reduce((acc, g) => {
      if (!acc[g.order_id]) acc[g.order_id] = 0;
      acc[g.order_id] += g.quantity * g.price_per_piece;
      return acc;
    }, {});
    const garmentTypesByOrder = garments.reduce((acc, g) => {
      if (!acc[g.order_id]) acc[g.order_id] = [];
      acc[g.order_id].push(g.type);
      return acc;
    }, {});
    const total_estimated_money = allOrders.reduce((s, o) => s + (estimatedByOrder[o.order_id] || o.total_estimated_amount || 0), 0);
    const allPayments = await Payment.find();
    const total_paid_all_time = allPayments.reduce((s, p) => s + p.amount_paid, 0);
    const total_pending_money = Math.max(0, total_estimated_money - total_paid_all_time);

    const customerIds = [...new Set(openOrders.map((o) => o.customer_id))];
    const customers = await Customer.find({ customer_id: { $in: customerIds } });
    const customerMap = Object.fromEntries(customers.map((c) => [c.customer_id, c]));

    const pending_orders = openOrders.map((o) => {
      const types = garmentTypesByOrder[o.order_id] || [];
      const typeOfDress = [...new Set(types)].join(', ') || '—';
      return {
        order_id: o.order_id,
        customer_id: o.customer_id,
        customer_name: (customerMap[o.customer_id] && customerMap[o.customer_id].name) || o.customer_id,
        type_of_dress: typeOfDress,
        price: estimatedByOrder[o.order_id] || o.total_estimated_amount || 0,
        order_status: o.status,
      };
    });

    let total_paid = total_paid_all_time;
    if (period !== 'all') {
      const range = getDateRange(period);
      if (range) {
        const paidInPeriod = await Payment.aggregate([
          {
            $match: {
              payment_date: { $gte: range.start, $lte: range.end },
            },
          },
          { $group: { _id: null, sum: { $sum: '$amount_paid' } } },
        ]);
        total_paid = paidInPeriod[0]?.sum ?? 0;
      }
    }

    res.json({
      pending_orders_count: openOrders.length,
      pending_orders,
      total_pending_money,
      total_estimated_money,
      total_paid,
      period,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Analytics: customer work and value
router.get('/analytics', async (req, res) => {
  try {
    const orders = await Order.find();
    const garments = await Garment.find({ order_id: { $in: orders.map((o) => o.order_id) } });
    const payments = await Payment.find({ order_id: { $in: orders.map((o) => o.order_id) } });
    const customerIds = [...new Set(orders.map((o) => o.customer_id))];
    const customers = await Customer.find({ customer_id: { $in: customerIds } });
    const customerMap = Object.fromEntries(customers.map((c) => [c.customer_id, c]));
    const orderMap = Object.fromEntries(orders.map((o) => [o.order_id, o]));
    const garmentByOrder = garments.reduce((acc, g) => {
      if (!acc[g.order_id]) acc[g.order_id] = [];
      acc[g.order_id].push(g);
      return acc;
    }, {});
    const paidByOrder = payments.reduce((acc, p) => {
      acc[p.order_id] = (acc[p.order_id] || 0) + p.amount_paid;
      return acc;
    }, {});
    const byCustomer = {};
    for (const o of orders) {
      const cid = o.customer_id;
      if (!byCustomer[cid]) {
        byCustomer[cid] = {
          customer_id: cid,
          name: (customerMap[cid] && customerMap[cid].name) || '',
          order_count: 0,
          total_estimated: 0,
          total_delivered_value: 0,
          total_paid: 0,
          pending_value: 0,
          balance: 0,
        };
      }
      byCustomer[cid].order_count += 1;
      const gs = garmentByOrder[o.order_id] || [];
      const estimated = gs.reduce((s, g) => s + g.quantity * g.price_per_piece, 0);
      const deliveredVal = gs.reduce((s, g) => s + (g.quantity_delivered || 0) * g.price_per_piece, 0);
      const paid = paidByOrder[o.order_id] || 0;
      byCustomer[cid].total_estimated += estimated;
      byCustomer[cid].total_delivered_value += deliveredVal;
      byCustomer[cid].total_paid += paid;
      byCustomer[cid].pending_value += estimated - deliveredVal;
      byCustomer[cid].balance += deliveredVal - paid;
    }
    res.json({ by_customer: Object.values(byCustomer) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
