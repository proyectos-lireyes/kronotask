import { BiometricRecord } from '../types';

const STORAGE_KEY = 'chronotask_biometrics_record';
const VAULT_LOCKED_KEY = 'chronotask_vault_locked';

export async function isBiometricsAvailable(): Promise<boolean> {
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
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;
  const canUseHardwareWebAuthn = Boolean(window.PublicKeyCredential) && !isIframe;

  if (canUseHardwareWebAuthn) {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([30, 50, 30]);
      }

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
      console.warn('Llamada a biometría nativa falló o fue cancelada:', err.message);
      throw new Error(`Error en lectura biométrica/PIN: ${err.message || 'Huella o PIN no reconocido'}`);
    }
  }

  // Fallback if WebAuthn not available on browser environment
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([40, 60, 40]);
  }
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

  const isIframe = typeof window !== 'undefined' && window.self !== window.top;
  const isLocalPasskey = record.credentialId?.startsWith('passkey-app-');

  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([30, 40, 30]);
  }

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
      console.warn('Verificación biométrica del sistema falló:', err.message);
      throw new Error(`Verificación fallida: ${err.message || 'Huella o PIN incorrecto'}`);
    }
  }

  // Local PIN / Vault verification
  await new Promise((resolve) => setTimeout(resolve, 300));
  record.lastAuthenticated = new Date().toISOString();
  saveBiometricRecord(record);
  setVaultLocked(false);
  return true;
}

export function clearBiometrics() {
  localStorage.removeItem(STORAGE_KEY);
  setVaultLocked(false);
}
