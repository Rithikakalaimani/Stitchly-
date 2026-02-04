import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import './Dashboard.css';

const PERIOD_OPTIONS = [
  { value: 'day', label: 'Today' },
  { value: '1week', label: '1 week' },
  { value: '2weeks', label: '2 weeks' },
  { value: '1month', label: '1 month' },
  { value: '3months', label: '3 months' },
  { value: '6months', label: '6 months' },
  { value: '1year', label: '1 year' },
  { value: 'all', label: 'All time' },
];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('all');

  useEffect(() => {
    setLoading(true);
    api.dashboard
      .get({ period })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [period]);

  if (loading && !data) return <div className="page-loading">Loading dashboard…</div>;
  if (error && !data) return <div className="page-error">Error: {error}</div>;

  const d = data || {};
  const pendingOrdersCount = d.pending_orders_count ?? 0;
  const totalPendingMoney = d.total_pending_money ?? 0;
  const totalEstimatedMoney = d.total_estimated_money ?? 0;
  const totalPaid = d.total_paid ?? 0;
  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === (d.period || period))?.label || 'All time';
  const pendingOrders = d.pending_orders || [];

  return (
    <div className="dashboard">
      <h1 className="page-title">Dashboard</h1>

      <section className="summary-cards">
        <div className="card">
          <span className="card-label">Pending orders</span>
          <span className="card-value">{pendingOrdersCount}</span>
        </div>
        <div className="card">
          <span className="card-label">Total pending money</span>
          <span className="card-value">₹{formatMoney(totalPendingMoney)}</span>
        </div>
        <div className="card">
          <span className="card-label">Total estimated money</span>
          <span className="card-value">₹{formatMoney(totalEstimatedMoney)}</span>
        </div>
        <div className="card card-paid">
          <div className="card-paid-header">
            <span className="card-label">Total paid</span>
            <select
              className="period-select"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              aria-label="Filter by period"
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <span className="card-value success">₹{formatMoney(totalPaid)}</span>
        </div>
      </section>

      <section className="dashboard-section pending-orders-section">
        <h2 className="dashboard-section-title">Pending orders</h2>
        {pendingOrders.length === 0 ? (
          <p className="dashboard-muted">No pending orders.</p>
        ) : (
          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Type of dress</th>
                  <th>Price</th>
                  <th>Order status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pendingOrders.map((o) => (
                  <tr key={o.order_id}>
                    <td>
                      <Link to={`/customers/${o.customer_id}`} className="dashboard-customer-link">
                        {o.customer_name}
                      </Link>
                    </td>
                    <td>{o.type_of_dress}</td>
                    <td>₹{formatMoney(o.price)}</td>
                    <td>
                      <span className="dashboard-status-badge dashboard-status-open">{o.order_status}</span>
                    </td>
                    <td>
                      <Link to={`/customers/${o.customer_id}`} className="btn btn-sm">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function formatMoney(n) {
  if (n == null || isNaN(n)) return '0';
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
