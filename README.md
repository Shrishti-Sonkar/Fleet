# Fleet — Peer-to-Peer Vehicle Rental Marketplace (India)

**Fleet** is a modern, full-stack peer-to-peer vehicle rental marketplace built for the Indian market. Rent bikes, scooters, and cars from local hosts across Dehradun, Mussoorie, and Rishikesh — powered by **React + Rsbuild**, **Node.js/Express**, **Firebase**, and **Razorpay Payments**.

---

## 🚀 Key Features

### 🔐 Authentication & Role Separation
- **Dual Portal & Role System** — Customer Marketplace (`fleetmobilities.in`) & Standalone Vendor Partner Portal (`fleetmobilities.info` / `vendor.*`)
- **Multiple Login Methods** — Google SSO, Email/Password, and OTP-based mobile login
- **KYC Verification** — Upload driving license and Aadhaar for identity validation via Admin dashboard
- **Captain Mode** — Hosts can toggle captain mode to offer rides as a driver

### 🚲 Browse & Discovery
- **Live Search & Filter** — Filter by city, vehicle type (Bike, Scooter, Car, SUV), and availability
- **Vehicle Detail Pages** — Engine specs, features, rental rules, map location, and customer reviews
- **Wishlist** — Save favourite vehicles for later
- **Live Review Breakdown** — Star statistics calculated from real-time Firestore reviews

### 💳 Booking & Payments
- **Add-ons** — Optional Helmet and Comprehensive Insurance selection
- **Coupon System** — Dynamic coupon validation applied to subtotal
- **Razorpay Integration** — Secure INR payments via Razorpay Standard Web Checkout
- **Wallet & Tokens** — In-app wallet balance and reward token system
- **Payment Status Page** — Post-payment confirmation screen

### 🛣️ Active Ride Tracking
- **Start Ride OTP** — Renters receive a secure 4-digit code to begin the ride
- **Drop-off PIN** — End ride confirmation via owner-supplied PIN
- **Cancel Ride** — Cancel an active ride with reason selection
- **Post-Ride Reviews** — Submit ratings and feedback after ride completion

### 📊 Dashboards & Earnings
- **Vendor Partner Portal** — Dedicated dark-theme portal on `fleetmobilities.info` for listings, handovers, earnings, and Razorpay Route payouts
- **Owner Dashboard** — Manage listings, approve/reject bookings, generate drop-off PINs
- **Vendor Earnings** — Detailed earnings breakdown per vehicle and period
- **Vendor Payouts** — Track payout history and initiate withdrawal requests
- **Admin Dashboard** — KYC verification manager, user listing approvals, and role control
- **Admin Ops Page** — System-level operations and admin tooling
- **PDF Tax Invoice** — Auto-generate itemised tax invoices (PDF) using **jsPDF**

### 🧾 Additional Pages
- **My Bookings** — Full booking history with status tracking
- **Booking Detail** — Per-booking detail view
- **Profile & Edit Profile** — User profile management
- **Notifications** — In-app notification centre
- **Verification Page** — KYC document upload and status
- **Host / List Vehicle** — Add a new vehicle listing with image upload
- **Support** — Help and FAQ page
- **About** — About Fleet page
- **Legal** — Terms, Privacy, and Refund policies
- **404 Not Found** — Custom error page

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router v7, Rsbuild (Rspack) |
| Styling | Tailwind CSS v3, custom globals |
| Backend | Node.js, Express (`server.js`) |
| Database | Cloud Firestore (real-time) |
| Auth | Firebase Authentication |
| Storage | Cloudinary signed uploads |
| Payments | Razorpay Standard Checkout & Route Split Payouts |
| PDF Generation | jsPDF |
| Deployment | Azure App Service (Linux, Node 22 LTS) |

---

## 🌐 Multi-Domain Routing

All portals run from the unified `main` branch and a single Azure App Service deployment (`src/lib/portal.js`):
- **`fleetmobilities.in`** → Customer Rental Marketplace
- **`fleetmobilities.info`** (or any `vendor.*` subdomain) → Standalone Vendor Partner Portal (`src/vendor/`)
- **`admin.fleetmobilities.in`** or **`fleetmobilities.in/admin`** → Restricted Admin Console (`src/admin/`)

In local development, append `?portal=vendor`, `?portal=admin`, or `?portal=customer` to `http://localhost:5173` (or visit `/admin`) to preview any portal.

---

## ⚙️ Local Setup

### 1. Clone & Install

```bash
git clone https://github.com/Shrishti-Sonkar/Fleet.git
cd Fleet
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

### 3. Start Development

```bash
npm run dev
```

This runs **both** the Rsbuild frontend and the Express backend concurrently:
- Frontend → [http://localhost:5173](http://localhost:5173) (`?portal=vendor` for Vendor Portal)
- Backend API → [http://localhost:5000](http://localhost:5000)

### 4. Production Build & Start

```bash
npm run build
npm start
```

---

## 🔥 Firebase Setup

1. Create a project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Authentication** (Email/Password + Google + Phone) and add `fleetmobilities.in` and `fleetmobilities.info` under **Authorized domains**
3. Enable **Firestore** and deploy security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```
4. Download a **Service Account JSON** from Project Settings → Service Accounts and set `GOOGLE_APPLICATION_CREDENTIALS` locally (or `FIREBASE_SERVICE_ACCOUNT_BASE64` in Azure App Service).

---

## ☁️ Production Deployment (Azure App Service)

The production app deploys directly from `main` to **Azure App Service (Linux Node.js)** via `.github/workflows/deploy-azure.yml` — no Docker required.

See [`docs/production-runbook.md`](docs/production-runbook.md) for Azure environment variables, custom domain DNS bindings (`fleetmobilities.in` & `fleetmobilities.info`), free managed SSL setup, and release checks.

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.
