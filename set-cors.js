import { Storage } from '@google-cloud/storage';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const bucketName = process.env.VITE_FIREBASE_STORAGE_BUCKET;
if (!bucketName) {
  console.error('❌ VITE_FIREBASE_STORAGE_BUCKET is not set in .env');
  process.exit(1);
}

// Determine credentials
let storageOptions = {};

if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8'),
  );
  storageOptions.credentials = serviceAccount;
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  // Will be picked up automatically by the SDK via ADC
  storageOptions.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
} else {
  console.error('❌ No Firebase credentials found.');
  console.error('   Set GOOGLE_APPLICATION_CREDENTIALS=./service-account.json in your .env');
  console.error('   Download the key from: Firebase Console → Project Settings → Service Accounts');
  process.exit(1);
}

// Extract project ID from credentials file if not set
if (!storageOptions.projectId && process.env.FIREBASE_PROJECT_ID) {
  storageOptions.projectId = process.env.FIREBASE_PROJECT_ID;
}

async function setCors() {
  try {
    const storage = new Storage(storageOptions);

    const corsConfig = JSON.parse(fs.readFileSync('./cors.json', 'utf8'));

    console.log(`📦 Targeting bucket: ${bucketName}`);
    console.log('🔧 Applying CORS config:', JSON.stringify(corsConfig, null, 2));

    const bucket = storage.bucket(bucketName);

    // Verify bucket exists first
    const [exists] = await bucket.exists();
    if (!exists) {
      console.error(`❌ Bucket "${bucketName}" was not found.`);
      console.error('   Common fixes:');
      console.error('   1. Make sure the service account has the "Storage Admin" role in GCP IAM.');
      console.error('   2. Verify VITE_FIREBASE_STORAGE_BUCKET in .env matches your Firebase Console → Storage bucket name.');
      console.error('   3. Firebase Storage must be enabled: https://console.firebase.google.com/project/' + process.env.FIREBASE_PROJECT_ID + '/storage');
      process.exit(1);
    }

    await bucket.setCorsConfiguration(corsConfig);
    console.log(`✅ CORS configuration applied successfully to: ${bucketName}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to set CORS configuration:');
    if (error.code === 403) {
      console.error('   Permission denied. Make sure the service account has the "Storage Admin" IAM role.');
      console.error('   Go to: https://console.cloud.google.com/iam-admin/iam?project=' + process.env.FIREBASE_PROJECT_ID);
    } else if (error.code === 404) {
      console.error('   Bucket not found. Check VITE_FIREBASE_STORAGE_BUCKET in your .env file.');
    } else {
      console.error(error.message || error);
    }
    process.exit(1);
  }
}

setCors();
