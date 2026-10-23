package com.chronotask.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {

    @PluginMethod
    public void downloadApk(PluginCall call) {
        String apkUrl = call.getString("url");
        if (apkUrl == null || apkUrl.isEmpty()) {
            call.reject("URL del APK inválida");
            return;
        }

        new Thread(() -> {
            try {
                Context context = getContext();
                URL url = new URL(apkUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestProperty("Accept-Encoding", "identity");
                conn.setInstanceFollowRedirects(true);
                conn.connect();

                int responseCode = conn.getResponseCode();
                int redirectCount = 0;
                while ((responseCode == HttpURLConnection.HTTP_MOVED_PERM ||
                        responseCode == HttpURLConnection.HTTP_MOVED_TEMP ||
                        responseCode == 307 || responseCode == 308) && redirectCount < 8) {
                    String newUrl = conn.getHeaderField("Location");
                    conn.disconnect();
                    url = new URL(newUrl);
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestProperty("Accept-Encoding", "identity");
                    conn.setInstanceFollowRedirects(true);
                    conn.connect();
                    responseCode = conn.getResponseCode();
                    redirectCount++;
                }

                if (responseCode != HttpURLConnection.HTTP_OK) {
                    call.reject("Error de descarga: Código HTTP " + responseCode);
                    return;
                }

                int fileLength = conn.getContentLength();
                File downloadDir = context.getExternalFilesDir(null);
                if (downloadDir == null) {
                    downloadDir = context.getCacheDir();
                }
                File apkFile = new File(downloadDir, "app-update.apk");
                if (apkFile.exists()) {
                    apkFile.delete();
                }

                InputStream is = conn.getInputStream();
                FileOutputStream fos = new FileOutputStream(apkFile);

                byte[] buffer = new byte[8192];
                int bytesRead;
                long totalRead = 0;

                while ((bytesRead = is.read(buffer)) != -1) {
                    fos.write(buffer, 0, bytesRead);
                    totalRead += bytesRead;

                    if (fileLength > 0) {
                        int progress = (int) ((totalRead * 100) / fileLength);
                        JSObject progressObj = new JSObject();
                        progressObj.put("progress", progress);
                        progressObj.put("bytesDownloaded", totalRead);
                        progressObj.put("totalBytes", fileLength);
                        notifyListeners("downloadProgress", progressObj);
                    }
                }

                fos.flush();
                fos.close();
                is.close();
                conn.disconnect();

                JSObject completeObj = new JSObject();
                completeObj.put("success", true);
                completeObj.put("path", apkFile.getAbsolutePath());
                notifyListeners("downloadComplete", completeObj);
                call.resolve(completeObj);

            } catch (Exception e) {
                call.reject("Fallo al descargar: " + e.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void checkDownloadedApk(PluginCall call) {
        try {
            Context context = getContext();
            File downloadDir = context.getExternalFilesDir(null);
            if (downloadDir == null) {
                downloadDir = context.getCacheDir();
            }
            File apkFile = new File(downloadDir, "app-update.apk");
            boolean exists = apkFile.exists() && apkFile.length() > 500 * 1024; // at least 500KB
            JSObject res = new JSObject();
            res.put("exists", exists);
            if (exists) {
                res.put("sizeBytes", apkFile.length());
                res.put("path", apkFile.getAbsolutePath());
            }
            call.resolve(res);
        } catch (Exception e) {
            JSObject res = new JSObject();
            res.put("exists", false);
            call.resolve(res);
        }
    }

    @PluginMethod
    public void deleteDownloadedApk(PluginCall call) {
        try {
            Context context = getContext();
            File downloadDir = context.getExternalFilesDir(null);
            if (downloadDir == null) {
                downloadDir = context.getCacheDir();
            }
            File apkFile = new File(downloadDir, "app-update.apk");
            boolean deleted = false;
            if (apkFile.exists()) {
                deleted = apkFile.delete();
            }
            JSObject res = new JSObject();
            res.put("success", deleted);
            call.resolve(res);
        } catch (Exception e) {
            JSObject res = new JSObject();
            res.put("success", false);
            call.resolve(res);
        }
    }

    @PluginMethod
    public void installApk(PluginCall call) {
        try {
            Context context = getContext();
            File downloadDir = context.getExternalFilesDir(null);
            if (downloadDir == null) {
                downloadDir = context.getCacheDir();
            }
            File apkFile = new File(downloadDir, "app-update.apk");
            if (!apkFile.exists()) {
                call.reject("No se encontró el archivo APK descargado. Por favor, descargue nuevamente.");
                return;
            }

            launchInstallIntent(apkFile);
            JSObject res = new JSObject();
            res.put("success", true);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Error al iniciar instalación: " + e.getMessage());
        }
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String apkUrl = call.getString("url");
        if (apkUrl == null || apkUrl.isEmpty()) {
            call.reject("URL del APK inválida");
            return;
        }

        new Thread(() -> {
            try {
                Context context = getContext();
                URL url = new URL(apkUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestProperty("Accept-Encoding", "identity");
                conn.setInstanceFollowRedirects(true);
                conn.connect();

                int responseCode = conn.getResponseCode();
                int redirectCount = 0;
                while ((responseCode == HttpURLConnection.HTTP_MOVED_PERM ||
                        responseCode == HttpURLConnection.HTTP_MOVED_TEMP ||
                        responseCode == 307 || responseCode == 308) && redirectCount < 8) {
                    String newUrl = conn.getHeaderField("Location");
                    conn.disconnect();
                    url = new URL(newUrl);
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestProperty("Accept-Encoding", "identity");
                    conn.setInstanceFollowRedirects(true);
                    conn.connect();
                    responseCode = conn.getResponseCode();
                    redirectCount++;
                }

                if (responseCode != HttpURLConnection.HTTP_OK) {
                    call.reject("Error de descarga: Código HTTP " + responseCode);
                    return;
                }

                int fileLength = conn.getContentLength();
                File downloadDir = context.getExternalFilesDir(null);
                if (downloadDir == null) {
                    downloadDir = context.getCacheDir();
                }
                File apkFile = new File(downloadDir, "app-update.apk");
                if (apkFile.exists()) {
                    apkFile.delete();
                }

                InputStream is = conn.getInputStream();
                FileOutputStream fos = new FileOutputStream(apkFile);

                byte[] buffer = new byte[8192];
                int bytesRead;
                long totalRead = 0;

                while ((bytesRead = is.read(buffer)) != -1) {
                    fos.write(buffer, 0, bytesRead);
                    totalRead += bytesRead;

                    if (fileLength > 0) {
                        int progress = (int) ((totalRead * 100) / fileLength);
                        JSObject progressObj = new JSObject();
                        progressObj.put("progress", progress);
                        progressObj.put("bytesDownloaded", totalRead);
                        progressObj.put("totalBytes", fileLength);
                        notifyListeners("downloadProgress", progressObj);
                    }
                }

                fos.flush();
                fos.close();
                is.close();
                conn.disconnect();

                JSObject completeObj = new JSObject();
                completeObj.put("success", true);
                notifyListeners("downloadComplete", completeObj);

                launchInstallIntent(apkFile);
                call.resolve(completeObj);

            } catch (Exception e) {
                call.reject("Fallo al descargar o instalar: " + e.getMessage());
            }
        }).start();
    }

    private void launchInstallIntent(File apkFile) {
        Context context = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (!context.getPackageManager().canRequestPackageInstalls()) {
                Intent permissionIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                permissionIntent.setData(Uri.parse("package:" + context.getPackageName()));
                permissionIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(permissionIntent);
            }
        }

        Uri apkUri = FileProvider.getUriForFile(
            context,
            context.getPackageName() + ".fileprovider",
            apkFile
        );

        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        context.startActivity(intent);
    }
}
