import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  ShieldCheck,
  ArrowUpCircle,
} from 'lucide-react';
import {
  APP_CURRENT_VERSION,
  checkGitHubRelease,
  downloadApkFile,
  installDownloadedApk,
  ReleaseInfo,
} from '../services/updateService';

interface AppUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [downloadedBytes, setDownloadedBytes] = useState<number>(0);
  const [totalBytes, setTotalBytes] = useState<number>(0);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setIsDownloaded(false);
      setIsDownloading(false);
      setProgressPercent(0);
      handleCheckUpdates();
    }
  }, [isOpen]);

  const handleCheckUpdates = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const info = await checkGitHubRelease();
      setReleaseInfo(info);
    } catch (err: any) {
      setErrorMessage(err.message || 'No se pudo verificar actualizaciones.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!releaseInfo?.apkDownloadUrl) return;
    setIsDownloading(true);
    setIsDownloaded(false);
    setProgressPercent(0);
    setErrorMessage(null);

    try {
      await downloadApkFile(releaseInfo.apkDownloadUrl, (progress, dlBytes, totBytes) => {
        setProgressPercent(progress);
        setDownloadedBytes(dlBytes);
        setTotalBytes(totBytes);
      });
      setIsDownloaded(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al descargar el archivo de actualización.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleInstall = async () => {
    if (!releaseInfo?.apkDownloadUrl) return;
    setIsInstalling(true);
    setErrorMessage(null);
    try {
      await installDownloadedApk(releaseInfo.apkDownloadUrl);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al ejecutar el instalador.');
    } finally {
      setIsInstalling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Actualizaciones de KronoTask</h3>
              <p className="text-[11px] text-slate-500">Versión y mantenimiento de la app</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Current Version Bar */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Versión instalada
              </span>
              <span className="text-sm font-black text-slate-800">v{APP_CURRENT_VERSION}</span>
            </div>
            <button
              type="button"
              onClick={handleCheckUpdates}
              disabled={isLoading || isDownloading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
              <span>{isLoading ? 'Comprobando...' : 'Comprobar'}</span>
            </button>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Main Status & Actions */}
          {releaseInfo && !isLoading && (
            <>
              {releaseInfo.hasUpdate ? (
                /* Nueva versión disponible */
                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white inline-block mb-1">
                        ¡Nueva versión disponible!
                      </span>
                      <h4 className="text-base font-black text-slate-900">
                        KronoTask v{releaseInfo.latestVersion}
                      </h4>
                      {releaseInfo.apkSizeMb && (
                        <p className="text-[11px] text-slate-500 font-medium">
                          Tamaño: {releaseInfo.apkSizeMb} MB
                        </p>
                      )}
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                      <ArrowUpCircle className="w-6 h-6" />
                    </div>
                  </div>

                  {releaseInfo.releaseNotes && (
                    <div className="bg-white/80 p-3 rounded-xl border border-blue-100 text-[11px] text-slate-700 max-h-32 overflow-y-auto whitespace-pre-wrap font-sans">
                      <p className="font-bold text-slate-900 mb-1">Novedades:</p>
                      {releaseInfo.releaseNotes}
                    </div>
                  )}

                  {/* Progress bar while downloading */}
                  {isDownloading && (
                    <div className="p-3.5 bg-white border border-blue-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                        <span className="flex items-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                          Descargando en la app...
                        </span>
                        <span className="font-mono">{progressPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-blue-600 h-full transition-all duration-150"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      {totalBytes > 0 && (
                        <p className="text-[10px] text-slate-500 text-right font-mono">
                          {(downloadedBytes / (1024 * 1024)).toFixed(1)} MB de {(totalBytes / (1024 * 1024)).toFixed(1)} MB
                        </p>
                      )}
                    </div>
                  )}

                  {/* Success state after download */}
                  {isDownloaded && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold">
                        Actualización descargada correctamente. Lista para instalar.
                      </span>
                    </div>
                  )}

                  {/* Actions: Download or Install */}
                  {!isDownloaded ? (
                    <button
                      type="button"
                      onClick={handleDownload}
                      disabled={isDownloading}
                      className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      <span>{isDownloading ? 'Descargando...' : `Descargar actualización v${releaseInfo.latestVersion}`}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleInstall}
                      disabled={isInstalling}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <ArrowUpCircle className="w-4 h-4" />
                      <span>{isInstalling ? 'Iniciando instalador...' : 'Instalar actualización'}</span>
                    </button>
                  )}
                </div>
              ) : (
                /* Versión actual al día */
                <div className="p-5 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex flex-col items-center text-center space-y-2.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-emerald-950">
                      Tienes instalada la versión más reciente
                    </h4>
                    <p className="text-xs text-emerald-700 mt-1 font-medium">
                      KronoTask v{APP_CURRENT_VERSION} está completamente al día.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Loading state indicator */}
          {isLoading && !releaseInfo && (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <p className="text-xs font-semibold">Buscando actualizaciones...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
