// Vercel serverless entry point.
// The full Express app lives in ../server.js. On Vercel it does NOT call
// app.listen() (guarded by the VERCEL env var) — instead the app, which is a
// standard (req, res) handler, is exported here for the serverless runtime.
//
// Required Vercel environment variables:
//   FIREBASE_SERVICE_ACCOUNT_BASE64  base64 of the service-account JSON
//   CORS_ORIGINS                     e.g. https://your-app.vercel.app
//   NODE_ENV=production
import app from '../server.js'

export default app
