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

/**
 * Loads Google Identity Services (GIS) library dynamically and triggers Google Account Chooser
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

    let result: any = null;
    try {
      if (isNativeAndroid) {
        try {
          result = await signInWithPopup(auth, provider);
        } catch (popupErr: any) {
          console.info('signInWithPopup en Android WebView, redireccionando a Google Auth:', popupErr);
          await signInWithRedirect(auth, provider);
          return null;
        }
      } else {
        result = await signInWithPopup(auth, provider);
      }
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
  await signOut(auth);
  cachedAccessToken = null;
};
