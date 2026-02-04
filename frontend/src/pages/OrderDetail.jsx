import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import './OrderDetail.css';

export default function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [actionError, setActionError] = useState(null);
  const [updatingGarment, setUpdatingGarment] = useState(null);

  const load = () => api.orders.get(orderId).then(setData).catch((e) => setError(e.message));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [orderId]);

  const updateGarmentStatus = (garmentId, status) => {
    setActionError(null);
    setUpdatingGarment(garmentId);
    api.garments
      .update(garmentId, { status })
      .then(() => load())
      .catch((e) => setActionError(e.message))
      .finally(() => setUpdatingGarment(null));
  };

  const submitPayment = (e) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      setActionError('Enter a valid amount');
      return;
    }
    setActionError(null);
    api.payments
      .create({ order_id: orderId, amount_paid: amount, mode: paymentMode })
      .then(() => {
        setPaymentAmount('');
        load();
      })
      .catch((e) => setActionError(e.message));
  };

  if (loading) return <div className="page-loading">Loading order…</div>;
  if (error || !data) return <div className="page-error">{error || 'Order not found'}</div>;

  const { order, customer, garments = [], deliveries = [], payments = [], billing = {} } = data;
  const isOrderOpen = order.status === 'OPEN';

  const totalAmount = billing.total_estimated_amount ?? 0;
  const paidAmount = billing.total_paid ?? 0;
  const remainingAmount = Math.max(0, (billing.delivered_value ?? 0) - paidAmount);

  return (
    <div className="order-detail">
      <div className="page-header">
        <button type="button" className="btn btn-ghost back" onClick={() => navigate('/orders')}>
          ← Orders
        </button>
        <h1 className="page-title">Order {order.order_id}</h1>
      </div>
      {actionError && <div className="banner error">{actionError}</div>}

      <div className="order-detail-layout">
        <div className="order-detail-main">
          <section className="card info-card">
            <div className="info-grid">
              <div>
                <span className="label">Customer</span>
                <p className="value">
                  {customer ? (
                    <>
                      <Link to={`/customers/${order.customer_id}`} className="customer-detail-link">
                        {customer.name}
                      </Link>
                      {customer.phone ? ` — ${customer.phone}` : ''}
                      {customer?.address && <span className="muted"> · {customer.address}</span>}
                    </>
                  ) : (
                    order.customer_id
                  )}
                </p>
              </div>
              <div>
                <span className="label">Order date</span>
                <p className="value">{new Date(order.order_date).toLocaleDateString('en-IN')}</p>
              </div>
              <div>
                <span className="label">Status</span>
                <p className="value">
                  <span className={`badge badge-${order.status === 'COMPLETED' ? 'completed' : 'open'}`}>
                    {order.status}
                  </span>
                </p>
              </div>
            </div>
          </section>

          <section className="card billing-card">
            <h2>Amounts</h2>
            <div className="billing-summary">
              <div className="billing-row">
                <span className="billing-label">Total amount</span>
                <span className="billing-value">₹{formatMoney(totalAmount)}</span>
              </div>
              <div className="billing-row paid">
                <span className="billing-label">Paid amount</span>
                <span className="billing-value">₹{formatMoney(paidAmount)}</span>
              </div>
              <div className="billing-row remaining">
                <span className="billing-label">Remaining (due)</span>
                <span className="billing-value">₹{formatMoney(remainingAmount)}</span>
              </div>
            </div>
            <p className="billing-note">Delivered value: ₹{formatMoney(billing.delivered_value)} — balance is based on what’s been delivered.</p>
          </section>

          <section className="card">
        <h2>Garments</h2>
        <div className="table-wrap">
          <table className="data-table garments-table">
            <thead>
              <tr>
                <th className="th-photo">Photo</th>
                <th>Type</th>
                <th>Qty</th>
                <th>Delivered</th>
                <th>Price/piece</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {garments.map((g) => (
                <tr key={g.garment_id}>
                  <td className="td-photo">
                    {g.image ? (
                      <img src={g.image} alt="" className="garment-thumb" />
                    ) : (
                      <span className="no-photo">—</span>
                    )}
                  </td>
                  <td>{g.type}</td>
                  <td>{g.quantity}</td>
                  <td>{g.quantity_delivered || 0}</td>
                  <td>₹{formatMoney(g.price_per_piece)}</td>
                  <td><span className={`badge badge-${g.status.toLowerCase()}`}>{g.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          </section>

          <section className="card">
            <h2>Record payment</h2>
        <form className="payment-form" onSubmit={submitPayment}>
          <div className="form-row inline">
            <input
              type="number"
              min={0}
              step={0.01}
              placeholder="Amount"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
            />
            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="UPI">UPI</option>
            </select>
            <button type="submit" className="btn btn-primary">Add payment</button>
          </div>
        </form>
          </section>

          {payments.length > 0 && (
        <section className="card">
          <h2>Payments</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Mode</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.payment_id}>
                    <td>{new Date(p.payment_date).toLocaleDateString('en-IN')}</td>
                    <td>₹{formatMoney(p.amount_paid)}</td>
                    <td>{p.mode}</td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </section>
          )}
        </div>

        <aside className="order-checklist card">
          <h2>Checklist</h2>
          <div className="checklist-summary">
            <div className="checklist-summary-row">
              <span>Total</span>
              <span>₹{formatMoney(totalAmount)}</span>
            </div>
            <div className="checklist-summary-row paid">
              <span>Paid</span>
              <span>₹{formatMoney(paidAmount)}</span>
            </div>
            <div className="checklist-summary-row remaining">
              <span>Remaining</span>
              <span>₹{formatMoney(remainingAmount)}</span>
            </div>
          </div>
          <ul className="checklist">
            {garments.map((g) => {
              const status = g.status || 'PENDING';
              const isDelivered = status === 'DELIVERED';
              const isStitched = status === 'STITCHED' || isDelivered;
              const busy = updatingGarment === g.garment_id;
              return (
                <li key={g.garment_id} className={`checklist-item ${status.toLowerCase()}`}>
                  <span className="checklist-icon" aria-hidden>
                    {isDelivered ? '✓' : isStitched ? '•' : '○'}
                  </span>
                  <span className="checklist-thumb">
                    {g.image ? (
                      <img src={g.image} alt="" />
                    ) : (
                      <span className="no-thumb">—</span>
                    )}
                  </span>
                  <span className="checklist-info">
                    <span className="checklist-type">{g.type}</span>
                    {g.quantity > 1 && <span className="checklist-qty">×{g.quantity}</span>}
                    {isOrderOpen && (
                      <select
                        className="checklist-status-select"
                        value={status}
                        onChange={(e) => updateGarmentStatus(g.garment_id, e.target.value)}
                        disabled={busy}
                        aria-label={`${g.type} status`}
                      >
                        <option value="PENDING">Pending</option>
                        <option value="STITCHED">Stitching completed</option>
                        <option value="DELIVERED">Delivered</option>
                      </select>
                    )}
                    {!isOrderOpen && <span className="checklist-status">{status}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </div>
  );
}

function formatMoney(n) {
  if (n == null || isNaN(n)) return '0';
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
