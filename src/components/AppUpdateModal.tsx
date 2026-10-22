import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Github,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import {
  APP_CURRENT_VERSION,
  FIXED_GITHUB_REPO,
  checkGitHubRelease,
  startApkUpdate,
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
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [downloadedBytes, setDownloadedBytes] = useState<number>(0);
  const [totalBytes, setTotalBytes] = useState<number>(0);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setDownloadSuccess(false);
      setProgressPercent(0);
      handleCheckUpdates();
    }
  }, [isOpen]);

  const handleCheckUpdates = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const info = await checkGitHubRelease(FIXED_GITHUB_REPO);
      setReleaseInfo(info);
    } catch (err: any) {
      setErrorMessage(err.message || 'No se pudo verificar actualizaciones.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadAndInstall = async () => {
    if (!releaseInfo?.apkDownloadUrl) return;
    setIsDownloading(true);
    setProgressPercent(0);
    setErrorMessage(null);

    try {
      await startApkUpdate(releaseInfo.apkDownloadUrl, (progress, dlBytes, totBytes) => {
        setProgressPercent(progress);
        setDownloadedBytes(dlBytes);
        setTotalBytes(totBytes);
      });
      setDownloadSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al descargar el archivo APK.');
    } finally {
      setIsDownloading(false);
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
              <p className="text-[11px] text-slate-500">Compilación APK & GitHub Releases</p>
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
          {/* Current Version Card */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Versión Instalada
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
              <span>{isLoading ? 'Comprobando...' : 'Buscar'}</span>
            </button>
          </div>

          {/* Fixed GitHub Repository Display */}
          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <Github className="w-3.5 h-3.5 text-slate-800" />
                Repositorio Oficial CI/CD:
              </label>
              <a
                href={`https://github.com/${FIXED_GITHUB_REPO}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
              >
                <span>Ver repo</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <p className="text-xs font-mono font-bold text-slate-800 truncate">
                {FIXED_GITHUB_REPO}
              </p>
            </div>
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

          {/* Download Progress */}
          {isDownloading && (
            <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                <span>Descargando actualización...</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-150"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {totalBytes > 0 && (
                <p className="text-[10px] text-blue-700 text-right font-mono">
                  {(downloadedBytes / (1024 * 1024)).toFixed(1)} MB / {(totalBytes / (1024 * 1024)).toFixed(1)} MB
                </p>
              )}
            </div>
          )}

          {/* Success Download */}
          {downloadSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>APK descargado con éxito. Iniciando instalador de Android...</span>
            </div>
          )}

          {/* Release info card */}
          {releaseInfo && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800">
                      Último Release: v{releaseInfo.latestVersion}
                    </span>
                    {releaseInfo.hasUpdate ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        ¡Nueva versión!
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                        Al día
                      </span>
                    )}
                  </div>
                  {releaseInfo.apkSizeMb && (
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      Tamaño APK: {releaseInfo.apkSizeMb} MB
                    </span>
                  )}
                </div>

                <a
                  href={`https://github.com/${FIXED_GITHUB_REPO}/releases`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200/60"
                  title="Ver releases en GitHub"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {releaseInfo.releaseNotes && (
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 text-[11px] text-slate-700 max-h-28 overflow-y-auto whitespace-pre-wrap font-sans">
                  {releaseInfo.releaseNotes}
                </div>
              )}

              {releaseInfo.hasUpdate ? (
                <button
                  type="button"
                  onClick={handleDownloadAndInstall}
                  disabled={isDownloading}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-200 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar e Instalar APK v{releaseInfo.latestVersion}</span>
                </button>
              ) : (
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700 py-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Tienes instalada la versión más reciente.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-[10px] text-slate-400">Android Capacitor 1.0</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
