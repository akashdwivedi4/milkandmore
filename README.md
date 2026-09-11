# 🥛 Milk & More — Complete Dairy Home-Delivery Management System

A production-ready, multi-tenant dairy home-delivery and farm management platform built from scratch with **Node.js, Express, TypeScript, Mongoose, and MongoDB** as the primary database, paired with a responsive **React + Vite + Tailwind CSS** frontend.

Designed around the real-world **Doorstep QR Delivery Workflow** (Pre-printed QR Stickers $\to$ Milkman Camera Scan $\to$ Proximity Detection $\to$ Duplicate / Inactive Warning Verification $\to$ Record Delivery $\to$ Automatic Inventory & Customer Ledger Reconciliation), paired with double-entry financial accounting, supplier management, expense tracking, liquid account separation (Cash, UPI, Bank), P&L, Balance Sheet, and RFC 4180 CSV exports.

---

## 🌟 Key Modules & Capabilities

### 1. 🗄️ MongoDB Native Database Architecture
- **Primary Database:** Built strictly with **MongoDB & Mongoose**. Zero Supabase, zero PostgreSQL, zero in-memory mock fallbacks in production.
- **Geospatial Indexing:** MongoDB `2dsphere` sparse index on customer locations for high-performance proximity queries (`$nearSphere` / Haversine distance calculations).
- **Compound Indexes:** Optimized indexes on `{ businessId: 1, mobile: 1 }`, `{ businessId: 1, assignedQr: 1 }`, `{ businessId: 1, status: 1 }`, and `{ businessId: 1, deliveryDate: 1 }`.
- **Transaction Resilience:** Automatically queries MongoDB server topology via the `hello` admin command. Executes multi-document ACID transactions on replica sets (`setName` or `mongos`), with graceful atomic fallback on standalone dev servers.

### 2. 📱 Doorstep QR Workflow & Blank QR Generator
- **Pre-Printed Blank QR Generation:** Generate batch sequences of empty QR stickers (e.g. `MM-QR-000001` through `MM-QR-000100`).
- **Empty QR Scan $\to$ Atomic Assignment:** Scanning an unassigned QR card in the field gives the milkman two one-tap choices:
  1. *Add New Customer with this QR* (pre-fills the QR tag into customer registration).
  2. *Assign to Existing Customer* (searches active directory and links QR atomically).
- **Assigned QR Scan $\to$ Instant Delivery Recording:** Scanning a customer's doorstep QR card instantly pulls their delivery schedule, shift products, and outstanding balance.
- **Soft Duplicate Delivery Warning:** If a customer has already received delivery today, the app displays:
  > *"Today's delivery already recorded. This customer already has a delivery today. Do you want to add another delivery?"*
  Allows milkman to confirm `[Add Another Delivery]` as an independent record without overwriting earlier drops.
- **Doorstep Inactive Customer Warning:** If a milkman scans an inactive customer's QR, displays a warning banner. Allows milkman to confirm `[Continue Delivery]` without unpausing their subscription.
- **Double-Tap Idempotency Guard:** `Idempotency-Key` header prevents duplicate drops caused by rapid taps or spotty cellular connectivity.

### 3. 🛰️ GPS Delivery Route Mode & Audio Proximity Detection
- **Turn-by-Turn Route Assistance:** Active delivery tracking with shift selection (`MORNING` or `EVENING`).
- **Audio Autoplay Compliance:** Initialized via explicit driver action upon tapping `[Start Delivery Route]` to unlock Web Audio API contexts across mobile Safari and Chromium.
- **Real-Time Proximity Alert:** Uses `navigator.geolocation.watchPosition` to detect nearby pending customers within configurable radii (**50m, 100m, 200m**).
- **Web Audio Tone Synthesizer:** Plays an audible two-tone chime (`880Hz` $\to$ `1174Hz`) with per-customer tone cooldown to alert milkmen of missed or upcoming doorsteps without annoying repetition.
- **OpenStreetMap / Leaflet Integration:** Zero paid API keys required. Displays interactive map with:
  - 🟢 Green pins for completed deliveries
  - 🟠 Amber pins for pending customers
  - 🔵 Pulsing blue marker for driver's real-time position

### 4. 👥 Customer Lifecycle & Subscription Scheduling
- **Shift Delivery Schedules:** Support for `MORNING`, `EVENING`, or `BOTH` daily drops.
- **Unit Normalization:** Seamless conversions across Litres (L), Millilitres (ML), Kilograms (KG), Grams (G), and Pieces (PCS) without floating-point drift.
- **Customer-Specific Rate Overrides:** Set custom product prices per customer while maintaining base product default rates.
- **Mandatory Customer Since:** Tracks `customerSince` (defaults to registration date, supports historical backdating, rejects future dates).
- **Zero-Duplicate Reactivation:** Re-activating an inactive customer clears `serviceEndDate` and restores active status on the exact same customer record with the same QR token.

