# Stitchly

A full-stack app for tailors to manage customers, orders, and billing. Built with React and Node.js.

## Features

- **Customers**
  - Add customers (name, phone). Edit name and phone from the customer page.
  - Search customers by name or phone on the dashboard.
  - **Import from contacts**: On supported mobile browsers (e.g. Android Chrome over HTTPS), add many customers at once or use “Use name & phone from contacts” in the Add customer form to fill from a single contact.
  - View a customer to see all their orders, garments, amounts, and payments in one place.

- **Orders**
  - Create orders with **photo-first garments**: take or upload a photo per garment, then add type and price. Photos are stored and shown in order details.
  - Each garment has a status: **Pending** → **Stitched** → **Delivered**. Update status from the customer’s order details; orders complete when all garments are delivered.
  - Remove individual garments or **Clear all** order details for a customer.

- **Billing**
  - Per-customer and per-order totals: total estimated, paid, and due.
  - Record payments against a specific order or **Apply to balance (any order)** so the amount is allocated across open orders (FIFO).
  - **Share billing via WhatsApp**: send a formatted billing summary (items, total, due) to the customer or to any chat. On mobile, opens WhatsApp with the customer’s number if available.

- **Dashboard**
  - Pending orders count, total pending money, total estimated, and total paid (with a time-period filter for paid).
  - Pending orders table with customer, type of dress, price, status, and View link. Optimized for mobile (no horizontal scroll).

- **Mobile**
  - Layout and touch targets are tuned for small screens. Customer page, order details, and dashboard work on phones.

## Tech stack

- **Frontend**: React 18, React Router, Vite, react-icons
- **Backend**: Node.js, Express
- **Database**: MongoDB

## Setup

### 1. Backend

```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/stitchly
```

Use your own MongoDB connection string. Start the API:

```bash
npm run dev
```

API runs at **http://localhost:5000**.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at **http://localhost:3000** and proxies `/api` to the backend.

## API overview

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/customers | List customers |
| POST | /api/customers | Create customer |
| GET | /api/customers/:id | Get one customer |
| PATCH | /api/customers/:id | Update customer (name, phone) |
| GET | /api/customers/:id/overview | Customer + orders, garments, payments, summary |
| DELETE | /api/customers/:id/garments | Delete all garments for this customer (clear all order details) |
| GET | /api/orders | List orders (?customer_id, ?status) |
| GET | /api/orders/:id | Order detail + garments, payments, billing |
| POST | /api/orders | Create order with garments (customer_id, garments[]) |
| PATCH | /api/garments/:id | Update garment (e.g. status) |
| DELETE | /api/garments/:id | Delete one garment |
| GET | /api/payments | List payments (?order_id) |
| POST | /api/payments | Record payment (order_id, amount_paid, mode) |
| POST | /api/payments/apply-to-balance | Apply payment to customer balance (customer_id, amount_paid, mode); allocates FIFO across open orders |
| GET | /api/dashboard | Dashboard summary (?period for paid filter) |
| GET | /api/dashboard/analytics | Per-customer analytics |

## Data model (main)

- **Customer**: customer_id, name, phone (address optional in DB, not used in UI)
- **Order**: order_id, customer_id, order_date, total_estimated_amount, status (OPEN | COMPLETED)
- **Garment**: garment_id, order_id, type, quantity, price_per_piece, status (PENDING | STITCHED | DELIVERED), quantity_delivered, image (optional base64)
- **Payment**: payment_id, order_id, amount_paid, payment_date, mode (cash | UPI)

Order is set to COMPLETED when all its garments are DELIVERED. Due = total estimated − total paid per order; remaining is summed across orders for the customer.
