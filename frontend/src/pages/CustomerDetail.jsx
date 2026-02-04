import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { IoClose } from 'react-icons/io5';
import { api } from '../api';
import './CustomerDetail.css';

function formatMoney(n) {
  if (n == null || isNaN(n)) return '0';
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function CustomerDetail() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [updatingGarment, setUpdatingGarment] = useState(null);
  const [deletingGarment, setDeletingGarment] = useState(null);
  const [successMessage, setSuccessMessage] = useState(location.state?.orderCreated ? 'Order added successfully.' : null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentOrderId, setPaymentOrderId] = useState('');
  const [editing, setEditing] = useState(!!location.state?.edit);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [zoomedImage, setZoomedImage] = useState(null);

  const load = () => api.customers.getOverview(customerId).then(setData).catch((e) => setError(e.message));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [customerId]);

  useEffect(() => {
    if (data?.customer) {
      setEditName(data.customer.name || '');
      setEditPhone(data.customer.phone || '');
    }
  }, [data?.customer]);

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(t);
  }, [successMessage]);

  const updateGarmentStatus = (garmentId, status) => {
    setActionError(null);
    setUpdatingGarment(garmentId);
    api.garments
      .update(garmentId, { status })
      .then(() => load())
      .catch((e) => setActionError(e.message))
      .finally(() => setUpdatingGarment(null));
  };

  const removeGarment = (garmentId) => {
    if (!window.confirm('Remove this garment from the order? This cannot be undone.')) return;
    setActionError(null);
    setDeletingGarment(garmentId);
    api.garments
      .delete(garmentId)
      .then(() => load())
      .catch((e) => setActionError(e.message))
      .finally(() => setDeletingGarment(null));
  };

  const startEdit = () => {
    setEditName(customer.name || '');
    setEditPhone(customer.phone || '');
    setEditing(true);
    setActionError(null);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditName(customer.name || '');
    setEditPhone(customer.phone || '');
    setActionError(null);
  };

  const saveCustomer = (e) => {
    e.preventDefault();
    const name = editName.trim();
    if (!name) {
      setActionError('Name is required');
      return;
    }
    setActionError(null);
    setSaving(true);
    api.customers
      .update(customerId, { name, phone: (editPhone || '').trim() })
      .then(() => {
        setEditing(false);
        load();
      })
      .catch((e) => setActionError(e.message))
      .finally(() => setSaving(false));
  };

  const submitPayment = (e) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      setActionError('Enter a valid amount');
      return;
    }
    if (paymentOrderOptions.length === 0) {
      setActionError('No order to apply payment to');
      return;
    }
    const applyToBalance = paymentOrderId === '__balance__';
    const orderId = paymentOrderId && paymentOrderId !== '__balance__' ? paymentOrderId : (paymentOrderOptions.length === 1 && !applyToBalance ? paymentOrderOptions[0].order_id : null);
    if (!applyToBalance && !orderId) {
      setActionError('Select where to apply payment');
      return;
    }
    setActionError(null);
    const payload = { amount_paid: amount, mode: paymentMode };
    const promise = applyToBalance
      ? api.payments.applyToBalance({ customer_id: customerId, ...payload })
      : api.payments.create({ order_id: orderId, ...payload });
    promise
      .then(() => {
        setPaymentAmount('');
        setPaymentOrderId('');
        load();
      })
      .catch((e) => setActionError(e.message));
  };

  if (loading) return <div className="page-loading">Loading…</div>;
  if (error || !data) return <div className="page-error">{error || 'Customer not found'}</div>;

  const { customer, orders = [], garments = [], summary = {} } = data;
  const orderStatusMap = Object.fromEntries(orders.map((o) => [o.order_id, o.status]));
  const totalAmount = summary.total_estimated_amount ?? 0;
  const paidAmount = summary.total_paid ?? 0;
  const remainingAmount = Math.max(0, summary.remaining ?? 0);
  const openOrdersWithDue = orders.filter((o) => o.status === 'OPEN' && (o.due ?? 0) > 0);
  const paymentOrderOptions = openOrdersWithDue.length > 0 ? openOrdersWithDue : orders.filter((o) => o.status === 'OPEN');
  const orderTypeLabels = {};
  orders.forEach((o) => {
    const types = [...new Set(garments.filter((g) => g.order_id === o.order_id).map((g) => g.type))];
    orderTypeLabels[o.order_id] = types.length ? types.join(', ') : 'Order';
  });

  return (
    <div className="customer-detail">
      <div className="page-header">
        <div className="page-header-left">
          <Link
            to="/orders/new"
            className="btn btn-primary btn-add-order"
            state={{ customerId: customer.customer_id }}
          >
            Add new order
          </Link>
        </div>
        <div className="page-header-right">
          <div className="card customer-details-card">
            {editing ? (
              <form className="customer-edit-form" onSubmit={saveCustomer}>
                <div className="customer-edit-fields">
                  <input
                    type="text"
                    className="customer-edit-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Name"
                    required
                    autoFocus
                  />
                  <input
                    type="text"
                    className="customer-edit-phone"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Phone"
                  />
                </div>
                <div className="customer-edit-actions">
                  <button type="button" className="btn btn-outline btn-sm" onClick={cancelEdit} disabled={saving}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h1 className="page-title">{customer.name}</h1>
                <p className="page-header-phone">{customer.phone ? customer.phone : 'Phone —'}</p>
                <button type="button" className="btn btn-edit-inline" onClick={startEdit}>
                  Edit
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      {successMessage && <div className="banner success">{successMessage}</div>}
      {actionError && <div className="banner error">{actionError}</div>}

      <div className="customer-detail-main">
        <section className="card billing-card">
          <h2>Amounts</h2>
          <div className="billing-summary">
            <div className="billing-row">
              <span className="billing-label">Total</span>
              <span className="billing-value">₹{formatMoney(totalAmount)}</span>
            </div>
            <div className="billing-row paid">
              <span className="billing-label">Paid</span>
              <span className="billing-value">₹{formatMoney(paidAmount)}</span>
            </div>
            <div className="billing-row remaining">
              <span className="billing-label">Due</span>
              <span className="billing-value">₹{formatMoney(remainingAmount)}</span>
            </div>
          </div>
        </section>

        <section className="card">
          <h2>Order details</h2>
          {garments.length === 0 ? (
            <p className="muted">No garments yet. Add a new order to get started.</p>
          ) : (
            <ul className="garment-checklist">
              {garments.map((g) => {
                const status = g.status || 'PENDING';
                const isOrderOpen = orderStatusMap[g.order_id] === 'OPEN';
                const busy = updatingGarment === g.garment_id;
                const isDeleting = deletingGarment === g.garment_id;
                return (
                  <li key={g.garment_id} className="garment-checklist-item">
                    <span className="garment-checklist-photo-wrap">
                      <span
                        className={`garment-checklist-photo ${g.image ? 'garment-checklist-photo-clickable' : ''}`}
                        role={g.image ? 'button' : undefined}
                        tabIndex={g.image ? 0 : undefined}
                        onClick={g.image ? () => setZoomedImage(g.image) : undefined}
                        onKeyDown={g.image ? (e) => e.key === 'Enter' && setZoomedImage(g.image) : undefined}
                        aria-label={g.image ? 'View full size' : undefined}
                      >
                        {g.image ? (
                          <img src={g.image} alt="" />
                        ) : (
                          <span className="no-photo">—</span>
                        )}
                      </span>
                      <span className={`garment-status-dot garment-status-dot-${status.toLowerCase()}`} aria-hidden="true" />
                    </span>
                    <span className="garment-checklist-type">{g.type}</span>
                    <span className="garment-checklist-price">
                      ₹{formatMoney(g.price_per_piece)}{g.quantity > 1 ? ` × ${g.quantity}` : ''}
                    </span>
                    <span className="garment-checklist-status">
                      {isOrderOpen ? (
                        <select
                          className="status-select"
                          value={status}
                          onChange={(e) => updateGarmentStatus(g.garment_id, e.target.value)}
                          disabled={busy}
                          aria-label={`${g.type} status`}
                        >
                          <option value="PENDING">pending</option>
                          <option value="STITCHED">stitched</option>
                          <option value="DELIVERED">delivered</option>
                        </select>
                      ) : (
                        <span className={`badge badge-${status.toLowerCase()}`}>{status.toLowerCase()}</span>
                      )}
                    </span>
                    <span className="garment-checklist-remove">
                      <button
                        type="button"
                        className="btn-remove-garment"
                        onClick={() => removeGarment(g.garment_id)}
                        disabled={isDeleting}
                        aria-label={`Remove ${g.type}`}
                      >
                        {isDeleting ? <span className="btn-remove-text">…</span> : <IoClose className="btn-remove-icon" aria-hidden />}
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card payment-card">
          <h2>Payment</h2>
          <p className="section-desc">Add payment.</p>
          <form className="global-payment-form" onSubmit={submitPayment}>
            <div className="payment-fields">
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
              {paymentOrderOptions.length >= 1 && (
                <>
                  <select
                    id="payment-order-type"
                    value={paymentOrderId}
                    onChange={(e) => setPaymentOrderId(e.target.value)}
                    aria-label="Where to apply payment"
                  >
                    <option value="">Select…</option>
                    <option value="__balance__">Balance (any order)</option>
                    {paymentOrderOptions.map((o) => (
                      <option key={o.order_id} value={o.order_id}>
                        {orderTypeLabels[o.order_id] || 'Order'}
                      </option>
                    ))}
                  </select>
                </>
              )}
              <button type="submit" className="btn btn-primary" disabled={paymentOrderOptions.length === 0}>
                Add payment
              </button>
            </div>
          </form>
        </section>
      </div>

      {zoomedImage && (
        <div
          className="photo-zoom-overlay"
          onClick={() => setZoomedImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Photo zoom view"
        >
          <div className="photo-zoom-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="photo-zoom-close"
              onClick={() => setZoomedImage(null)}
              aria-label="Close"
            >
              <IoClose className="photo-zoom-close-icon" aria-hidden />
            </button>
            <img src={zoomedImage} alt="Enlarged view" className="photo-zoom-image" />
          </div>
        </div>
      )}
    </div>
  );
}