### 5. 🏭 Suppliers & Raw Milk Procurement
- **Supplier Directory:** Vendor database with mobile, address, notes, and opening payable balance.
- **Purchase Recording:** Log raw milk procurement with quantity, unit, unit rate, total amount, upfront paid amount, payment mode (Cash, UPI, Bank), and balance amount.
- **Supplier Balance Reconciliation:** Supplier payable updates automatically:
  $$\text{Current Payable} = \text{Opening Payable} + \text{Purchases} - \text{Payments}$$
- **Supplier Payments:** Record direct payments to vendors with reference numbers, notes, and payment mode.
- **Inventory Integration:** Purchases automatically increment live product stock (`STOCK IN`).

### 6. 💰 Multi-Account Liquid Balances (Cash, UPI, Bank)
- **Account Separation:** Tracks liquid balances across 3 independent accounts: **Cash**, **UPI**, and **Bank**.
- **Configurable Opening Balances:** Set opening cash, opening bank, and opening UPI during business onboarding wizard or settings.
- **Automated Ledger Flows:**
  - Customer payments increase Cash, UPI, or Bank.
  - Upfront purchase payments reduce the selected payment mode.
  - Supplier payments reduce the selected payment mode.
  - Operating expenses reduce the selected payment mode.

### 7. 📊 Financial Intelligence: P&L & Balance Sheet
- **Profit & Loss Report (P&L):**
  $$\text{Gross Profit} = \text{Revenue (Sales)} - \text{COGS (Quantity Delivered} \times \text{Weighted Average Purchase Cost)}$$
  $$\text{Net Profit} = \text{Gross Profit} - \text{Operating Expenses}$$
- **Balance Sheet / Financial Position:**
  $$\text{Total Assets} = \text{Cash} + \text{UPI} + \text{Bank} + \text{Customer Receivables} + \text{Inventory Value}$$
  $$\text{Total Liabilities} = \text{Supplier Payables} + \text{Other Liabilities}$$
  $$\text{Net Business Position} = \text{Total Assets} - \text{Total Liabilities}$$

### 8. 💸 Categorized Operating Expenses
- Track farm and route expenses across standard categories:
  `Electricity`, `Transport`, `Salary`, `Packaging`, `Maintenance`, `Rent`, `Other`.
- Filter by category, payment mode, and date range. Automatically feeds into P&L and liquid account balances.

### 9. 🧾 Bills, Statements & QR Cards
- **Printable A4 Customer Statements:** Itemized bills with business branding, GST details, customer info, delivery breakdown, previous balance, payments, and highlighted **Amount Due: ₹XXXX**.
- **Printable QR Door Cards:** A4/cutout QR cards for customers to display at their doorsteps or milk collection points.

### 10. 📥 RFC 4180 CSV Data Export
- One-click CSV export with proper escaping and RFC 4180 compliance for 8 business entities:
  Customers, Deliveries, Purchases, Suppliers, Customer Payments, Supplier Payments, Operating Expenses, and Stock Movements.

---

## 🏗️ System Architecture

```text
milk&more/
├── backend/                  # Node.js + Express + TypeScript API Server (MongoDB)
│   ├── src/
│   │   ├── config/           # Database (Mongoose) connection & Zod environment
│   │   ├── controllers/      # REST controllers (Auth, Customers, Deliveries, QR, etc.)
│   │   ├── middleware/       # Auth (JWT), roles, rateLimiter, idempotency, errorHandler
│   │   ├── models/           # 15 Mongoose schemas with compound & 2dsphere indexes
│   │   ├── routes/           # Express REST endpoints
│   │   ├── services/         # Delivery, QR, Inventory, Financial, Audit services
│   │   ├── types/            # TypeScript domain types
│   │   ├── utils/            # Math, unit normalization, dates, JWT helpers
│   │   ├── app.ts            # Express application factory
│   │   └── server.ts         # Bootstrap and graceful shutdown
│   └── tests/                # Automated Vitest test suite (30 scenarios A to AG)
│
├── frontend/                 # React 18 + Vite + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── components/       # Modals (Delivery, Customer, Onboarding, QR Card, etc.)
│   │   ├── contexts/         # AuthContext (JWT session), ToastContext
│   │   ├── layouts/          # AppLayout, DesktopSidebar, MobileBottomNav
│   │   ├── maps/             # Leaflet + OpenStreetMap MapComponent abstraction
│   │   ├── pages/            # 16 Full-featured pages (ScanQR, TodaysDelivery, etc.)
│   │   ├── services/         # api.ts (Complete HTTP REST client)
│   │   ├── types/            # Frontend TypeScript definitions
│   │   └── utils/            # Web Audio sound synthesizer, formatters
│   ├── tailwind.config.js    # Milk & More Design System
│   └── vite.config.ts        # Vite bundler configuration
│
├── package.json              # Monorepo build and dev scripts
└── README.md                 # System documentation
```

---

## 🧪 Comprehensive Automated Test Suite (Scenarios A to AG)

