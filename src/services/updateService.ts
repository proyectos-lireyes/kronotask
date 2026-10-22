import { registerPlugin, Capacitor } from '@capacitor/core';

export interface AppUpdaterPluginInterface {
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

export async function checkGitHubRelease(repo = FIXED_GITHUB_REPO): Promise<ReleaseInfo> {
  const cleanRepo = repo.replace(/^https?:\/\/github\.com\//i, '').replace(/\/$/, '').trim();

  const response = await fetch(`https://api.github.com/repos/${cleanRepo}/releases/latest`, {
    headers: { Accept: 'application/vnd.github.v3+json' },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Aún no hay ningún release publicado en "${cleanRepo}". Al hacer push a GitHub, la acción CI/CD creará el primer release automáticamente.`);
    }
    throw new Error(`Error ${response.status} al consultar GitHub Releases.`);
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
    releaseNotes: data.body || '',
    apkDownloadUrl,
    apkSizeMb: apkAsset?.size ? Math.round((apkAsset.size / (1024 * 1024)) * 10) / 10 : undefined,
    publishedAt: data.published_at,
    releaseName: data.name || latestTag,
  };
}

export async function startApkUpdate(
  apkUrl: string,
  onProgress?: (progress: number, bytesDownloaded: number, totalBytes: number) => void
): Promise<void> {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    let progressSub: any;
    try {
      progressSub = await AppUpdater.addListener('downloadProgress', (data) => {
        onProgress?.(data.progress, data.bytesDownloaded, data.totalBytes);
      });

      await AppUpdater.downloadAndInstall({ url: apkUrl });
    } finally {
      if (progressSub && typeof progressSub.remove === 'function') {
        progressSub.remove();
      }
    }
  } else {
    // Web / browser environment fallback
    const link = document.createElement('a');
    link.href = apkUrl;
    link.target = '_blank';
    link.download = 'KronoTask.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
