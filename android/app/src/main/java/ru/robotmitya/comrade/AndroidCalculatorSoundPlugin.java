package ru.robotmitya.comrade;

import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.SoundPool;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.IOException;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

@CapacitorPlugin(name = "AndroidCalculatorSound")
public class AndroidCalculatorSoundPlugin extends Plugin {
    private static final Map<String, String> SOUND_ASSET_PATHS;

    static {
        Map<String, String> soundAssetPaths = new HashMap<>();
        soundAssetPaths.put("key-down", "public/sounds/key-down.wav");
        soundAssetPaths.put("tap", "public/sounds/tap.wav");
        SOUND_ASSET_PATHS = Collections.unmodifiableMap(soundAssetPaths);
    }

    private SoundPool soundPool;
    private final Map<String, Integer> soundIds = new HashMap<>();
    private final Set<Integer> loadedSoundIds = new HashSet<>();
    private final Set<Integer> pendingSoundIds = new HashSet<>();

    @Override
    public void load() {
        AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();

        soundPool = new SoundPool.Builder()
                .setMaxStreams(4)
                .setAudioAttributes(audioAttributes)
                .build();

        soundPool.setOnLoadCompleteListener((pool, sampleId, status) -> {
            if (status != 0) {
                pendingSoundIds.remove(sampleId);
                return;
            }

            loadedSoundIds.add(sampleId);

            if (pendingSoundIds.remove(sampleId)) {
                playLoadedSound(sampleId);
            }
        });

        preloadSounds();
    }

    @PluginMethod
    public void preload(PluginCall call) {
        preloadSounds();
        call.resolve();
    }

    @PluginMethod
    public void play(PluginCall call) {
        String soundType = call.getString("soundType");

        if (soundType == null || !SOUND_ASSET_PATHS.containsKey(soundType)) {
            call.reject("Unknown calculator sound type.");
            return;
        }

        int soundId = loadSound(soundType);
        if (soundId == 0) {
            call.reject("Calculator sound was not loaded.");
            return;
        }

        if (loadedSoundIds.contains(soundId)) {
            playLoadedSound(soundId);
        } else {
            pendingSoundIds.add(soundId);
        }

        call.resolve();
    }

    private void preloadSounds() {
        for (String soundType : SOUND_ASSET_PATHS.keySet()) {
            loadSound(soundType);
        }
    }

    private int loadSound(String soundType) {
        Integer existingSoundId = soundIds.get(soundType);
        if (existingSoundId != null) {
            return existingSoundId;
        }

        if (soundPool == null) {
            return 0;
        }

        String assetPath = SOUND_ASSET_PATHS.get(soundType);
        if (assetPath == null) {
            return 0;
        }

        try (AssetFileDescriptor descriptor = getContext().getAssets().openFd(assetPath)) {
            int soundId = soundPool.load(descriptor, 1);
            soundIds.put(soundType, soundId);
            return soundId;
        } catch (IOException error) {
            return 0;
        }
    }

    private void playLoadedSound(int soundId) {
        if (soundPool == null) {
            return;
        }

        soundPool.play(soundId, 1.0f, 1.0f, 1, 0, 1.0f);
    }

    @Override
    public void handleOnDestroy() {
        if (soundPool != null) {
            soundPool.release();
            soundPool = null;
        }

        soundIds.clear();
        loadedSoundIds.clear();
        pendingSoundIds.clear();
    }
}
