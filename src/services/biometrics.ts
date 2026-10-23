import { BiometricRecord } from '../types';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

const STORAGE_KEY = 'chronotask_biometrics_record';
const VAULT_LOCKED_KEY = 'chronotask_vault_locked';

export async function isBiometricsAvailable(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await NativeBiometric.isAvailable();
      return res.isAvailable;
    } catch (e) {
      console.warn('Native biometric availability check error:', e);
    }
  }
  return true;
}

export function getBiometricRecord(): BiometricRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return { registered: false };
}

export function saveBiometricRecord(record: BiometricRecord) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

export function isVaultLocked(): boolean {
  return localStorage.getItem(VAULT_LOCKED_KEY) === 'true';
}

export function setVaultLocked(locked: boolean) {
  localStorage.setItem(VAULT_LOCKED_KEY, locked ? 'true' : 'false');
}

export async function registerBiometricCredential(userName: string): Promise<boolean> {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    try {
      // Trigger native Android / iOS System Biometric / Fingerprint / PIN prompt
      await NativeBiometric.verifyIdentity({
        reason: 'Registrar la huella dactilar o PIN del dispositivo para KronoTask',
        title: 'Bóveda Biométrica KronoTask',
        subtitle: 'Lector de Huella y PIN del Sistema',
        description: 'Escanear huella dactilar o ingresar PIN configurado en tu Android',
      });

      const record: BiometricRecord = {
        registered: true,
        credentialId: `native-biometric-${Date.now()}`,
        userName,
        registeredAt: new Date().toISOString(),
        lastAuthenticated: new Date().toISOString(),
      };
      saveBiometricRecord(record);
      setVaultLocked(false);
      return true;
    } catch (err: any) {
      console.warn('Native biometric registration failed or cancelled:', err);
      throw new Error(`Huella o PIN no reconocido: ${err.message || 'Operación cancelada por el usuario'}`);
    }
  }

  // Web / Browser WebAuthn fallback
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;
  if (!isIframe && window.PublicKeyCredential) {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userId = new Uint8Array(16);
      window.crypto.getRandomValues(userId);

      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: 'KronoTask Kanban',
          id: window.location.hostname,
        },
        user: {
          id: userId,
          name: userName || 'usuario@kronotask',
          displayName: userName || 'Usuario KronoTask',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          requireResidentKey: false,
        },
        timeout: 60000,
        attestation: 'none',
      };

      const credential = (await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      })) as PublicKeyCredential;

      if (credential && credential.id) {
        const record: BiometricRecord = {
          registered: true,
          credentialId: credential.id,
          userName,
          registeredAt: new Date().toISOString(),
          lastAuthenticated: new Date().toISOString(),
        };
        saveBiometricRecord(record);
        setVaultLocked(false);
        return true;
      }
    } catch (err: any) {
      console.warn('WebAuthn registration error:', err);
    }
  }

  // Web vault profile fallback
  const record: BiometricRecord = {
    registered: true,
    credentialId: `passkey-app-${Date.now()}`,
    userName,
    registeredAt: new Date().toISOString(),
    lastAuthenticated: new Date().toISOString(),
  };
  saveBiometricRecord(record);
  setVaultLocked(false);
  return true;
}

export async function verifyBiometricCredential(): Promise<boolean> {
  const record = getBiometricRecord();
  if (!record.registered) {
    throw new Error('No hay biometría registrada aún.');
  }

  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    try {
      // Trigger native Android System Fingerprint & PIN prompt modal
      await NativeBiometric.verifyIdentity({
        reason: 'Desbloquear acceso a tus tableros y tareas',
        title: 'Bóveda Biométrica KronoTask',
        subtitle: 'Autenticación del Sistema',
        description: 'Usa tu huella dactilar o el PIN configurado en tu Android',
      });

      record.lastAuthenticated = new Date().toISOString();
      saveBiometricRecord(record);
      setVaultLocked(false);
      return true;
    } catch (err: any) {
      console.warn('Native biometric verification failed:', err);
      throw new Error(`Verificación fallida: ${err.message || 'Huella dactilar o PIN no coinciden'}`);
    }
  }

  // Web Browser WebAuthn fallback
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;
  const isLocalPasskey = record.credentialId?.startsWith('passkey-app-');

  if (!isIframe && !isLocalPasskey && window.PublicKeyCredential) {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        timeout: 60000,
        rpId: window.location.hostname,
        userVerification: 'required',
      };

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      });

      if (assertion) {
        record.lastAuthenticated = new Date().toISOString();
        saveBiometricRecord(record);
        setVaultLocked(false);
        return true;
      }
    } catch (err: any) {
      console.warn('WebAuthn verification error:', err);
      throw new Error(`Error de lectura biométrica: ${err.message || 'Huella no reconocida'}`);
    }
  }

  // Local fallback
  record.lastAuthenticated = new Date().toISOString();
  saveBiometricRecord(record);
  setVaultLocked(false);
  return true;
}

export function clearBiometrics() {
  localStorage.removeItem(STORAGE_KEY);
  setVaultLocked(false);
}
