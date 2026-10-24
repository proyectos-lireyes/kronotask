import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  signInWithCredential,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  UserProfile,
  Board,
  TaskItem,
  CustomTag,
  CustomTypeDefinition,
  CustomPriorityDefinition,
} from '../types';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account',
});

let cachedAccessToken: string | null = null;

// Initialize GoogleAuth plugin for Native Android
if (Capacitor.isNativePlatform()) {
  try {
    GoogleAuth.initialize({
      clientId: firebaseConfig.oAuthClientId,
      scopes: ['profile', 'email'],
      grantOfflineAccess: true,
    });
  } catch (e) {
    console.warn('GoogleAuth init notice:', e);
  }
}

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Standard Firebase Redirect Result Handler
  getRedirectResult(auth)
    .then((result) => {
      if (result && result.user) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const accessToken = credential?.accessToken || '';
        cachedAccessToken = accessToken;
        if (onAuthSuccess) {
          onAuthSuccess(result.user, accessToken);
        }
      }
    })
    .catch((err) => {
      console.warn('Redirect sign-in check notification:', err);
    });

  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken || '');
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export interface CloudUserData {
  uid: string;
  updatedAt: string;
  boards?: Board[];
  tasks?: TaskItem[];
  tags?: CustomTag[];
  customTypes?: CustomTypeDefinition[];
  customPriorities?: CustomPriorityDefinition[];
}

export async function saveUserDataToCloud(uid: string, data: Partial<CloudUserData>) {
  if (!uid) return;
  try {
    const userDocRef = doc(db, 'user_data', uid);
    await setDoc(
      userDocRef,
      {
        uid,
        updatedAt: new Date().toISOString(),
        ...data,
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('Error guardando copia de respaldo en la nube:', e);
  }
}

export async function fetchUserDataFromCloud(uid: string): Promise<Partial<CloudUserData> | null> {
  if (!uid) return null;
  try {
    const userDocRef = doc(db, 'user_data', uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as Partial<CloudUserData>;
    }
  } catch (e) {
    console.warn('Error recuperando respaldo de la nube:', e);
  }
  return null;
}

export const googleSignIn = async (): Promise<{ user: User; accessToken: string; profile: UserProfile } | null> => {
  const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

  // 1. Native Android App: Google Play Services Native Sign-In
  if (isNativeAndroid) {
    try {
      const googleUser = await GoogleAuth.signIn();
      const idToken = googleUser.authentication?.idToken || '';
      const accessToken = googleUser.authentication?.accessToken || '';

      const credential = GoogleAuthProvider.credential(idToken, accessToken);
      const userCred = await signInWithCredential(auth, credential);

      cachedAccessToken = accessToken || idToken;
      const profile: UserProfile = {
        uid: userCred.user.uid,
        displayName: userCred.user.displayName || googleUser.name || googleUser.email.split('@')[0],
        email: userCred.user.email || googleUser.email,
        photoURL: userCred.user.photoURL || googleUser.imageUrl,
      };

      return { user: userCred.user, accessToken: cachedAccessToken, profile };
    } catch (nativeErr: any) {
      console.warn('Native Android Google Auth notice:', nativeErr);
      if (nativeErr?.message?.includes('cancel') || nativeErr?.code === '12501') {
        return null; // User cancelled
      }
    }
  }

  // 2. Standard Web & Preview Flow: Pure Firebase Google Provider
  try {
    const result = await signInWithPopup(auth, provider);
    if (!result || !result.user) {
      return null;
    }

    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken || '';
    cachedAccessToken = accessToken;

    const profile: UserProfile = {
      uid: result.user.uid,
      displayName: result.user.displayName || result.user.email?.split('@')[0] || 'Usuario',
      email: result.user.email || '',
      photoURL: result.user.photoURL || undefined,
    };

    return { user: result.user, accessToken, profile };
  } catch (error: any) {
    if (
      error.code === 'auth/popup-blocked' ||
      error.code === 'auth/operation-not-supported-in-this-environment'
    ) {
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw error;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setAccessToken = (token: string) => {
  cachedAccessToken = token;
};

export const logout = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      await GoogleAuth.signOut();
    } catch (e) {
      console.warn('GoogleAuth signOut note:', e);
    }
  }
  await signOut(auth);
  cachedAccessToken = null;
};
