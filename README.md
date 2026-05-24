# Fleet — Peer-to-Peer Vehicle Rental Marketplace (India)

**Fleet** is a modern, high-performance peer-to-peer vehicle rental marketplace designed specifically for the Indian market. Built with **React + Vite**, **Tailwind CSS**, and backed by **Firebase (Authentication, Firestore, and Storage)** and **Razorpay Payments**, Fleet offers a premium, responsive, and seamless vehicle sharing experience.

---

## 🚀 Key Features

### 🔐 1. Authentication & Role Separation
- **Dual Role System**: Separate entry and workspaces for **Renters** and **Vendors (Hosts)**.
- **Multiple Login Methods**: Google Single Sign-On, Email/Password, and OTP-based login.
- **KYC Verification**: User verification tab for uploading driving license and identification documents, validated via the Admin dashboard.
- **Captain Mode**: Hosts can toggle captain mode on their profile to quickly switch between renter and host profiles.

### 🚲 2. Browsing & Detail Navigation
- **Live Search & Filter**: Filter vehicle list by city (Dehradun, Mussoorie, Rishikesh), type (Bike, Scooter, Car, SUV), and availability.
- **Dynamic Detail Pages**: Detailed engine specs, features, rental rules, interactive maps location, and customer reviews.
- **Live Review Breakdown**: Star statistics (Cleanliness, Condition, Owner Helpfulness) calculated directly from real-time customer reviews.

### 💳 3. Secure Booking Flow & Payments
- **Add-ons Support**: Select optional add-ons like Helmets and Comprehensive Insurance.
- **Coupon System**: Dynamic coupon validation (fixed or percentage discount) applied directly to subtotal.
- **Razorpay Integration**: Checkout modal to collect secure, instant payments in INR.

### 🛣️ 4. Active Ride Tracking & Security
- **Start Ride OTP**: Renters receive a secure 4-digit code to start the ride with the vehicle owner.
- **End Ride PIN**: Enter the drop-off PIN code supplied by the owner to successfully complete the ride.
- **Report Issues**: Live reporting sheet for breakdowns, accidents, or owner unresponsiveness.
- **Post-Ride Reviews**: Write ratings and feedback directly into the Firestore reviews collection.

### 📊 5. Dashboards & Invoicing
- **Owner Dashboard**: Manage active listings, track earnings, approve/reject bookings, and generate drop-off PIN codes.
- **Admin Dashboard**: Verification request manager, user listing approvals, and system-wide user roles control.
- **PDF Tax Invoice**: Auto-generate beautiful itemized tax invoices (PDF) utilizing **jsPDF** for completed rentals, including breakdowns for base fare, addons, coupons, and 18% GST.

---

## 🛠️ Tech Stack & Architecture

- **Frontend Core**: React 19 (Hooks, Context API) + React Router v7 (SPA routing)
- **Styling**: Tailwind CSS (Material-3 tokens, custom gradients, responsive flex-grids)
- **Database / Backend**:
  - **Firebase Auth**: User account management & Google login.
  - **Cloud Firestore**: Real-time listeners for reviews, bookings, alerts, and profiles.
  - **Firebase Storage**: Image hosting for vehicle listings and driving licenses.
- **Payments**: Razorpay Standard Web Checkout Integration.
- **Invoicing**: Client-side A4 PDF formatting using **jsPDF**.

---

## 📦 Project Structure

```bash
src/
├── components/          # Reusable UI components & modals
│   ├── layout/          # PageLayout, TopNavBar, Footer, BottomTabBar
│   ├── ui/              # NotificationBell, ReviewCard, skeletons
│   └── sections/        # VehicleCard
├── context/             # AuthContext (Firebase authentication state)
├── data/                # Mock data (mockVehicles, static layouts)
├── hooks/               # Custom React hooks (useBooking, useVehicleReviews, etc.)
├── lib/                 # Third-party integrations (firebase, constants, invoiceGenerator)
├── pages/               # Main application pages
└── styles/              # Global styles (globals.css, Tailwind base rules)
```

---

## ⚙️ Installation & Local Setup

### 1. Clone & Install Dependencies
Ensure you have [Node.js](https://nodejs.org/) installed, then run:
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory (refer to [.env.example](file:///.env.example)):
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for Production
To bundle and optimize the project for production, run:
```bash
npm run build
```

---

## ⚡ Build Optimizations

Fleet uses Rollup chunk-splitting inside [vite.config.js](file:///vite.config.js) to improve performance:
- **`firebase`** code is isolated into a separate chunk.
- **`jspdf`** asset files are isolated in a separate chunk to prevent loading large bundle assets on initial visit.
- Shared node modules are bundled inside **`vendor`**.

---

## 🌐 Production Deployment (Vercel)

Single Page Application (SPA) configurations are specified in [vercel.json](file:///vercel.json). This guarantees:
- Route redirects (`/(.*) -> /index.html`) prevent 404 errors on page refresh.
- Custom security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`) protect the app in production.
