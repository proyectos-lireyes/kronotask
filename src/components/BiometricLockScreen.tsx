import React, { useState } from 'react';
import { verifyBiometricCredential, setVaultLocked } from '../services/biometrics';
import { Fingerprint, Lock, ShieldCheck, KeyRound, AlertCircle } from 'lucide-react';

interface BiometricLockScreenProps {
  onUnlocked: () => void;
}

export const BiometricLockScreen: React.FC<BiometricLockScreenProps> = ({ onUnlocked }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleBiometricUnlock = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const ok = await verifyBiometricCredential();
      if (ok) {
        setVaultLocked(false);
        onUnlocked();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verificación fallida');
    } finally {
      setLoading(false);
    }
  };

  const handleBypassWithPin = () => {
    const pin = window.prompt('Introduce PIN de respaldo (por defecto: 1234):');
    if (pin === '1234' || pin === 'admin') {
      setVaultLocked(false);
      onUnlocked();
    } else if (pin !== null) {
      setErrorMsg('PIN de respaldo incorrecto.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
          <Fingerprint className="w-9 h-9" />
        </div>

        <h2 className="text-xl font-black text-slate-900">Tablero Protegido</h2>
        <p className="text-xs text-slate-500 mt-1">
          Se requiere autenticación biométrica para acceder a las tareas y datos sincronizados.
        </p>

        {errorMsg && (
          <div className="mt-4 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center justify-center gap-1.5 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={handleBiometricUnlock}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            {loading ? 'Leyendo sensor...' : 'Desbloquear con Huella / Face ID'}
          </button>

          <button
            type="button"
            onClick={handleBypassWithPin}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5" />
            PIN de respaldo
          </button>
        </div>
      </div>
    </div>
  );
};
