package ru.robotmitya.comrade;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AndroidCalculatorStore")
public class AndroidCalculatorStorePlugin extends Plugin {
    @PluginMethod
    public void openRateAppPage(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            String packageName = getContext().getPackageName();
            Uri playStoreUri = Uri.parse("market://details?id=" + packageName);
            Intent playStoreIntent = new Intent(Intent.ACTION_VIEW, playStoreUri);
            playStoreIntent.setPackage("com.android.vending");

            try {
                getActivity().startActivity(playStoreIntent);
                call.resolve();
                return;
            } catch (ActivityNotFoundException | SecurityException ignored) {
                // Google Play is unavailable. Try a browser instead.
            }

            Uri webUri = Uri.parse("https://play.google.com/store/apps/details?id=" + packageName);
            Intent browserIntent = new Intent(Intent.ACTION_VIEW, webUri);

            try {
                getActivity().startActivity(browserIntent);
                call.resolve();
            } catch (ActivityNotFoundException | SecurityException error) {
                call.reject("Unable to open the Calculator Comrade store page.", error);
            }
        });
    }
}
