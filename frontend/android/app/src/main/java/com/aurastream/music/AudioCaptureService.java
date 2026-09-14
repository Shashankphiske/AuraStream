package com.aurastream.music;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioPlaybackCaptureConfiguration;
import android.media.AudioRecord;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Binder;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

import java.util.Arrays;

public class AudioCaptureService extends Service {
    private static final String TAG = "AudioCaptureService";
    private static final String CHANNEL_ID = "aurastream_audio_capture_channel";
    private static final int NOTIFICATION_ID = 90210;
    public static final int SAMPLE_RATE = 48000;
    public static final int CHANNELS = 2; // Stereo

    public interface AudioCaptureListener {
        void onAudioData(byte[] pcmBytes, int sampleRate, int channels);
        void onError(String message);
        void onStopped();
    }

    private final IBinder binder = new LocalBinder();
    private static AudioCaptureService instance = null;
    private static AudioCaptureListener listener = null;

    private MediaProjection mediaProjection = null;
    private AudioRecord audioRecord = null;
    private Thread captureThread = null;
    private volatile boolean isRecording = false;

    public class LocalBinder extends Binder {
        public AudioCaptureService getService() {
            return AudioCaptureService.this;
        }
    }

    public static AudioCaptureService getInstance() {
        return instance;
    }

    public static void setListener(AudioCaptureListener l) {
        listener = l;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        createNotificationChannel();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startInForeground();
        return START_NOT_STICKY;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "AuraStream Audio Broadcast",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Shows active internal audio broadcasting notification");
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    public void startInForeground() {
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("AuraStream Music Broadcast")
                .setContentText("Broadcasting system audio to your room...")
                .setSmallIcon(android.R.drawable.ic_btn_speak_now)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOngoing(true)
                .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            int foregroundType = ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION;
            ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, foregroundType);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    public boolean startCapture(int resultCode, Intent resultData) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            if (listener != null) listener.onError("System audio capture requires Android 10 (API 29) or higher.");
            return false;
        }

        if (isRecording) {
            return true;
        }

        try {
            MediaProjectionManager projectionManager =
                    (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);
            if (projectionManager == null) {
                if (listener != null) listener.onError("MediaProjectionManager unavailable");
                return false;
            }

            mediaProjection = projectionManager.getMediaProjection(resultCode, resultData);
            if (mediaProjection == null) {
                if (listener != null) listener.onError("Failed to obtain MediaProjection session");
                return false;
            }

            mediaProjection.registerCallback(new MediaProjection.Callback() {
                @Override
                public void onStop() {
                    Log.i(TAG, "MediaProjection stopped by system");
                    stopCapture();
                }
            }, new Handler(Looper.getMainLooper()));

            AudioPlaybackCaptureConfiguration config = new AudioPlaybackCaptureConfiguration.Builder(mediaProjection)
                    .addMatchingUsage(AudioAttributes.USAGE_MEDIA)
                    .addMatchingUsage(AudioAttributes.USAGE_GAME)
                    .addMatchingUsage(AudioAttributes.USAGE_UNKNOWN)
                    .build();

            AudioFormat audioFormat = new AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(SAMPLE_RATE)
                    .setChannelMask(AudioFormat.CHANNEL_IN_STEREO)
                    .build();

            int minBufferSize = AudioRecord.getMinBufferSize(
                    SAMPLE_RATE,
                    AudioFormat.CHANNEL_IN_STEREO,
                    AudioFormat.ENCODING_PCM_16BIT
            );

            // Chunk size: ~4800 bytes = 1200 stereo 16-bit frames (25ms audio chunks)
            int bufferSize = Math.max(minBufferSize, 4800 * 4);

            audioRecord = new AudioRecord.Builder()
                    .setAudioPlaybackCaptureConfig(config)
                    .setAudioFormat(audioFormat)
                    .setBufferSizeInBytes(bufferSize)
                    .build();

            if (audioRecord.getState() != AudioRecord.STATE_INITIALIZED) {
                if (listener != null) listener.onError("AudioRecord failed to initialize");
                stopCapture();
                return false;
            }

            audioRecord.startRecording();
            isRecording = true;

            captureThread = new Thread(() -> {
                android.os.Process.setThreadPriority(android.os.Process.THREAD_PRIORITY_URGENT_AUDIO);
                // 4800 bytes = 2400 shorts = 1200 frames per channel = 25ms of 48kHz stereo
                byte[] chunk = new byte[4800];

                while (isRecording && audioRecord != null) {
                    int read = audioRecord.read(chunk, 0, chunk.length);
                    if (read > 0 && listener != null) {
                        byte[] data = Arrays.copyOf(chunk, read);
                        listener.onAudioData(data, SAMPLE_RATE, CHANNELS);
                    }
                }
            }, "AuraStreamAudioCaptureThread");

            captureThread.start();
            Log.i(TAG, "Audio capture started successfully at " + SAMPLE_RATE + "Hz stereo");
            return true;
        } catch (SecurityException se) {
            Log.e(TAG, "SecurityException starting audio capture", se);
            if (listener != null) listener.onError("Permission denied: " + se.getMessage());
            stopCapture();
            return false;
        } catch (Exception e) {
            Log.e(TAG, "Exception starting audio capture", e);
            if (listener != null) listener.onError("Error starting capture: " + e.getMessage());
            stopCapture();
            return false;
        }
    }

    public void stopCapture() {
        isRecording = false;

        if (captureThread != null) {
            try {
                captureThread.interrupt();
                captureThread.join(500);
            } catch (Exception ignored) {}
            captureThread = null;
        }

        if (audioRecord != null) {
            try {
                if (audioRecord.getRecordingState() == AudioRecord.RECORDSTATE_RECORDING) {
                    audioRecord.stop();
                }
                audioRecord.release();
            } catch (Exception ignored) {}
            audioRecord = null;
        }

        if (mediaProjection != null) {
            try {
                mediaProjection.stop();
            } catch (Exception ignored) {}
            mediaProjection = null;
        }

        if (listener != null) {
            listener.onStopped();
        }

        stopForeground(true);
        stopSelf();
    }

    @Override
    public void onDestroy() {
        stopCapture();
        instance = null;
        super.onDestroy();
    }
}
