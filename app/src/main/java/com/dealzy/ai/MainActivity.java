package com.dealzy.ai;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.widget.FrameLayout;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class MainActivity extends Activity {
    private static final int LOCATION_REQUEST = 1001;
    private static final String APP_HOST = "appassets.androidplatform.net";
    private static final String API_ORIGIN = "https://dealzy-v1.vercel.app";

    private WebView webView;
    private GeolocationPermissions.Callback geoCallback;
    private String geoOrigin;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            getWindow().setStatusBarColor(Color.rgb(246, 247, 251));
            getWindow().setNavigationBarColor(Color.WHITE);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
            );
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        }

        FrameLayout root = new FrameLayout(this);
        webView = new WebView(this);
        FrameLayout.LayoutParams webParams = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
        );
        root.addView(webView, webParams);
        setContentView(root);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((view, windowInsets) -> {
                Insets bars = windowInsets.getInsets(WindowInsets.Type.systemBars());
                FrameLayout.LayoutParams params = (FrameLayout.LayoutParams) webView.getLayoutParams();
                params.leftMargin = bars.left;
                params.topMargin = bars.top;
                params.rightMargin = bars.right;
                params.bottomMargin = bars.bottom;
                webView.setLayoutParams(params);
                return windowInsets;
            });
            root.requestApplyInsets();
        }

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setGeolocationEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportMultipleWindows(false);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);

        WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .setDomain(APP_HOST)
                .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (APP_HOST.equalsIgnoreCase(uri.getHost()) && uri.getPath() != null && uri.getPath().startsWith("/api/")) {
                    return proxyApi(request);
                }
                return assetLoader.shouldInterceptRequest(uri);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();

                if ("tel".equals(scheme) || "geo".equals(scheme) || "mailto".equals(scheme)) {
                    openExternal(uri);
                    return true;
                }

                if (("http".equals(scheme) || "https".equals(scheme)) && !APP_HOST.equalsIgnoreCase(uri.getHost())) {
                    openExternal(uri);
                    return true;
                }
                return false;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (hasLocationPermission()) {
                    callback.invoke(origin, true, false);
                    return;
                }
                geoOrigin = origin;
                geoCallback = callback;
                requestPermissions(new String[]{
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                }, LOCATION_REQUEST);
            }
        });

        webView.loadUrl("https://" + APP_HOST + "/index.html");
    }

    private boolean hasLocationPermission() {
        return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private void openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (Exception ignored) {}
    }

    private WebResourceResponse proxyApi(WebResourceRequest request) {
        try {
            if (!"GET".equalsIgnoreCase(request.getMethod())) {
                byte[] body = "{\"ok\":false,\"error\":\"APK test proxy supports GET only\"}".getBytes("UTF-8");
                return new WebResourceResponse(
                        "application/json", "UTF-8", 405, "Method Not Allowed",
                        new HashMap<>(), new ByteArrayInputStream(body)
                );
            }

            Uri local = request.getUrl();
            URL remote = new URL(API_ORIGIN + local.getEncodedPath()
                    + (local.getEncodedQuery() == null ? "" : "?" + local.getEncodedQuery()));
            HttpURLConnection conn = (HttpURLConnection) remote.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(12000);
            conn.setReadTimeout(20000);
            conn.setRequestProperty("Accept", request.getRequestHeaders().getOrDefault("Accept", "application/json"));
            conn.setRequestProperty("User-Agent", "Dealzy-Android-Test/0.1");

            int status = conn.getResponseCode();
            InputStream input = status >= 400 ? conn.getErrorStream() : conn.getInputStream();
            byte[] data = readFully(input);

            String contentType = conn.getContentType();
            String mime = "application/json";
            String charset = "UTF-8";
            if (contentType != null) {
                String[] parts = contentType.split(";");
                if (parts.length > 0 && !parts[0].trim().isEmpty()) mime = parts[0].trim();
                for (String part : parts) {
                    String p = part.trim().toLowerCase();
                    if (p.startsWith("charset=")) charset = part.substring(part.indexOf('=') + 1).trim();
                }
            }

            Map<String, String> headers = new HashMap<>();
            for (Map.Entry<String, List<String>> entry : conn.getHeaderFields().entrySet()) {
                if (entry.getKey() != null && entry.getValue() != null && !entry.getValue().isEmpty()) {
                    headers.put(entry.getKey(), entry.getValue().get(0));
                }
            }
            headers.put("Cache-Control", "no-store");

            String reason = conn.getResponseMessage();
            if (reason == null || reason.trim().isEmpty()) reason = status < 400 ? "OK" : "Error";
            conn.disconnect();

            return new WebResourceResponse(
                    mime, charset, status, reason, headers, new ByteArrayInputStream(data)
            );
        } catch (Exception e) {
            try {
                byte[] body = ("{\"ok\":false,\"error\":\"API proxy unavailable\"}").getBytes("UTF-8");
                return new WebResourceResponse(
                        "application/json", "UTF-8", 503, "Service Unavailable",
                        new HashMap<>(), new ByteArrayInputStream(body)
                );
            } catch (Exception ignored) {
                return null;
            }
        }
    }

    private byte[] readFully(InputStream input) throws Exception {
        if (input == null) return new byte[0];
        try (InputStream in = input; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int n;
            while ((n = in.read(buffer)) != -1) out.write(buffer, 0, n);
            return out.toByteArray();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == LOCATION_REQUEST && geoCallback != null) {
            boolean granted = hasLocationPermission();
            geoCallback.invoke(geoOrigin, granted, false);
            geoCallback = null;
            geoOrigin = null;
        }
    }

    private boolean backEvaluationPending = false;

    private void fallbackBack() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            finish();
        }
    }

    @Override
    public void onBackPressed() {
        if (webView == null) {
            finish();
            return;
        }
        if (backEvaluationPending) return;

        backEvaluationPending = true;
        webView.evaluateJavascript(
                "(function(){try{return !!(window.DealzyHandleBack&&window.DealzyHandleBack());}catch(e){return false;}})();",
                value -> {
                    backEvaluationPending = false;
                    if ("true".equalsIgnoreCase(value)) return;
                    fallbackBack();
                }
        );
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
        }
        super.onDestroy();
    }
}
