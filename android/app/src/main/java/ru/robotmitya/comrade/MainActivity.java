package ru.robotmitya.comrade;

import android.annotation.SuppressLint;
import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.media.AudioManager;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.WebView;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        getWindow().setBackgroundDrawable(new ColorDrawable(Color.BLACK));
        registerPlugin(AndroidCalculatorSoundPlugin.class);
        registerPlugin(AndroidCalculatorStorePlugin.class);

        super.onCreate(savedInstanceState);

        setVolumeControlStream(AudioManager.STREAM_MUSIC);

        applyRequestedOrientation();
        applyBlackStartupBackground();
        applySystemBarAppearance();

        View decorView = getWindow().getDecorView();
        decorView.post(() -> {
            applyBlackStartupBackground();
            applySystemBarAppearance();
        });
    }

    @Override
    public void onResume() {
        super.onResume();

        applyBlackStartupBackground();
        applySystemBarAppearance();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);

        if (hasFocus) {
            applyBlackStartupBackground();
            applySystemBarAppearance();
        }
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);

        applyRequestedOrientation();
        applyBlackStartupBackground();
        applySystemBarAppearance();
    }

    private void applyBlackStartupBackground() {
        Window window = getWindow();
        View decorView = window.getDecorView();

        window.setBackgroundDrawable(new ColorDrawable(Color.BLACK));
        decorView.setBackgroundColor(Color.BLACK);

        View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            contentView.setBackgroundColor(Color.BLACK);
            applyBlackBackgroundToWebViews(contentView);
        }
    }

    private void applyBlackBackgroundToWebViews(View view) {
        if (view instanceof WebView) {
            view.setBackgroundColor(Color.BLACK);
            return;
        }

        if (view instanceof ViewGroup) {
            ViewGroup viewGroup = (ViewGroup) view;
            for (int i = 0; i < viewGroup.getChildCount(); i++) {
                applyBlackBackgroundToWebViews(viewGroup.getChildAt(i));
            }
        }
    }

    @SuppressLint("ObsoleteSdkInt")
    private void applySystemBarAppearance() {
        Window window = getWindow();
        View decorView = window.getDecorView();

        window.setStatusBarColor(Color.BLACK);
        window.setNavigationBarColor(Color.BLACK);

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            window.setStatusBarContrastEnforced(false);
            window.setNavigationBarContrastEnforced(false);
        }

        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(window, decorView);

        controller.setAppearanceLightStatusBars(false);
        controller.setAppearanceLightNavigationBars(false);
    }

    private void applyRequestedOrientation() {
        Configuration configuration = getResources().getConfiguration();

        boolean isLargeScreen = configuration.smallestScreenWidthDp >= 600;

        if (isLargeScreen) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_FULL_USER);
        } else {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        }
    }
}
