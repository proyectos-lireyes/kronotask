import { registerPlugin, Capacitor } from '@capacitor/core';

export interface AppUpdaterPluginInterface {
  downloadApk(options: { url: string }): Promise<{ success: boolean; path?: string }>;
  installApk(): Promise<{ success: boolean }>;
  downloadAndInstall(options: { url: string }): Promise<{ success: boolean }>;
  addListener(
    eventName: 'downloadProgress',
    listenerFunc: (data: { progress: number; bytesDownloaded: number; totalBytes: number }) => void
  ): Promise<{ remove: () => void }>;
  addListener(
    eventName: 'downloadComplete',
    listenerFunc: (data: { success: boolean }) => void
  ): Promise<{ remove: () => void }>;
}

export const AppUpdater = registerPlugin<AppUpdaterPluginInterface>('AppUpdater');

export const APP_CURRENT_VERSION = (import.meta as any).env?.VITE_APP_VERSION || '1.0.0';
export const FIXED_GITHUB_REPO = 'proyectos-lireyes/kronotask';

export function compareVersions(v1: string, v2: string): number {
  const cleanV1 = v1.replace(/^v/i, '').split('.').map((p) => parseInt(p, 10) || 0);
  const cleanV2 = v2.replace(/^v/i, '').split('.').map((p) => parseInt(p, 10) || 0);

  const maxLen = Math.max(cleanV1.length, cleanV2.length);
  for (let i = 0; i < maxLen; i++) {
    const num1 = cleanV1[i] || 0;
    const num2 = cleanV2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

export interface ReleaseInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseNotes: string;
  apkDownloadUrl: string;
  apkSizeMb?: number;
  publishedAt?: string;
  releaseName?: string;
}

export function cleanReleaseNotes(rawBody: string | undefined): string {
  if (!rawBody || !rawBody.trim()) {
    return '• Mejoras de estabilidad, rendimiento y corrección de errores.';
  }

  const lines = rawBody.split('\n');
  const filteredLines = lines
    .map((l) => l.trim())
    .filter((l) => {
      if (!l) return false;
      // Filter out download links and raw URLs
      if (/^👉?\s*\[.*descargar.*\]/i.test(l)) return false;
      if (/app-release\.apk/i.test(l)) return false;
      if (/^##+\s*.*KronoTask/i.test(l)) return false;
      if (/^https?:\/\//i.test(l)) return false;
      if (/^\*\*Full Changelog\*\*/i.test(l)) return false;
      return true;
    });

  if (filteredLines.length === 0) {
    return '• Mejoras de estabilidad, rendimiento y corrección de errores.';
  }

  return filteredLines.join('\n');
}

export async function checkGitHubRelease(repo = FIXED_GITHUB_REPO): Promise<ReleaseInfo> {
  const cleanRepo = repo.replace(/^https?:\/\/github\.com\//i, '').replace(/\/$/, '').trim();

  const response = await fetch(`https://api.github.com/repos/${cleanRepo}/releases/latest`, {
    headers: { Accept: 'application/vnd.github.v3+json' },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Aún no hay ningún release publicado en "${cleanRepo}". Al compilar en GitHub Actions se generará automáticamente.`);
    }
    throw new Error(`Error ${response.status} al consultar actualizaciones.`);
  }

  const data = await response.json();
  const latestTag = data.tag_name || '1.0.0';

  // Find APK in assets
  const apkAsset = data.assets?.find((a: any) => a.name?.toLowerCase().endsWith('.apk'));
  const apkDownloadUrl =
    apkAsset?.browser_download_url ||
    `https://github.com/${cleanRepo}/releases/latest/download/app-release.apk`;

  const hasUpdate = compareVersions(latestTag, APP_CURRENT_VERSION) > 0;

  return {
    hasUpdate,
    currentVersion: APP_CURRENT_VERSION,
    latestVersion: latestTag.replace(/^v/i, ''),
    releaseNotes: cleanReleaseNotes(data.body),
    apkDownloadUrl,
    apkSizeMb: apkAsset?.size ? Math.round((apkAsset.size / (1024 * 1024)) * 10) / 10 : undefined,
    publishedAt: data.published_at,
    releaseName: data.name || latestTag,
  };
}

let cachedDownloadedBlobUrl: string | null = null;

export async function downloadApkFile(
  apkUrl: string,
  onProgress?: (progress: number, bytesDownloaded: number, totalBytes: number) => void
): Promise<void> {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    let progressSub: any;
    try {
      progressSub = await AppUpdater.addListener('downloadProgress', (data) => {
        onProgress?.(data.progress, data.bytesDownloaded, data.totalBytes);
      });

      await AppUpdater.downloadApk({ url: apkUrl });
    } finally {
      if (progressSub && typeof progressSub.remove === 'function') {
        progressSub.remove();
      }
    }
  } else {
    // Web environment: stream fetch or simulated realistic progress
    try {
      const response = await fetch(apkUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 15 * 1024 * 1024;
      let loaded = 0;

      if (response.body) {
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            loaded += value.length;
            const pct = Math.min(100, Math.round((loaded / total) * 100));
            onProgress?.(pct, loaded, total);
          }
        }
        const blob = new Blob(chunks as any, { type: 'application/vnd.android.package-archive' });
        cachedDownloadedBlobUrl = URL.createObjectURL(blob);
      } else {
        const blob = await response.blob();
        cachedDownloadedBlobUrl = URL.createObjectURL(blob);
        onProgress?.(100, total, total);
      }
    } catch {
      // Direct anchor download fallback if CORS prevents streaming
      for (let p = 15; p <= 100; p += 25) {
        onProgress?.(p, p * 150000, 15000000);
        await new Promise((r) => setTimeout(r, 200));
      }
      cachedDownloadedBlobUrl = apkUrl;
    }
  }
}

export async function installDownloadedApk(fallbackUrl?: string): Promise<void> {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    await AppUpdater.installApk();
  } else {
    // Web / browser download trigger
    const targetUrl = cachedDownloadedBlobUrl || fallbackUrl;
    if (targetUrl) {
      const link = document.createElement('a');
      link.href = targetUrl;
      link.download = 'KronoTask-update.apk';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}

export async function startApkUpdate(
  apkUrl: string,
  onProgress?: (progress: number, bytesDownloaded: number, totalBytes: number) => void
): Promise<void> {
  await downloadApkFile(apkUrl, onProgress);
  await installDownloadedApk(apkUrl);
}
