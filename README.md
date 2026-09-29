# Abhi Online Center V4

Responsive business management system built with React + Vite, Node.js + Express and MongoDB.

## V4 upgrades
- Fully responsive mobile-first layout
- Mobile bottom navigation + slide-out menu
- Touch-friendly forms and buttons
- Mobile card-style data tables
- Improved dashboard cards and low-stock alerts
- Customer register with Add Customer
- New Entry / Billing flow with invoice number
- Invoice print window (A4-friendly)
- Pending payment receiving
- Stock and expense management
- Date-filtered reports
- Real `.xlsx` Excel export
- Existing MongoDB/API structure retained

## Run locally
1. Copy `.env.example` to `.env` and set MongoDB + JWT values.
2. `npm install`
3. Development: `npm run dev`
4. Production build: `npm run build`
5. Production start: `npm start`

## Render
Build Command: `npm install && npm run build`
Start Command: `npm start`

Required environment variables:
- `MONGODB_URI`
- `JWT_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
