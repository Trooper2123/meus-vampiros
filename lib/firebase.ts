import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, type Auth, type UserCredential } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.apiKey,
  authDomain: process.env.authDomain,
  projectId: process.env.projectId,
  storageBucket: process.env.storageBucket,
  messagingSenderId: process.env.messagingSenderId,
  appId: process.env.appId,
}

const requiredConfigKeys = ['apiKey', 'authDomain', 'projectId', 'appId'] as const

function getFirebaseApp(): FirebaseApp {
  const missingKeys = requiredConfigKeys.filter((key) => !firebaseConfig[key])

  if (missingKeys.length > 0) {
    throw new Error(`Firebase não configurado. Variáveis ausentes: ${missingKeys.join(', ')}`)
  }

  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp())
}

export async function signIn(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(getFirebaseAuth(), email, password)
}

export async function createAccount(email: string, password: string): Promise<UserCredential> {
  return createUserWithEmailAndPassword(getFirebaseAuth(), email, password)
}
