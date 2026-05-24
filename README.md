# Fleet — Peer-to-Peer Vehicle Rental Marketplace (India)

**Fleet** is a modern, full-stack peer-to-peer vehicle rental marketplace designed specifically for the Indian market. Built with **React + Vite**, **Tailwind CSS**, a **Node/Express Backend**, and backed by **Firebase (Authentication, Firestore, and Storage)** and **Razorpay Payments**, Fleet offers a premium, responsive, and seamless vehicle sharing experience.

---

## 🚀 Key Features

### 🔐 1. Authentication & Role Separation
- **Dual Role System**: Separate entry and workspaces for **Renters** and **Vendors (Hosts)**.
- **Multiple Login Methods**: Google Single Sign-On, Email/Password, and OTP-based mobile login.
- **KYC Verification**: User verification system for uploading driving licenses and Aadhaar cards, validated via the Admin dashboard.
- **Captain Mode**: Hosts can toggle captain mode on their profile to seamlessly offer rides as a driver.

### 🚲 2. Browsing & Detail Navigation
- **Live Search & Filter**: Filter vehicle lists by city (Dehradun, Mussoorie, Rishikesh), type (Bike, Scooter, Car, SUV), and availability.
- **Dynamic Detail Pages**: Detailed engine specs, features, rental rules, interactive maps location, and customer reviews.
- **Live Review Breakdown**: Star statistics calculated directly from real-time customer reviews.

### 💳 3. Secure Booking Flow & Payments
- **Add-ons Support**: Select optional add-ons like Helmets and Comprehensive Insurance.
- **Coupon System**: Dynamic coupon validation applied directly to the subtotal.
- **Razorpay Integration**: Checkout modal to collect secure, instant payments in INR.

### 🛣️ 4. Active Ride Tracking & Security
- **Start Ride OTP**: Renters receive a secure 4-digit code to start the ride with the vehicle owner.
- **End Ride PIN**: Enter the drop-off PIN code supplied by the owner to successfully complete the ride.
- **Post-Ride Reviews**: Write ratings and feedback directly into the Firestore reviews collection.

### 📊 5. Dashboards & Invoicing
- **Owner Dashboard**: Manage active listings, track earnings, approve/reject bookings, and generate drop-off PIN codes.
- **Admin Dashboard**: Verification request manager, user listing approvals, and system-wide user roles control.
- **PDF Tax Invoice**: Auto-generate beautiful itemized tax invoices (PDF) utilizing **jsPDF** for completed rentals.

---

## 🛠️ Tech Stack & Architecture

- **Frontend Core**: React 19 (Hooks, Context API) + React Router v7 (SPA routing)
- **Styling**: Tailwind CSS (Material-3 tokens, custom gradients)
- **Backend Core**: Node.js + Express
- **Database / Cloud Services**:
  - **Firebase Auth**: User account management & Google login.
  - **Cloud Firestore**: Real-time database for reviews, bookings, and profiles.
  - **Firebase Storage**: Image hosting for vehicle listings and KYC documents.
- **Payments**: Razorpay Standard Web Checkout Integration.

---

## 📦 Project Structure

```bash
fleet-rental/
├── package.json         # Root workspace orchestrator (concurrently scripts)
├── frontend/            # React + Vite Frontend Application
│   ├── src/             # Application source (components, hooks, pages, context)
│   ├── .env             # Frontend environment variables
│   └── package.json     # Frontend dependencies
└── backend/             # Node.js + Express Backend Server
    ├── src/             # Server source files (server.js)
    ├── .env             # Backend environment variables
    └── package.json     # Backend dependencies
```

---

## ⚙️ Installation & Local Setup

### 1. Clone & Install Dependencies
Ensure you have [Node.js](https://nodejs.org/) installed. Run the following command from the root directory to install both frontend and backend dependencies simultaneously:
```bash
npm run install-all
```

### 2. Configure Environment Variables
You need to create two `.env` files, one for the frontend and one for the backend.

**Frontend (`frontend/.env`)**:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
```

**Backend (`backend/.env`)**:
```env
PORT=5000
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY="your_private_key"
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

### 3. Start Development Server
Launch both the frontend Vite server and the backend Node server concurrently from the root folder:
```bash
npm run dev
```
- Frontend will run on: [http://localhost:5173](http://localhost:5173)
- Backend will run on: `http://localhost:5000`

### 4. Build for Production
To bundle and optimize the frontend for production, run:
```bash
npm run build
```

---

## ⚡ Build Optimizations

Fleet uses Rollup chunk-splitting inside `frontend/vite.config.js` to improve performance:
- **`firebase`** code is isolated into a separate chunk.
- **`jspdf`** asset files are isolated in a separate chunk to prevent loading large bundle assets on initial visit.
- Shared node modules are bundled inside **`vendor`**.

---

## 🌐 Production Deployment

- **Frontend**: Single Page Application (SPA) configurations are specified in `frontend/vercel.json` guaranteeing proper route redirects to prevent 404s, and strict security headers.
- **Backend**: Can be hosted on platforms like Render, Heroku, or AWS EC2 using the provided `server.js`.
