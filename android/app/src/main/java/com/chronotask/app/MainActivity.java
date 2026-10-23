package com.chronotask.app;

import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppUpdaterPlugin.class);
        super.onCreate(savedInstanceState);
        setupWebViewForGoogleAuth();
    }

    private void setupWebViewForGoogleAuth() {
        if (bridge != null && bridge.getWebView() != null) {
            WebView webView = bridge.getWebView();
            WebSettings settings = webView.getSettings();

            // Stripping '; wv' and 'Version/X.X' prevents Google 403: disallowed_useragent
            String defaultUserAgent = settings.getUserAgentString();
            if (defaultUserAgent != null) {
                String cleanUserAgent = defaultUserAgent
                    .replaceAll(";\\s*wv\\b", "")
                    .replaceAll("Version/[0-9.]+\\s*", "");
                settings.setUserAgentString(cleanUserAgent);
            }

            // Enable third-party cookies so Google Auth handler & iframe can authenticate
            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);
            cookieManager.setAcceptThirdPartyCookies(webView, true);

            // Storage and window support
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setJavaScriptCanOpenWindowsAutomatically(true);
            settings.setSupportMultipleWindows(true);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        setupWebViewForGoogleAuth();
    }
}
