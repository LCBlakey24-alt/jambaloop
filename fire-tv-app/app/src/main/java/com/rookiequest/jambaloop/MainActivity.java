package com.rookiequest.jambaloop;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Jambaloop on a Fire TV: the website, full screen, as the TV everyone watches.
 * The game itself runs on the website, so the app never needs updating when the games change.
 * ?tv tells the site this screen is the TV; it then lays the page out at 1280 wide (the size the
 * TV screens are designed for) and the WebView scales it to fit the television.
 *
 * Staying steady on a small stick: the app never restarts itself when the TV, the remote or the display
 * changes (see configChanges in the manifest), and if Fire OS stops the page's engine to free memory, the
 * app quietly starts a new one and goes back to the room the TV was showing (the site remembers it).
 */
public class MainActivity extends Activity {
    private static final String HOST = "jambaloop-family-test.onrender.com";
    private static final String HOME = "https://" + HOST + "/?tv";
    private static final int BACKGROUND = Color.parseColor("#101226");
    private static final String OFFLINE = "<html><body style=\"margin:0;background:#101226;color:#fff;font-family:sans-serif;"
            + "display:flex;align-items:center;justify-content:center;height:100vh;text-align:center\"><div>"
            + "<h1 style=\"font-size:48px;margin:0 0 16px\">Jambaloop can't reach the internet</h1>"
            + "<p style=\"font-size:26px;opacity:.8\">Check the Fire TV is online, then press OK to try again.</p>"
            + "</div></body></html>";

    private WebView web;
    private boolean offline;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().getDecorView().setBackgroundColor(BACKGROUND);
        web = buildWebView();
        setContentView(web);
        if (state == null || web.restoreState(state) == null) web.loadUrl(HOME);
        web.requestFocus();
        hideSystemBars();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private WebView buildWebView() {
        WebView view = new WebView(this);
        view.setBackgroundColor(BACKGROUND);
        WebSettings settings = view.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        // Music, voices and sound effects play without anyone touching the screen first.
        settings.setMediaPlaybackRequiresUserGesture(false);
        // Honour the page's own width (1280 on a TV) and fit it to the screen.
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setUserAgentString(settings.getUserAgentString() + " JambaloopTV/1.1");

        view.setWebChromeClient(new WebChromeClient());
        view.setWebViewClient(new WebViewClient() {
            // Stay on Jambaloop: links anywhere else are not opened inside the app.
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, String url) {
                return !HOST.equals(Uri.parse(url).getHost());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
                return !HOST.equals(request.getUrl().getHost());
            }

            @Override
            public void onReceivedError(WebView v, int code, String description, String url) {
                showOffline();
            }

            @Override
            public void onReceivedError(WebView v, WebResourceRequest request, WebResourceError error) {
                if (Build.VERSION.SDK_INT >= 21 && request.isForMainFrame()) showOffline();
            }

            @Override
            public void onPageFinished(WebView v, String url) {
                if (url != null && url.startsWith("https://")) offline = false;
            }

            // Fire OS can stop the page's engine to free memory. Without this the whole app would close;
            // instead a fresh page opens and the site takes the TV straight back to its room.
            @Override
            public boolean onRenderProcessGone(WebView v, RenderProcessGoneDetail detail) {
                if (v != web) return true;
                restartPage();
                return true;
            }
        });
        view.setFocusable(true);
        view.setFocusableInTouchMode(true);
        return view;
    }

    private void restartPage() {
        WebView dead = web;
        web = buildWebView();
        setContentView(web);
        if (dead != null) dead.destroy();
        web.loadUrl(HOME + "&back=engine");
        web.requestFocus();
        hideSystemBars();
    }

    private void showOffline() {
        offline = true;
        web.loadDataWithBaseURL(null, OFFLINE, "text/html", "utf-8", null);
    }

    private void hideSystemBars() {
        web.setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        // On the "can't reach the internet" page, OK tries again.
        if (offline && (keyCode == KeyEvent.KEYCODE_DPAD_CENTER || keyCode == KeyEvent.KEYCODE_ENTER)) {
            offline = false;
            web.loadUrl(HOME);
            return true;
        }
        // The remote's menu button takes you back to the Jambaloop home screen.
        if (keyCode == KeyEvent.KEYCODE_MENU) {
            web.loadUrl(HOME);
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onSaveInstanceState(Bundle state) {
        super.onSaveInstanceState(state);
        web.saveState(state);
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        hideSystemBars();
    }

    @Override
    protected void onDestroy() {
        web.destroy();
        super.onDestroy();
    }
}
