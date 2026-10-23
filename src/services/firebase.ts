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
 * Opens Google OAuth Account Picker popup to get OAuth access token directly from accounts.google.com
 */
async function getGoogleOAuthTokenDirectly(): Promise<{ accessToken: string; profile: UserProfile }> {
  return new Promise((resolve, reject) => {
    const clientId = firebaseConfig.oAuthClientId;
    const redirectUri = window.location.origin;
    const scope = 'openid profile email';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=token&client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(
      scope
    )}&prompt=select_account`;

    const popup = window.open(authUrl, 'google_oauth_popup', 'width=500,height=600');
    if (!popup) {
      return reject(new Error('El navegador bloqueó la ventana emergente de Google. Permita las ventanas emergentes e intente de nuevo.'));
    }

    const timer = setInterval(async () => {
      try {
        if (popup.closed) {
          clearInterval(timer);
          reject(new Error('La ventana de selección de cuenta de Google se cerró antes de completar.'));
          return;
        }

        if (popup.location.href.includes('access_token=')) {
          const hash = popup.location.hash.substring(1);
          const params = new URLSearchParams(hash);
          const accessToken = params.get('access_token');
          popup.close();
          clearInterval(timer);

          if (!accessToken) {
            return reject(new Error('No se recibió el token de acceso de Google.'));
          }

          // Fetch real user profile from Google API
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
        }
      } catch {
        // Cross-origin access restrictions while user is on accounts.google.com
      }
    }, 500);
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
      // Handle auth/unauthorized-domain or popup blocked by using direct Google OAuth Account Chooser
      if (
        authErr.code === 'auth/unauthorized-domain' ||
        authErr.code === 'auth/popup-blocked' ||
        authErr.code === 'auth/operation-not-supported-in-this-environment' ||
        authErr.message?.includes('unauthorized-domain')
      ) {
        console.info('Iniciando selector oficial de cuentas de Google mediante OAuth Directo...');
        const { accessToken, profile } = await getGoogleOAuthTokenDirectly();
        cachedAccessToken = accessToken;

        try {
          // Sign in to Firebase Auth using Google Access Token credential
          const credential = GoogleAuthProvider.credential(null, accessToken);
          const userCred = await signInWithCredential(auth, credential);
          return { user: userCred.user, accessToken, profile };
        } catch (credErr) {
          console.warn('Firebase credential signin notice:', credErr);
          // Return valid Google user profile authenticated via Google OAuth
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
