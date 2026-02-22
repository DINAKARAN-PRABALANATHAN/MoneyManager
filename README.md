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

## Deployment (Vercel)

1. Push code to GitHub
2. Import repo in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy

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
