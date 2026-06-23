# Fleet — Peer-to-Peer Vehicle Rental Marketplace (India)

**Fleet** is a modern, full-stack peer-to-peer vehicle rental marketplace built for the Indian market. Rent bikes, scooters, and cars from local hosts across Dehradun, Mussoorie, and Rishikesh — powered by **React + Vite**, **Node.js/Express**, **Firebase**, and **Razorpay Payments**.

---

## 🚀 Key Features

### 🔐 Authentication & Role Separation
- **Dual Role System** — Separate flows for **Renters** and **Vendors (Hosts)**
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
- **Owner Dashboard** — Manage listings, approve/reject bookings, generate drop-off PINs
- **Vendor Home** — Quick overview of active bookings and vehicle status
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
| Frontend | React 19, React Router v7, Vite |
| Styling | Tailwind CSS v3, custom globals |
| Backend | Node.js, Express |
| Database | Cloud Firestore (real-time) |
| Auth | Firebase Authentication |
| Storage | Firebase Storage |
| Payments | Razorpay Standard Checkout |
| PDF Generation | jsPDF |
| Deployment | Vercel (frontend + server) |

---

## 📦 Project Structure

```
fleet-rental/
├── server.js              # Express backend (API, Razorpay, Firebase Admin)
├── index.html             # Vite HTML entry point
├── vite.config.js         # Vite config (proxy, chunk splitting)
├── tailwind.config.js     # Tailwind theme config
├── postcss.config.js      # PostCSS config
├── eslint.config.js       # ESLint config
├── vercel.json            # Vercel SPA rewrites & security headers
├── firestore.rules        # Firestore security rules
├── storage.rules          # Firebase Storage security rules
├── cors.json              # CORS config for Firebase Storage bucket
├── set-cors.js            # Script to apply CORS config to Storage bucket
├── seed-vehicles.html     # One-off browser tool to seed Firestore vehicles
├── .env                   # Local environment variables (not committed)
├── .env.example           # Template for required environment variables
├── public/
│   ├── favicon.svg
│   ├── icons.svg
│   └── _redirects         # Netlify-style SPA redirect fallback
└── src/
    ├── main.jsx           # React entry point
    ├── App.jsx            # Root router and layout
    ├── styles/
    │   └── globals.css
    ├── context/
    │   ├── AuthContext.jsx
    │   ├── PriceContext.jsx
    │   └── ThemeContext.jsx
    ├── hooks/
    │   ├── useActiveBooking.js
    │   ├── useBooking.js
    │   ├── useNotifications.js
    │   ├── useTokens.js
    │   ├── useVehicleReviews.js
    │   ├── useVehicles.js
    │   └── useWishlist.js
    ├── lib/
    │   ├── firebase.js
    │   ├── api.js
    │   ├── constants.js
    │   ├── invoiceGenerator.js
    │   └── notificationHelper.js
    ├── data/
    │   └── mockVehicles.js
    ├── components/
    │   ├── CancelRideModal.jsx
    │   ├── DropoffPinModal.jsx
    │   ├── PostRideRating.jsx
    │   ├── ProtectedRoute.jsx
    │   ├── RenterNav.jsx
    │   ├── ReviewCard.jsx
    │   ├── RideOTPCard.jsx
    │   ├── StartRideModal.jsx
    │   ├── VendorNav.jsx
    │   ├── layout/
    │   │   ├── BottomTabBar.jsx
    │   │   ├── Footer.jsx
    │   │   ├── PageLayout.jsx
    │   │   ├── SideDrawer.jsx
    │   │   └── TopNavBar.jsx
    │   ├── sections/
    │   │   ├── ActiveBookingCard.jsx
    │   │   ├── BookingSteps.jsx
    │   │   ├── FilterBar.jsx
    │   │   ├── HeroSection.jsx
    │   │   ├── HowItWorks.jsx
    │   │   ├── PopularVehicles.jsx
    │   │   ├── PriceModeToggle.jsx
    │   │   ├── PromoBanner.jsx
    │   │   ├── SearchWidget.jsx
    │   │   └── VehicleCard.jsx
    │   └── ui/
    │       ├── Badge.jsx
    │       ├── Button.jsx
    │       ├── Card.jsx
    │       ├── Chip.jsx
    │       ├── Divider.jsx
    │       ├── Icon.jsx
    │       ├── Input.jsx
    │       ├── NotificationBell.jsx
    │       └── TokenBadge.jsx
    └── pages/
        ├── SplashPage.jsx
        ├── LoginPage.jsx
        ├── ForgotPasswordPage.jsx
        ├── RoleSelectionPage.jsx
        ├── HomePage.jsx
        ├── BrowsePage.jsx
        ├── VehicleDetailPage.jsx
        ├── BookingPage.jsx
        ├── BookingDetailPage.jsx
        ├── PaymentStatusPage.jsx
        ├── MyBookingsPage.jsx
        ├── ActiveRidePage.jsx
        ├── WishlistPage.jsx
        ├── WalletPage.jsx
        ├── NotificationsPage.jsx
        ├── ProfilePage.jsx
        ├── EditProfilePage.jsx
        ├── VerificationPage.jsx
        ├── HostPage.jsx
        ├── AddVehiclePage.jsx
        ├── VendorHomePage.jsx
        ├── OwnerDashboard.jsx
        ├── VendorEarningsPage.jsx
        ├── VendorPayoutsPage.jsx
        ├── AdminDashboard.jsx
        ├── AdminOpsPage.jsx
        ├── AboutPage.jsx
        ├── SupportPage.jsx
        ├── LegalPage.jsx
        └── NotFoundPage.jsx
```

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

```env
# Firebase (Frontend — VITE_ prefix required)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Razorpay (Frontend)
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx

# Backend
PORT=5000
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
FIREBASE_PROJECT_ID=your_project_id

# Firebase Admin credentials — one of:
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
# OR
FIREBASE_SERVICE_ACCOUNT_BASE64=<base64 encoded service account JSON>

# CORS allowed origins (comma-separated)
CORS_ORIGINS=http://localhost:5173
```

### 3. Start Development

```bash
npm run dev
```

This runs **both** the Vite frontend and the Express backend concurrently:
- Frontend → [http://localhost:5173](http://localhost:5173)
- Backend API → [http://localhost:5000](http://localhost:5000)

### 4. Production Build

```bash
npm run build
```

---

## 🔥 Firebase Setup

1. Create a project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Authentication** (Email/Password + Google)
3. Enable **Firestore** and deploy security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```
4. Enable **Storage** and deploy rules:
   ```bash
   firebase deploy --only storage
   ```
5. Apply the CORS config to your Storage bucket:
   ```bash
   node set-cors.js
   ```
6. Download a **Service Account JSON** from Project Settings → Service Accounts and set `GOOGLE_APPLICATION_CREDENTIALS` in your `.env`.

---

## ⚡ Build Optimisations

Vite's Rollup chunk-splitting is configured in `vite.config.js`:
- **`firebase`** — isolated in a separate async chunk
- **`jspdf`** — isolated to prevent heavy PDF library from blocking initial load
- **`vendor`** — shared node modules bundled together

---

## 🌐 Deployment

The project is designed to deploy as a **single Vercel project** (frontend SPA + Express serverless backend):

- `vercel.json` configures SPA rewrites so all routes serve `index.html`
- Security headers (`X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`) are set globally
- Static assets under `/assets/` are cached for 1 year (`immutable`)

For the Express backend in production, set `FIREBASE_SERVICE_ACCOUNT_BASE64` (a Base64-encoded service account JSON) instead of a file path.

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.
