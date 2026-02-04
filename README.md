# Tailor Manager

A full-stack app for tailors to manage customers, orders, partial deliveries, and billing.

## Features

- **Customers**: Add and list customers (name, phone, address).
- **Orders**: Create an order per visit with multiple garments (type, quantity, price per piece).
- **Partial deliveries**: Record deliveries in batches; select which garments and how many delivered. Garment status (PENDING → STITCHED → DELIVERED) and order completion update automatically.
- **Billing**: Delivered value, total paid, and balance are computed automatically.
- **Dashboard**: Pending orders with pending value and balance; customer analytics (who gives how much work, pending value, balance).

## Tech stack

- **Frontend**: React 18, React Router, Vite
- **Backend**: Node.js, Express
- **Database**: MongoDB

## Setup

### 1. Backend

```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:

```
PORT=5000
MONGODB_URI=mongodb+srv://rithika:YG7C9mtpMThUHvUP@cluster0.l7zhskx.mongodb.net/tailor_db
```

Start the API:

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
| GET | /api/orders | List orders (?customer_id, ?status) |
| GET | /api/orders/:id | Order detail + garments, deliveries, payments, billing |
| POST | /api/orders | Create order with garments |
| POST | /api/deliveries | Create delivery (order_id + items) |
| POST | /api/payments | Record payment (order_id, amount_paid, mode) |
| GET | /api/dashboard | Pending orders & summary |
| GET | /api/dashboard/analytics | Per-customer analytics |

## Data model

- **Customer**: customer_id, name, phone, address
- **Order**: order_id, customer_id, order_date, total_estimated_amount, status (OPEN/COMPLETED)
- **Garment**: garment_id, order_id, type, quantity, price_per_piece, status (PENDING/STITCHED/DELIVERED), quantity_delivered
- **Delivery**: delivery_id, order_id, delivery_date
- **DeliveryItem**: delivery_id, garment_id, quantity_delivered
- **Payment**: payment_id, order_id, amount_paid, payment_date, mode (cash/UPI)

Order is set to COMPLETED when all garments are fully delivered. Billing uses delivered value (delivered qty × price) and total paid to show balance.
