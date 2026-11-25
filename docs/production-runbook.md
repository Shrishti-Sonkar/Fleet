# Fleet production runbook

Fleet runs as a unified Node.js service (`server.js`) that serves both the Express/Firebase Admin API (`/api/*`) and the Rsbuild-compiled React frontend (`dist/`).

A single Azure App Service (Linux, Node 22 LTS) hosts all three portals using domain/path routing (`src/lib/portal.js`):
- `fleetmobilities.in` (and `www.fleetmobilities.in`) → Customer Marketplace
- `fleetmobilities.info` (or any `vendor.*` subdomain) → Standalone Vendor Partner Portal
- `admin.fleetmobilities.in` (or `fleetmobilities.in/admin`) → Restricted Admin Console (ID + Password only, no public sign-up)

## 1. Secrets and Azure App Service Configuration

Never commit `.env`, Firebase Admin JSON, private keys, or payment secrets. The browser-safe `VITE_FIREBASE_*` values are client configuration, not authorization; Firestore rules and backend token verification are the security boundary.

For local development:

1. Copy `.env.example` to `.env`.
2. Add the Firebase web configuration and backend credentials.
3. Keep `.env` ignored by Git.

In **Azure Portal → App Service → Settings → Environment variables**, set:

- `NODE_ENV=production`
- `SCM_DO_BUILD_DURING_DEPLOYMENT=false` (if deploying prebuilt artifacts via `.github/workflows/deploy-azure.yml`)
- `FIREBASE_SERVICE_ACCOUNT_BASE64` (base64 of the Firebase service account JSON)
- `FIREBASE_PROJECT_ID=fleetmobilities-3ee31`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CORS_ORIGINS=https://fleetmobilities.in,https://www.fleetmobilities.in,https://admin.fleetmobilities.in,https://fleetmobilities.info,https://www.fleetmobilities.info`

In **GitHub → Repository Settings → Secrets and variables → Actions**:

- **Variables**: `AZURE_WEBAPP_NAME`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_VAPID_KEY`
- **Secret**: `AZURE_WEBAPP_PUBLISH_PROFILE` (downloaded from Azure App Service Overview → Download publish profile)

## 2. Setting Initial Admin ID & Password in Firebase

Admin credentials live in Firestore under `adminCredentials/{adminId}` (strictly locked with `allow read, write: if false;` in `firestore.rules` so no client can ever access them).

1. Open **Firebase Console → Firestore Database → Start collection** `adminCredentials`.
2. Set **Document ID** to your chosen Admin ID (for example `fleet-root`).
3. Add fields:
   - `password` (string): your chosen secret password (automatically upgraded to a salted `scrypt` hash on first login)
   - `active` (boolean): `true`
   - `name` (string): `"Super Admin"`
4. Sign in at `https://admin.fleetmobilities.in` or `https://fleetmobilities.in/admin`.

## 3. Azure App Service Setup & Custom Domains

1. Create an **Azure App Service**:
   - **Publish**: Code
   - **Runtime stack**: Node 22 LTS
   - **Operating System**: Linux
   - **Pricing tier**: Basic (B1) or higher (required for custom domains + free managed SSL)
   - **Startup Command**: `npm start`
   - **Health check path**: `/api/health`
2. Add Custom Domains in **Azure Portal → Custom domains**:
   - Bind `fleetmobilities.in`, `www.fleetmobilities.in`, `admin.fleetmobilities.in`, `fleetmobilities.info`, and `www.fleetmobilities.info` using the `A`/`CNAME` and `asuid` `TXT` records shown by Azure at your DNS registrar.
   - Bind a free **App Service Managed Certificate (SSL/TLS)** for each hostname.
3. Add all hostnames to **Firebase Console → Authentication → Settings → Authorized domains** (`fleetmobilities.in`, `www.fleetmobilities.in`, `admin.fleetmobilities.in`, `fleetmobilities.info`, `www.fleetmobilities.info`).

## 3. Required Release Checks

Run locally or in CI:

```powershell
npm.cmd ci
npm.cmd run lint
npm.cmd run build
npm.cmd test
npm.cmd run test:rules
node --check server.js
```

The Firestore rules test requires Java because the Firebase emulator runs on the JVM. CI's Ubuntu runner provides that runtime.
