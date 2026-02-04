import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import './Orders.css';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('OPEN'); // OPEN | COMPLETED | all

  useEffect(() => {
    Promise.all([
      api.orders.list(filter === 'all' ? {} : { status: filter }),
      api.customers.list(),
    ])
      .then(([o, c]) => {
        setOrders(o);
        setCustomers(c);
      })
      .finally(() => setLoading(false));
  }, [filter]);

  const customerMap = Object.fromEntries(customers.map((c) => [c.customer_id, c]));

  if (loading) return <div className="page-loading">Loading orders…</div>;

  return (
    <div className="orders-page">
      <div className="page-header">
        <h1 className="page-title">Orders</h1>
        <Link to="/orders/new" className="btn btn-primary">New order</Link>
      </div>

      <div className="filter-bar">
        <button
          className={filter === 'OPEN' ? 'tab active' : 'tab'}
          onClick={() => setFilter('OPEN')}
        >
          Open
        </button>
        <button
          className={filter === 'COMPLETED' ? 'tab active' : 'tab'}
          onClick={() => setFilter('COMPLETED')}
        >
          Completed
        </button>
        <button
          className={filter === 'all' ? 'tab active' : 'tab'}
          onClick={() => setFilter('all')}
        >
          All
        </button>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Estimated</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">No orders found.</td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.order_id}>
                  <td><code>{o.order_id}</code></td>
                  <td>
                  {customerMap[o.customer_id] ? (
                    <Link to={`/customers/${o.customer_id}`}>{customerMap[o.customer_id].name}</Link>
                  ) : (
                    o.customer_id
                  )}
                </td>
                  <td>{new Date(o.order_date).toLocaleDateString('en-IN')}</td>
                  <td>₹{Number(o.total_estimated_amount || 0).toLocaleString('en-IN')}</td>
                  <td>
                    <span className={`badge badge-${o.status === 'COMPLETED' ? 'completed' : 'open'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td>
                    <Link to={`/orders/${o.order_id}`} className="btn btn-sm">View</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
