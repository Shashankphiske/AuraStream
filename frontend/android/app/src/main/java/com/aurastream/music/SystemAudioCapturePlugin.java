package com.aurastream.music;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.util.Log;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SystemAudioCapture")
public class SystemAudioCapturePlugin extends Plugin {
    private static final String TAG = "SystemAudioCapture";

    @PluginMethod
    public void isSupported(PluginCall call) {
        JSObject ret = new JSObject();
        boolean supported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q;
        ret.put("supported", supported);
        ret.put("sdkVersion", Build.VERSION.SDK_INT);
        call.resolve(ret);
    }

    @PluginMethod
    public void startCapture(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            call.reject("System audio capture is only supported on Android 10 (API 29) or higher.");
            return;
        }

        try {
            // Start the foreground service first as required by Android 14+
            Context context = getContext();
            Intent serviceIntent = new Intent(context, AudioCaptureService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }

            MediaProjectionManager projectionManager =
                    (MediaProjectionManager) context.getSystemService(Context.MEDIA_PROJECTION_SERVICE);

            if (projectionManager == null) {
                call.reject("MediaProjectionManager is unavailable on this device.");
                return;
            }

            Intent captureIntent = projectionManager.createScreenCaptureIntent();
            startActivityForResult(call, captureIntent, "mediaProjectionCallback");
        } catch (Exception e) {
            Log.e(TAG, "Error initiating screen capture intent", e);
            call.reject("Failed to request system audio capture: " + e.getMessage());
        }
    }

    @ActivityCallback
    private void mediaProjectionCallback(PluginCall call, ActivityResult result) {
        if (call == null) return;

        if (result.getResultCode() != Activity.RESULT_OK) {
            call.reject("System audio capture permission was denied by user.");
            // Stop service if started
            AudioCaptureService service = AudioCaptureService.getInstance();
            if (service != null) {
                service.stopCapture();
            }
            return;
        }

        Intent data = result.getData();
        if (data == null) {
            call.reject("No data returned from permission dialog.");
            return;
        }

        AudioCaptureService.setListener(new AudioCaptureService.AudioCaptureListener() {
            @Override
            public void onAudioData(byte[] pcmBytes, int sampleRate, int channels) {
                String base64 = Base64.encodeToString(pcmBytes, Base64.NO_WRAP);
                JSObject obj = new JSObject();
                obj.put("data", base64);
                obj.put("sampleRate", sampleRate);
                obj.put("channels", channels);
                notifyListeners("audioData", obj);
            }

            @Override
            public void onError(String message) {
                JSObject obj = new JSObject();
                obj.put("message", message);
                notifyListeners("audioError", obj);
            }

            @Override
            public void onStopped() {
                notifyListeners("audioStopped", new JSObject());
            }
        });

        // Small delay if service is still spinning up onCreate
        AudioCaptureService service = AudioCaptureService.getInstance();
        if (service != null) {
            boolean ok = service.startCapture(result.getResultCode(), data);
            if (ok) {
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("sampleRate", AudioCaptureService.SAMPLE_RATE);
                ret.put("channels", AudioCaptureService.CHANNELS);
                call.resolve(ret);
            } else {
                call.reject("Failed to initialize AudioRecord capture session.");
            }
        } else {
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                AudioCaptureService s = AudioCaptureService.getInstance();
                if (s != null && s.startCapture(result.getResultCode(), data)) {
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    ret.put("sampleRate", AudioCaptureService.SAMPLE_RATE);
                    ret.put("channels", AudioCaptureService.CHANNELS);
                    call.resolve(ret);
                } else {
                    call.reject("Audio capture service failed to respond.");
                }
            }, 100);
        }
    }

    @PluginMethod
    public void stopCapture(PluginCall call) {
        AudioCaptureService service = AudioCaptureService.getInstance();
        if (service != null) {
            service.stopCapture();
        }
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }
}
