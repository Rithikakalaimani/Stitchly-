# Stitchly

A full-stack app for tailors to manage customers, orders, billing, and design galleries. Built with React and Node.js.

## Features

- **Customers**
  - Add customers (name, phone optional). Edit name and phone from the customer page. Delete a customer (and all their orders, garments, payments) from the customer page.
  - **List**: Shows recent customers first; does not load all at once. Use **search** (name or phone) to find anyone, or **Load more customers** to fetch the next page.
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

- **Design gallery**
  - Add blouse or other designs with **1–3 photos** (different views) per design. Shown in a gallery; useful to show customers later. Delete or view full-size from the Designs page.

- **Dashboard**
  - Pending orders count, total pending money, total estimated, and total paid (with a time-period filter for paid).
  - Pending orders table with customer, type of dress, price, status, and View link. Only the first page is loaded; use **Load more pending orders** when there are many. Optimized for mobile (no horizontal scroll).

- **Mobile**
  - Layout and touch targets are tuned for small screens. **Header menu** (hamburger) on small screens opens a slide-out with Dashboard, Customers, and Designs. Customer page, order details, and dashboard work on phones.


## Screenshots 

![ss1](https://github.com/Rithikakalaimani/Stitchly/blob/main/screenshots/Screenshot%202026-02-04%20at%206.43.29%E2%80%AFPM.png)
![ss2](https://github.com/Rithikakalaimani/Stitchly/blob/main/screenshots/Screenshot%202026-02-04%20at%206.44.47%E2%80%AFPM.png)
![ss3](https://github.com/Rithikakalaimani/Stitchly/blob/main/screenshots/Screenshot%202026-02-04%20at%206.44.26%E2%80%AFPM.png)
![ss4](https://github.com/Rithikakalaimani/Stitchly/blob/main/screenshots/Screenshot%202026-02-04%20at%206.44.53%E2%80%AFPM.png)
![ss5](https://github.com/Rithikakalaimani/Stitchly/blob/main/screenshots/Screenshot%202026-02-04%20at%206.45.17%E2%80%AFPM.png)
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
| GET | /api/customers | List customers (?limit, ?offset, ?search for pagination and search) |
| POST | /api/customers | Create customer |
| GET | /api/customers/:id | Get one customer |
| PATCH | /api/customers/:id | Update customer (name, phone) |
| DELETE | /api/customers/:id | Delete customer and all related orders, garments, payments |
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
| GET | /api/dashboard | Dashboard summary (?period, ?limit, ?offset for pending orders pagination) |
| GET | /api/dashboard/analytics | Per-customer analytics |
| GET | /api/designs | List design gallery entries |
| POST | /api/designs | Create design (name, type, images[1–3]) |
| GET | /api/designs/:id | Get one design |
| DELETE | /api/designs/:id | Delete design |

