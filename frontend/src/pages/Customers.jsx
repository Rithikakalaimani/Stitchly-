import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import './Customers.css';

const CONTACTS_API_SUPPORTED = typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window;

export default function Customers() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [importingContacts, setImportingContacts] = useState(false);
  const [importMessage, setImportMessage] = useState(null);

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

  useEffect(() => {
    if (!importMessage) return;
    const t = setTimeout(() => setImportMessage(null), 5000);
    return () => clearTimeout(t);
  }, [importMessage]);

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

  const pickContactForForm = async () => {
    if (!CONTACTS_API_SUPPORTED) {
      setError('Pick from contacts works on mobile (e.g. Android Chrome). Use HTTPS and try on your phone.');
      return;
    }
    setError(null);
    try {
      const props = ['name', 'tel'];
      const contacts = await navigator.contacts.select(props, { multiple: false });
      if (contacts && contacts.length > 0) {
        const name = (contacts[0].name && contacts[0].name[0]) ? contacts[0].name[0].trim() : '';
        const phone = (contacts[0].tel && contacts[0].tel[0]) ? contacts[0].tel[0].trim() : '';
        setForm((f) => ({ ...f, name: name || f.name, phone: phone || f.phone }));
      }
    } catch (err) {
      if (err.name !== 'SecurityError' && err.name !== 'InvalidStateError') {
        setError(err.message || 'Could not open contacts.');
      }
    }
  };

  const importFromContacts = async () => {
    if (!CONTACTS_API_SUPPORTED) {
      setError('Import from contacts is supported on mobile (e.g. Android Chrome). Use HTTPS and try on your phone.');
      return;
    }
    setError(null);
    setImportMessage(null);
    setImportingContacts(true);
    try {
      const props = ['name', 'tel'];
      const opts = { multiple: true };
      const contacts = await navigator.contacts.select(props, opts);
      const existingPhones = new Set((list || []).map((c) => (c.phone || '').replace(/\D/g, '')));
      let added = 0;
      let skipped = 0;
      for (const contact of contacts) {
        const name = (contact.name && contact.name[0]) ? contact.name[0].trim() : '';
        const phone = (contact.tel && contact.tel[0]) ? contact.tel[0].trim() : '';
        if (!name) {
          skipped++;
          continue;
        }
        const phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits && existingPhones.has(phoneDigits)) {
          skipped++;
          continue;
        }
        try {
          await api.customers.create({ name, phone });
          added++;
          if (phoneDigits) existingPhones.add(phoneDigits);
        } catch {
          skipped++;
        }
      }
      await load();
      setImportMessage(added > 0 ? `Added ${added} customer${added !== 1 ? 's' : ''}. They appear in the list below.${skipped > 0 ? ` ${skipped} skipped (already exist or no name).` : ''}` : 'No new customers added. Select contacts with a name.');
    } catch (err) {
      if (err.name !== 'SecurityError' && err.name !== 'InvalidStateError') {
        setError(err.message || 'Could not import contacts.');
      }
    } finally {
      setImportingContacts(false);
    }
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
          {CONTACTS_API_SUPPORTED && (
            <button
              type="button"
              className="btn btn-outline btn-header"
              onClick={importFromContacts}
              disabled={importingContacts}
            >
              {importingContacts ? 'Importing…' : 'Import from contacts'}
            </button>
          )}
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
      {importMessage && <div className="banner success">{importMessage}</div>}

      {showForm && (
        <form className="card form-card" onSubmit={handleSubmit}>
          <h2>New customer</h2>
          {CONTACTS_API_SUPPORTED && (
            <button
              type="button"
              className="btn-pick-contact"
              onClick={pickContactForForm}
              aria-label="Fill name and phone from your contacts"
            >
              Use name & phone from contacts
            </button>
          )}
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
