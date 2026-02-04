import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import './Customers.css';

const CONTACTS_API_SUPPORTED = typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window;
const RECENT_LIMIT = 30;
const SEARCH_DEBOUNCE_MS = 350;

export default function Customers() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', notes: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [importingContacts, setImportingContacts] = useState(false);
  const [importMessage, setImportMessage] = useState(null);

  const loadRecent = useCallback((offset = 0, append = false) => {
    const limit = RECENT_LIMIT;
    return api.customers
      .list({ limit, offset })
      .then((data) => {
        if (append) {
          setList((prev) => (offset === 0 ? data : [...prev, ...data]));
        } else {
          setList(data);
        }
        setHasMore(data.length === limit);
        return data;
      })
      .catch((e) => {
        setError(e.message);
        throw e;
      });
  }, []);

  const loadSearch = useCallback((q) => {
    if (!q.trim()) {
      return loadRecent(0, false).then(() => {});
    }
    return api.customers
      .list({ search: q.trim(), limit: 50 })
      .then((data) => {
        setList(data);
        setHasMore(false);
      })
      .catch((e) => setError(e.message));
  }, [loadRecent]);

  const initialized = useRef(false);

  useEffect(() => {
    setError(null);
    loadRecent(0, false).finally(() => {
      setLoading(false);
      initialized.current = true;
    });
  }, [loadRecent]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      if (initialized.current) {
        setLoading(true);
        setError(null);
        loadRecent(0, false).finally(() => setLoading(false));
      }
      return;
    }
    const t = setTimeout(() => {
      setLoading(true);
      setError(null);
      loadSearch(searchQuery).finally(() => setLoading(false));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchQuery, loadSearch, loadRecent]);

  useEffect(() => {
    if (!importMessage) return;
    const t = setTimeout(() => setImportMessage(null), 5000);
    return () => clearTimeout(t);
  }, [importMessage]);

  const loadMore = () => {
    if (loadingMore || !hasMore || searchQuery.trim()) return;
    setLoadingMore(true);
    loadRecent(list.length, true)
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setError(null);
    api.customers
      .create({ name: form.name.trim(), phone: (form.phone || '').trim(), notes: (form.notes || '').trim() })
      .then(() => {
        setForm({ name: '', phone: '', notes: '' });
        setShowForm(false);
        setError(null);
        loadRecent(0, false);
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
        setForm((f) => ({ ...f, name: name || f.name, phone: phone || f.phone, notes: f.notes }));
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
      await loadRecent(0, false);
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
          <div className="form-row">
            <label>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notes (optional)"
              rows={2}
              className="form-notes-input"
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
                {list.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={3} className="muted">
                      {searchQuery.trim() ? 'No customers match your search.' : 'No customers yet. Add one above.'}
                    </td>
                  </tr>
                ) : (
                  list.map((c) => (
                <tr key={c.customer_id}>
                  <td>
                    <span className="customer-name-cell">
                      {(c.due ?? 0) > 0 && (
                        <span
                          className="customer-due-dot"
                          title={`₹${Number(c.due).toLocaleString('en-IN')} due`}
                          aria-label="Has due amount"
                        />
                      )}
                      <Link to={`/customers/${c.customer_id}`} className="customer-name-link">
                        {c.name}
                      </Link>
                    </span>
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
          {hasMore && !searchQuery.trim() && list.length > 0 && (
            <div className="load-more-wrap">
              <button
                type="button"
                className="btn btn-outline load-more-btn"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading…' : 'Load more customers'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
