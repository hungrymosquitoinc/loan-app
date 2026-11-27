package com.loanapp.app;

import android.app.Activity;
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

/**
 * Keeps the APK update flow inside the app: streams the download into our own
 * cache (emitting byte progress) and then hands the finished file to Android's
 * package installer.
 *
 * A custom plugin is required because Capacitor's built-in openUrl() builds its
 * ACTION_VIEW intent without FLAG_GRANT_READ_URI_PERMISSION, so the installer
 * would be refused access to a locally saved content:// APK.
 */
@CapacitorPlugin(name = "ApkUpdater")
public class ApkUpdaterPlugin extends Plugin {

    private static final String EVENT_PROGRESS = "downloadProgress";
    private static final String APK_FILE_NAME = "jsr-lending-update.apk";

    /**
     * Downloads `url` into the app cache.
     *
     * Emits `downloadProgress` events ({ received, total }) while streaming and
     * resolves { path, size } when done. total is -1 when the server sends no
     * Content-Length. Any failure removes the partial file and rejects.
     */
    @PluginMethod
    public void download(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("url is required");
            return;
        }

        // Network and disk IO run off the bridge thread; progress events and the
        // final resolve are marshalled to the WebView by Capacitor itself.
        new Thread(() -> {
            File target = new File(getContext().getCacheDir(), APK_FILE_NAME);
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(url).openConnection();
                connection.setConnectTimeout(15_000);
                connection.setReadTimeout(30_000);
                connection.connect();

                int status = connection.getResponseCode();
                if (status != HttpURLConnection.HTTP_OK) {
                    call.reject("Download failed: HTTP " + status);
                    return;
                }

                long total = connection.getContentLengthLong();
                long received = 0;

                try (InputStream in = connection.getInputStream();
                     FileOutputStream out = new FileOutputStream(target)) {
                    byte[] buffer = new byte[64 * 1024];
                    int read;
                    while ((read = in.read(buffer)) != -1) {
                        out.write(buffer, 0, read);
                        received += read;

                        JSObject progress = new JSObject();
                        progress.put("received", received);
                        progress.put("total", total);
                        notifyListeners(EVENT_PROGRESS, progress, false);
                    }
                }

                JSObject result = new JSObject();
                result.put("path", target.getAbsolutePath());
                result.put("size", received);
                call.resolve(result);
            } catch (Exception e) {
                // Never leave a half-written APK behind for the next attempt.
                if (target.exists()) target.delete();
                call.reject("Download failed: " + e.getMessage());
            } finally {
                if (connection != null) connection.disconnect();
            }
        }, "apk-download").start();
    }

    /**
     * Opens Android's install prompt for a previously downloaded APK.
     *
     * Android 8+ requires the user to allow "install unknown apps" for this app
     * first. When that grant is missing we open the exact Settings screen for it
     * and resolve { granted: false } so the app can retry the moment the user
     * returns. With the grant in place we resolve { granted: true } after the
     * system install dialog has been launched.
     */
    @PluginMethod
    public void install(PluginCall call) {
        String path = call.getString("path");
        if (path == null || path.isEmpty()) {
            call.reject("path is required");
            return;
        }

        File apk = new File(path);
        if (!apk.exists()) {
            call.reject("The downloaded update file is missing");
            return;
        }

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("The app is not in the foreground");
            return;
        }

        if (Build.VERSION.SDK_INT >= 26 && !getContext().getPackageManager().canRequestPackageInstalls()) {
            Intent settings = new Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + getContext().getPackageName())
            );
            activity.runOnUiThread(() -> {
                try {
                    activity.startActivity(settings);
                    JSObject result = new JSObject();
                    result.put("granted", false);
                    call.resolve(result);
                } catch (Exception e) {
                    call.reject("Could not open install settings: " + e.getMessage());
                }
            });
            return;
        }

        try {
            Uri apkUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                apk
            );

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            // Without this flag Android refuses to let the installer read the file.
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            activity.runOnUiThread(() -> {
                try {
                    activity.startActivity(intent);
                    JSObject result = new JSObject();
                    result.put("granted", true);
                    call.resolve(result);
                } catch (Exception e) {
                    call.reject("Could not open the installer: " + e.getMessage());
                }
            });
        } catch (Exception e) {
            call.reject("Could not open the installer: " + e.getMessage());
        }
    }
}
