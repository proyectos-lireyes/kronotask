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

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize GoogleAuth for Native Android
if (Capacitor.isNativePlatform()) {
  try {
    GoogleAuth.initialize({
      clientId: firebaseConfig.oAuthClientId,
      scopes: ['profile', 'email'],
      grantOfflineAccess: true,
    });
  } catch (e) {
    console.warn('GoogleAuth initialize note:', e);
  }
}

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

/**
 * Loads Google Identity Services (GIS) library dynamically for Web & Preview environments
 */
async function requestGoogleTokenViaGIS(): Promise<{ accessToken: string; profile: UserProfile }> {
  return new Promise((resolve, reject) => {
    const runGIS = () => {
      try {
        const googleObj = (window as any).google;
        if (!googleObj || !googleObj.accounts || !googleObj.accounts.oauth2) {
          return reject(new Error('No se pudo inicializar la librería de inicio de sesión de Google.'));
        }

        const client = googleObj.accounts.oauth2.initTokenClient({
          client_id: firebaseConfig.oAuthClientId,
          scope: 'openid profile email',
          prompt: 'select_account',
          callback: async (response: any) => {
            if (response.error) {
              return reject(new Error(response.error_description || response.error));
            }
            if (!response.access_token) {
              return reject(new Error('No se recibió la autorización de cuenta de Google.'));
            }

            try {
              const accessToken = response.access_token;
              // Fetch user profile info directly from Google's UserInfo API
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              const googleUser = await res.json();

              const profile: UserProfile = {
                uid: googleUser.sub || `google-${Date.now()}`,
                displayName: googleUser.name || googleUser.given_name || 'Usuario Google',
                email: googleUser.email || '',
                photoURL: googleUser.picture || undefined,
              };

              resolve({ accessToken, profile });
            } catch (fetchErr) {
              reject(fetchErr);
            }
          },
          error_callback: (err: any) => {
            reject(new Error(err?.message || 'Selección de cuenta cancelada.'));
          },
        });

        client.requestAccessToken();
      } catch (e: any) {
        reject(e);
      }
    };

    if ((window as any).google?.accounts?.oauth2) {
      runGIS();
    } else {
      const existingScript = document.getElementById('google-gis-script');
      if (existingScript) {
        existingScript.addEventListener('load', runGIS);
      } else {
        const script = document.createElement('script');
        script.id = 'google-gis-script';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => runGIS();
        script.onerror = () => reject(new Error('No se pudo cargar Google Identity Services. Compruebe su conexión.'));
        document.head.appendChild(script);
      }
    }
  });
}

export const googleSignIn = async (): Promise<{ user: User | any; accessToken: string; profile: UserProfile } | null> => {
  try {
    isSigningIn = true;
    const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

    // 1. Native Android Google Sign-In via Google Play Services
    if (isNativeAndroid) {
      try {
        const googleUser = await GoogleAuth.signIn();
        const idToken = googleUser.authentication?.idToken || '';
        const accessToken = googleUser.authentication?.accessToken || '';

        cachedAccessToken = accessToken || idToken;

        // Sign in to Firebase Auth using Native Google Credential
        const credential = GoogleAuthProvider.credential(idToken, accessToken);
        const userCred = await signInWithCredential(auth, credential);

        const profile: UserProfile = {
          uid: userCred.user.uid,
          displayName: userCred.user.displayName || googleUser.name || googleUser.email.split('@')[0],
          email: userCred.user.email || googleUser.email,
          photoURL: userCred.user.photoURL || googleUser.imageUrl,
        };

        return { user: userCred.user, accessToken: cachedAccessToken, profile };
      } catch (nativeErr: any) {
        console.warn('Native Android Google Auth error, falling back to GIS / Popup:', nativeErr);
      }
    }

    // 2. Standard Web / Preview Google Auth Flow
    let result: any = null;
    try {
      result = await signInWithPopup(auth, provider);
    } catch (authErr: any) {
      // Handle auth/unauthorized-domain or popup blocked using official Google Identity Services (GIS) Account Selector
      if (
        authErr.code === 'auth/unauthorized-domain' ||
        authErr.code === 'auth/popup-blocked' ||
        authErr.code === 'auth/operation-not-supported-in-this-environment' ||
        authErr.message?.includes('unauthorized-domain')
      ) {
        console.info('Iniciando selector oficial Google Identity Services (GIS)...');
        const { accessToken, profile } = await requestGoogleTokenViaGIS();
        cachedAccessToken = accessToken;

        try {
          // Authenticate with Firebase Auth using Google OAuth Access Token
          const credential = GoogleAuthProvider.credential(null, accessToken);
          const userCred = await signInWithCredential(auth, credential);
          return { user: userCred.user, accessToken, profile };
        } catch (credErr) {
          console.warn('Firebase credential signin note:', credErr);
          return {
            user: { uid: profile.uid, email: profile.email, displayName: profile.displayName, photoURL: profile.photoURL },
            accessToken,
            profile,
          };
        }
      }

      throw authErr;
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
    console.error('Real Google Sign in error:', error);
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
