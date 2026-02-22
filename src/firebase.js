import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, initializeAuth, indexedDBLocalPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { Capacitor } from '@capacitor/core'

// Firebase config from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

const app = initializeApp(firebaseConfig)

// Use different auth initialization for native vs web
export const auth = Capacitor.isNativePlatform()
  ? initializeAuth(app, { persistence: indexedDBLocalPersistence })
  : getAuth(app)

// Add Drive scope to access Google Drive
export const googleProvider = new GoogleAuthProvider()
googleProvider.addScope('https://www.googleapis.com/auth/drive.file')

export const db = getFirestore(app)

// Google Drive API helper
const FOLDER_NAME = 'MoneyManager_Bills'

const getOrCreateFolder = async (accessToken) => {
  // Check if folder exists
  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const searchData = await searchResponse.json()
  
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id
  }
  
  // Create folder if not exists
  const createResponse = await fetch(
    'https://www.googleapis.com/drive/v3/files',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder'
      })
    }
  )
  const folder = await createResponse.json()
  return folder.id
}

export const uploadToDrive = async (file, accessToken) => {
  const folderId = await getOrCreateFolder(accessToken)
  
  const metadata = {
    name: `${Date.now()}_${file.name}`,
    mimeType: file.type,
    parents: [folderId]
  }

  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', file)

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webContentLink,webViewLink',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form
    }
  )

  if (!response.ok) {
    throw new Error('Failed to upload to Google Drive')
  }

  const data = await response.json()
  
  // File stays PRIVATE by default - only the uploader can access
  // We return the file ID to store in Firestore
  // For viewing, user must be logged into Google with access
  
  return { 
    fileId: data.id, 
    viewLink: data.webViewLink,
    // Store direct download link for owner
    downloadLink: data.webContentLink
  }
}
