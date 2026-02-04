import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api';
import './NewOrder.css';

const MAX_IMAGE_SIZE = 800;
const JPEG_QUALITY = 0.7;

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
        if (width > height) {
          height = Math.round((height * MAX_IMAGE_SIZE) / width);
          width = MAX_IMAGE_SIZE;
        } else {
          width = Math.round((width * MAX_IMAGE_SIZE) / height);
          height = MAX_IMAGE_SIZE;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        },
        'image/jpeg',
        JPEG_QUALITY
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Invalid image'));
    };
    img.src = url;
  });
}

export default function NewOrder() {
  const navigate = useNavigate();
  const location = useLocation();
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState(location.state?.customerId || '');
  const [items, setItems] = useState([]); // { image, type, price_per_piece }
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.customers.list().then(setCustomers).finally(() => setLoading(false));
  }, []);

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    e.target.value = '';
    try {
      const dataUrl = await resizeImage(file);
      setItems((prev) => [...prev, { image: dataUrl, type: '', price_per_piece: '' }]);
    } catch (err) {
      setError('Could not process image. Try another.');
    }
  };

  const updateItem = (index, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customerId) {
      setError('Select a customer');
      return;
    }
    const garments = items
      .map((item) => ({
        type: (item.type || 'garment').trim() || 'garment',
        quantity: 1,
        price_per_piece: Math.max(0, parseFloat(item.price_per_piece) || 0),
        image: item.image || undefined,
      }))
      .filter((g) => g.type);
    if (garments.length === 0) {
      setError('Add at least one garment (photo + type + price)');
      return;
    }
    setError(null);
    setSubmitting(true);
    api.orders
      .create({ customer_id: customerId, garments })
      .then(() => {
        navigate(`/customers/${customerId}`, { state: { orderCreated: true } });
      })
      .catch((e) => {
        setError(e.message);
        setSubmitting(false);
      });
  };

  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div className="new-order">
      <h1 className="page-title">New order</h1>
      <p className="new-order-hint">Add garments by taking a photo, then name the type and set the price.</p>
      {error && <div className="banner error">{error}</div>}

      <form className="new-order-form" onSubmit={handleSubmit}>
        <div className="form-row customer-row">
          <label>Customer *</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            required
          >
            <option value="">Select customer</option>
            {customers.map((c) => (
              <option key={c.customer_id} value={c.customer_id}>
                {c.name}{c.phone ? ` — ${c.phone}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="garments-section">
          <div className="garments-section-header">
            <h2>Garments</h2>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="photo-input-hidden"
              onChange={handlePhotoSelect}
              aria-label="Take photo"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="photo-input-hidden"
              onChange={handlePhotoSelect}
              aria-label="Add photo from gallery"
            />
            <div className="photo-buttons">
              <button
                type="button"
                className="btn btn-take-photo"
                onClick={() => cameraInputRef.current?.click()}
              >
                Take photo
              </button>
              <button
                type="button"
                className="btn btn-add-photo"
                onClick={() => galleryInputRef.current?.click()}
              >
                Add photo
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="empty-garments">
              <p>Use <strong>Take photo</strong> to capture with camera, or <strong>Add photo</strong> to choose from gallery. Then name the type and set the price.</p>
            </div>
          ) : (
            <div className="garment-cards">
              {items.map((item, i) => (
                <div key={i} className="garment-card card">
                  <div className="garment-card-image">
                    {item.image ? (
                      <img src={item.image} alt="" />
                    ) : (
                      <span className="no-image">No image</span>
                    )}
                  </div>
                  <div className="garment-card-fields">
                    <input
                      type="text"
                      placeholder="Type (e.g. blouse, shirt)"
                      value={item.type}
                      onChange={(e) => updateItem(i, 'type', e.target.value)}
                      className="garment-type-input"
                    />
                    <div className="price-row">
                      <span className="price-label">₹</span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        placeholder="Price"
                        value={item.price_per_piece}
                        onChange={(e) => updateItem(i, 'price_per_piece', e.target.value)}
                        className="garment-price-input"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="garment-card-remove"
                    onClick={() => removeItem(i)}
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting || items.length === 0}>
            {submitting ? 'Creating…' : 'Create order'}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/orders')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
