# 💰 Money Manager

A personal finance tracking app built with React and Firebase, available on Web and iOS.

## Features

- **Transaction Tracking** - Record expenses, income, and transfers
- **Categories & Accounts** - Customizable categories and payment methods
- **Statistics** - Pie charts showing spending breakdown by category
- **Family Sharing** - Share transactions with family members via invite code
- **Bill Attachments** - Upload receipts to Google Drive (private storage)
- **Export Data** - Download transactions as Excel or CSV
- **Multi-view** - Daily, monthly, yearly, and custom date range views

## Tech Stack

- React 19 + Vite
- Firebase Authentication (Google + Email/Password)
- Cloud Firestore
- Google Drive API
- Chart.js
- Capacitor (iOS/Android)

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/MoneyManager.git
cd MoneyManager
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Firebase

Create a `.env` file in the root directory:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Firebase Console Setup

1. Create a project at [Firebase Console](https://console.firebase.google.com)
2. Enable **Authentication** → Google and Email/Password providers
3. Create **Firestore Database**
4. Apply security rules from `firestore.rules`
5. Enable **Google Drive API** in Google Cloud Console

### 5. Run locally

```bash
npm run dev
```

## Web Deployment (Cloudflare Pages)

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### Step 2: Create Cloudflare Pages Project

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click **Workers & Pages** → **Create** → **Pages** tab
3. Click **Connect to Git** and select your repository

### Step 3: Configure Build Settings

| Setting | Value |
|---------|-------|
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |

### Step 4: Add Environment Variables

Add these in **Settings** → **Environment variables**:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

### Step 5: Deploy

Click **Save and Deploy**. Your site will be live at `your-project.pages.dev`

### Step 6: Update Firebase Auth

Add your Cloudflare domain to Firebase:

1. Firebase Console → **Authentication** → **Settings**
2. **Authorized domains** → **Add domain**
3. Add: `your-project.pages.dev`

## iOS App Setup

> **Note:** The `ios/` and `android/` folders are NOT included in the repository for security reasons. They contain `GoogleService-Info.plist` (iOS) and `google-services.json` (Android) which have Firebase API keys. Each developer must generate these folders locally.

### Prerequisites

- macOS with Xcode installed
- Apple Developer account (free or paid)
- iPhone connected via USB

### Step 1: Add iOS Platform

```bash
npm run build
npx cap add ios
```

This creates the `ios/` folder locally on your machine.

### Step 2: Configure Google Sign-In for iOS

1. Go to [Firebase Console](https://console.firebase.google.com) → Your project
2. Add an iOS app with your Bundle ID (e.g., `com.yourname.moneymanager`)
3. Download `GoogleService-Info.plist`
4. Copy it to `ios/App/App/GoogleService-Info.plist`

### Step 3: Add URL Schemes

In `ios/App/App/Info.plist`, add URL schemes for Google Sign-In:
- iOS Client ID (reversed): `com.googleusercontent.apps.YOUR_IOS_CLIENT_ID`
- Web Client ID (reversed): `com.googleusercontent.apps.YOUR_WEB_CLIENT_ID`

### Step 4: Build and Run

```bash
npx cap sync ios
npx cap open ios
```

In Xcode:
1. Select your iPhone from the device dropdown
2. Set your Team in **Signing & Capabilities**
3. Click **Play** to build and install

### Sharing with Family (without App Store)

**Option 1: Direct Install via Xcode**
- Connect each family member's iPhone to your Mac
- Run the app from Xcode
- App expires after 7 days (free account) or 1 year (paid account)

**Option 2: TestFlight (requires $99/year Apple Developer account)**
- Archive the app in Xcode
- Upload to App Store Connect
- Invite family via TestFlight

## Project Structure

```
├── src/
│   ├── context/
│   │   └── AuthContext.jsx    # Authentication state
│   ├── hooks/
│   │   ├── useFamily.js       # Family sharing logic
│   │   └── useTransactions.js # Transaction CRUD
│   ├── pages/
│   │   ├── Entry.jsx          # Add transactions
│   │   ├── Transactions.jsx   # View/edit transactions
│   │   ├── Stats.jsx          # Charts & statistics
│   │   ├── Family.jsx         # Family management
│   │   ├── Settings.jsx       # Categories & accounts
│   │   └── Login.jsx          # Authentication
│   ├── firebase.js            # Firebase config
│   └── App.jsx                # Routes & navigation
├── ios/                       # iOS native project
├── capacitor.config.json      # Capacitor config
└── firestore.rules            # Firestore security rules
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run ios` | Build and open iOS project |
| `npm run mobile:sync` | Sync web changes to mobile |

## License

MIT
