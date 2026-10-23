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
import { Capacitor } from '@capacitor/core';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile } from '../types';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account',
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Check if returning from a mobile redirect sign-in flow
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

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // User logged in from previous session
        if (onAuthSuccess) onAuthSuccess(user, '');
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string; profile: UserProfile } | null> => {
  try {
    isSigningIn = true;

    const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

    // On Native Android WebViews, signInWithPopup is blocked by Google or WebView window management.
    // We try popup first, but automatically fallback to redirect if popup fails or on mobile.
    let result: any = null;
    if (isNativeAndroid) {
      try {
        result = await signInWithPopup(auth, provider);
      } catch (popupErr: any) {
        console.info('signInWithPopup en Android falló, activando signInWithRedirect:', popupErr);
        await signInWithRedirect(auth, provider);
        return null; // Page will redirect to Google Auth and return
      }
    } else {
      try {
        result = await signInWithPopup(auth, provider);
      } catch (popupErr: any) {
        if (
          popupErr.code === 'auth/popup-blocked' ||
          popupErr.code === 'auth/operation-not-supported-in-this-environment'
        ) {
          await signInWithRedirect(auth, provider);
          return null;
        }
        throw popupErr;
      }
    }

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
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
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
