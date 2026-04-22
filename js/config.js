/* ============================================================
   Firebase Configuration
   ============================================================
   
   SETUP INSTRUCTIONS:
   1. Go to https://console.firebase.google.com/
   2. Click "Add project" → name it anything (e.g. "nptel-quiz")
   3. Skip Google Analytics (optional)
   4. In your project: Build → Realtime Database → Create Database
   5. Choose any location, start in "Test mode"
   6. Go to Project Settings (⚙️ gear icon) → Your apps → Add app (Web </>)
   7. Register app, copy the firebaseConfig values below
   8. Replace ALL placeholder values with your actual values
   9. Save this file and push to GitHub

   ============================================================ */

const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL:       "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

// ── Auto-detects if Firebase is properly configured ──────────
const FIREBASE_ENABLED = (
  FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY" &&
  FIREBASE_CONFIG.databaseURL !== "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com" &&
  FIREBASE_CONFIG.databaseURL.length > 10
);

// Path in Firebase Realtime Database where exams are stored
const DB_PATH = "nptel-exams";
