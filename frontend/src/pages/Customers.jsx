import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import './Customers.css';

export default function Customers() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [searchQuery, setSearchQuery] = useState('');

  const load = () => api.customers.list().then(setList).catch((e) => setError(e.message));

  const filteredList = searchQuery.trim()
    ? list.filter((c) => {
        const q = searchQuery.trim().toLowerCase();
        const name = (c.name || '').toLowerCase();
        const phone = (c.phone || '').toLowerCase();
        return name.includes(q) || phone.includes(q);
      })
    : list;

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setError(null);
    api.customers
      .create({ name: form.name.trim(), phone: (form.phone || '').trim() })
      .then(() => {
        setForm({ name: '', phone: '' });
        setShowForm(false);
        load();
      })
      .catch((e) => setError(e.message));
  };

  if (loading) return <div className="page-loading">Loading customers…</div>;

  return (
    <div className="customers">
      <div className="page-header">
        <h1 className="page-title">Customers</h1>
        <div className="page-header-actions">
          <Link to="/orders/new" className="btn btn-primary btn-header">
            Add new order
          </Link>
          <button type="button" className="btn btn-outline btn-header" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'Add customer'}
          </button>
        </div>
        <div className="customers-search-wrap">
          <input
            id="customer-search"
            type="search"
            className="customers-search-input"
            placeholder="Search name or phone…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search customers by name or phone"
          />
        </div>
      </div>

      {error && <div className="banner error">{error}</div>}

      {showForm && (
        <form className="card form-card" onSubmit={handleSubmit}>
          <h2>New customer</h2>
          <div className="form-row">
            <label>Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Full name"
              required
            />
          </div>
          <div className="form-row">
            <label>Phone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="Phone (optional)"
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-outline btn-form-action" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-form-action">Add customer</button>
          </div>
        </form>
      )}

      <div className="customers-layout">
        <div className="customers-list-wrap">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th className="customer-actions-header"></th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="muted">No customers yet. Add one above.</td>
                  </tr>
                ) : filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="muted">No customers match your search.</td>
                  </tr>
                ) : (
                  filteredList.map((c) => (
                <tr key={c.customer_id}>
                  <td>
                    <Link to={`/customers/${c.customer_id}`} className="customer-name-link">
                      {c.name}
                    </Link>
                  </td>
                  <td>{c.phone || '—'}</td>
                  <td className="customer-actions">
                    <Link to={`/customers/${c.customer_id}`} className="btn btn-view">
                      View
                    </Link>
                    <Link to={`/customers/${c.customer_id}`} className="btn btn-edit" state={{ edit: true }}>
                      Edit
                    </Link>
                  </td>
                </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
