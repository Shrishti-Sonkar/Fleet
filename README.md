# Fleet Mobilities — Project Repository

Welcome to the **Fleet Mobilities** platform repository. This repository is organized into two dedicated, independent application branches sharing a common backend infrastructure.

---

## 🌿 Repository Branch Structure

| Branch Name | Description | Target Deployment |
| :--- | :--- | :--- |
| [**`fleet-customer`**](https://github.com/Shrishti-Sonkar/Fleet/tree/fleet-customer) | **Customer Rental Application** — Vehicle browsing, booking, KYC verification, and Razorpay checkout (Token / Full payments). | `fleetmobilities.vercel.app` |
| [**`fleet-vendor`**](https://github.com/Shrishti-Sonkar/Fleet/tree/fleet-vendor) | **Standalone Vendor Partner Portal** — Vehicle fleet management, incoming booking handovers, KYC inspection, and Razorpay Route payouts. | `vendor.fleetmobilities.com` |

---

## 🚀 Branch Overview & Quickstart

### 1. Customer Application (`fleet-customer` branch)
```bash
git checkout fleet-customer
npm install
npm run dev
```
Features:
- Vehicle rental catalog with date/time selection
- Razorpay Payment Gateway integration (Token Payment & Full Payment options)
- Pay Remaining Balance option for token-paid bookings
- Admin Dashboard with live payment analytics & token configuration

### 2. Standalone Vendor Portal (`fleet-vendor` branch)
```bash
git checkout fleet-vendor
npm install
npm run dev
```
Features:
- Desktop-first partner dashboard
- List new vehicles & manage fleet availability
- Inspect customer KYC documents (Aadhaar, Driving License, Selfie)
- Approve bookings and generate 4-digit start OTPs
- Setup Razorpay Linked Account (`acc_XXXX`) for automatic split payouts

---

## 🛠️ Shared Tech Stack & Backend
- **Frontend**: Vite + React, Tailwind CSS, Framer Motion, React Hot Toast
- **Backend API**: Express.js with Firebase Admin SDK (`server.js`)
- **Database & Auth**: Firebase Authentication & Firestore Database
- **Payments**: Razorpay Payment Gateway & Razorpay Route (Split Payments)
