# 💰 Money Manager

A personal finance tracking web app built with React and Firebase.

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

## Deployment (Cloudflare Pages)

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

## Project Structure

```
src/
├── context/
│   └── AuthContext.jsx    # Authentication state
├── hooks/
│   ├── useFamily.js       # Family sharing logic
│   └── useTransactions.js # Transaction CRUD
├── pages/
│   ├── Entry.jsx          # Add transactions
│   ├── Transactions.jsx   # View/edit transactions
│   ├── Stats.jsx          # Charts & statistics
│   ├── Family.jsx         # Family management
│   ├── Settings.jsx       # Categories & accounts
│   └── Login.jsx          # Authentication
├── firebase.js            # Firebase config
└── App.jsx                # Routes & navigation
```

## License

MIT