The test suite in `backend/tests/app.test.ts` executes **30 automated integration tests** against a live MongoDB instance (using `mongodb-memory-server`):

```bash
cd backend
npm test
```

### Key Scenarios Covered:
- **Test A:** Owner registration & login with real JWT and bcrypt password hashing.
- **Test B:** First-business onboarding wizard configuring opening balances (Cash ₹20,000, Bank ₹50,000, UPI ₹10,000).
- **Test C:** Product creation with default rate (Cow Milk @ ₹60/L).
- **Test D:** Blank QR code generation (`MM-QR-000001`...).
- **Test E:** Customer creation with schedule (`MORNING`), opening balance ₹2,500, and empty QR link.
- **Test F & G:** Supplier setup & raw milk purchase (100 L @ ₹48/L = ₹4,800, Paid ₹3,000 Cash).
  - Product Stock: $+100\text{ L} = 100\text{ L}$.
  - Supplier Payable: $₹5,000 + ₹4,800 - ₹3,000 = ₹6,800$.
  - Cash Balance: $₹20,000 - ₹3,000 = ₹17,000$.
- **Test H:** Doorstep QR scan $\to$ first delivery recording (2 L Cow Milk @ ₹60/L = ₹120).
  - Live Stock: $100 - 2 = 98\text{ L}$.
  - Customer Outstanding: $₹2,500 + ₹120 = ₹2,620$.
- **Test I & J:** Same-day delivery check and second shift drop (1 L @ ₹60/L).
- **Test K & L:** Metric reconciliation & delivery editing (Second delivery updated to 2 L $\to$ Customer Outstanding ₹2,740, Stock 96 L).
- **Test M & N:** Customer payment (₹120 UPI) and operating expense (₹200 Cash for Transport).
- **Test O:** Bill Statement generation (Opening ₹2,500 + Deliveries ₹240 - Payment ₹120 = Amount Due ₹2,620).
- **Test P & Q:** P&L Statement ($4\text{ L} \times ₹48\text{ COGS}$, Net Profit calculation) & Balance Sheet verification.
- **Test R:** Supplier payment (₹1,000 UPI $\to$ Supplier Payable drops to ₹5,800).
- **Test S, T & U:** Customer deactivation (`serviceEndDate`), inactive delivery warning bypass, and zero-duplicate customer reactivation.
- **Test V & W:** GPS delivery route query & proximity query (`api.getNearbyCustomers`).
- **Test X:** Unit conversion normalization (500 ML $\to$ 0.5 L stock reduction).
- **Test Y:** Double-tap idempotency enforcement using `Idempotency-Key` header.
- **Test Z:** Rate limiting protection on sensitive endpoints.
- **Test AA:** Multi-tenant business isolation (Business B cannot view Business A customers).
- **Test AB:** Role-based access control (MILKMAN role blocked from supplier purchases with 403).
- **Test AC:** Negative stock prevention when `allowNegativeStock = false`.
- **Test AD:** Delivery deletion with inventory and ledger rollback.
- **Test AE:** Purchase deletion with inventory and financial rollback.
- **Test AF:** Immutable audit log trail verification.
- **Test AG:** RFC 4180 CSV export download verification.

---

## 🛠️ Installation & Getting Started

### Prerequisites
- Node.js 18+ (tested on Node 20 / 22)
- npm 9+
- MongoDB instance (MongoDB 6.0+ local server, Docker container, or MongoDB Atlas cluster URI)

### 1. Configure Environment Files

**Backend (`backend/.env`):**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/milk_and_more
JWT_SECRET=milk_and_more_production_super_secret_jwt_key_2026
BUSINESS_TIMEZONE=Asia/Kolkata
MAP_PROVIDER=osm
CORS_ORIGIN=http://localhost:5173
```

**Frontend (`frontend/.env`):**
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_MAP_PROVIDER=osm
```

### 2. Install Dependencies & Build

```bash
# Install root, backend, and frontend dependencies
npm run install:all

# Production Build (TypeScript compilation + Vite packaging)
npm run build
```

- Backend compiles to `backend/dist/`
- Frontend compiles to `frontend/dist/`

### 3. Start Development Servers

```bash
# In separate terminal windows:
npm run dev:backend    # Runs backend on http://localhost:5000
npm run dev:frontend   # Runs frontend on http://localhost:5173
```

### 4. Run Automated Integration Tests

```bash
npm test
```

---

## 🔒 Security & Architecture Guarantees
- **No In-Memory Mocks in Production:** Real MongoDB instance with Mongoose schemas and strict validation.
- **Zero Client Secrets:** `MONGODB_URI` and `JWT_SECRET` reside strictly server-side. Frontend receives only safe public environment variables.
- **Multi-Tenant Data Isolation:** Every query derives `business_id` from the cryptographically verified JWT (`req.user.business_id`).
- **Role-Based Access Control:** Strict RBAC middleware enforcing permissions for `OWNER`, `ADMIN`, `STAFF`, and `MILKMAN`.
