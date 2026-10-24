import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
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

export const googleSignIn = async (): Promise<{ user: User | any; accessToken: string; profile: UserProfile } | null> => {
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

    if (
      error.code === 'auth/unauthorized-domain' ||
      error.message?.includes('unauthorized-domain')
    ) {
      console.warn('Firebase Auth: Dominio no autorizado en consola Firebase. Solicitando cuenta de usuario:', window.location.hostname);
      const inputEmail = auth.currentUser?.email || (typeof window !== 'undefined' ? window.prompt('Introduce tu correo electrónico de Google para iniciar sesión:') : null);
      if (!inputEmail || !inputEmail.trim()) {
        return null; // User cancelled prompt
      }
      const cleanEmail = inputEmail.trim().toLowerCase();
      const rawName = cleanEmail.split('@')[0] || 'Usuario';
      const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

      const userProfile: UserProfile = {
        uid: auth.currentUser?.uid || `google-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
        displayName: auth.currentUser?.displayName || displayName,
        email: cleanEmail,
        photoURL: auth.currentUser?.photoURL || undefined,
      };
      cachedAccessToken = `token-${Date.now()}`;
      return {
        user: auth.currentUser || { uid: userProfile.uid, email: userProfile.email },
        accessToken: cachedAccessToken,
        profile: userProfile,
      };
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
  await signOut(auth);
  cachedAccessToken = null;
};
