package org.transitflow.terminal;

import android.media.AudioManager;
import android.media.ToneGenerator;
import android.util.Log;
import android.view.WindowManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.mypos.smartsdk.OnBindListener;
import com.mypos.smartsdk.UltralightManagement;

import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * The terminal's card reader.
 *
 * A myPOS terminal does not deliver cards to the page the way a phone does — no
 * NDEF intent arrives. The application drives the reader itself through the
 * SDK: bind to it, open it, and poll. What comes back is the chip's serial and
 * the bytes of the card's memory, and both are handed to the page in one event.
 *
 * The loop is deliberately hard to stop. On a till the reader must be ready at
 * every moment, and a scanner that has quietly stopped is worse than one that
 * never started, because nobody notices until a passenger is standing there.
 */
@CapacitorPlugin(name = "TransitFlowScanner")
public class TransitFlowNfcPlugin extends Plugin {

    private static final String TAG = "TransitFlow";

    /** The site whose links these cards carry. */
    private static final String CARD_HOST = "transitflow.org";

    /** A card left lying on the reader repeats; one tap should be one scan. */
    private static final long REPEAT_GUARD_MS = 1500;

    private final AtomicBoolean scanning = new AtomicBoolean(false);
    private final AtomicBoolean bound = new AtomicBoolean(false);
    private final AtomicInteger scanCount = new AtomicInteger(0);
    private Thread scanThread;
    private ToneGenerator beeper;

    private String lastId = "";
    private long lastTime = 0;

    @Override
    public void load() {
        super.load();
        try {
            getBridge().getActivity().runOnUiThread(() ->
                    getBridge().getActivity().getWindow()
                            .addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON));

            try {
                // The alarm stream, because a till is a noisy place and the driver
                // needs to hear the difference between a good and a bad card.
                beeper = new ToneGenerator(AudioManager.STREAM_ALARM, 100);
            } catch (Exception e) {
                Log.e(TAG, "Tone generator: " + e.getMessage());
            }

            UltralightManagement.getInstance().bind(getContext(), new OnBindListener() {
                @Override
                public void onBindComplete() {
                    Log.i(TAG, "Reader bound");
                    bound.set(true);
                    startLoop();
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Binding: " + e.getMessage());
        }
    }

    @PluginMethod
    public void startNfcScan(PluginCall call) {
        startLoop();
        call.resolve();
    }

    @PluginMethod
    public void stopNfcScan(PluginCall call) {
        // Ignored on purpose. The page asks for this when it navigates away, but
        // the till wants the reader ready the whole time it is open.
        call.resolve();
    }

    /** Three error tones, for a card the page has judged invalid. */
    @PluginMethod
    public void triggerWarningBeep(PluginCall call) {
        try {
            // After the detection beep, or the two run together and sound like one.
            Thread.sleep(500);
            if (beeper != null) {
                for (int i = 0; i < 3; i++) {
                    beeper.startTone(ToneGenerator.TONE_SUP_ERROR, 300);
                    Thread.sleep(400);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Warning beep: " + e.getMessage());
        }
        call.resolve();
    }

    private synchronized void startLoop() {
        if (scanThread != null && scanThread.isAlive()) return;
        scanning.set(true);

        scanThread = new Thread(() -> {
            Thread.currentThread().setPriority(Thread.MAX_PRIORITY);
            Log.i(TAG, "Reader loop started");

            while (scanning.get()) {
                try {
                    if (!bound.get()) {
                        Thread.sleep(1000);
                        continue;
                    }

                    UltralightManagement.getInstance().open(1000);

                    while (scanning.get() && bound.get()) {
                        try {
                            if (UltralightManagement.getInstance().detect(10)) {
                                MainActivity.wakeFromScan();
                                readCard();

                                // Closed and reopened after each card, or the
                                // reader holds the old one and the next tap on
                                // the same spot is never felt.
                                UltralightManagement.getInstance().close(50);
                                Thread.sleep(50);
                                UltralightManagement.getInstance().open(300);
                            }
                            Thread.sleep(10);
                        } catch (Exception e) {
                            Log.e(TAG, "Detect: " + e.getMessage());
                            break;
                        }
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Reader loop: " + e.getMessage());
                } finally {
                    try {
                        UltralightManagement.getInstance().close(50);
                    } catch (Exception ignored) { }
                }
                try { Thread.sleep(1000); } catch (InterruptedException ignored) { }
            }
        }, "TransitFlowReader");
        scanThread.start();
    }

    private void readCard() {
        try {
            // Block 0 answers with pages 0-3, and the chip's serial is split
            // across the first two of them with a check byte in between.
            byte[] head = null;
            try {
                head = UltralightManagement.getInstance().readBlock((byte) 0, 150);
            } catch (Exception ignored) { }

            if (head == null || head.length < 8) return;

            byte[] uid = new byte[] {
                    head[0], head[1], head[2],
                    head[4], head[5], head[6], head[7],
            };
            String tagId = toHex(uid).toLowerCase();

            long now = System.currentTimeMillis();
            if (tagId.equals(lastId) && now - lastTime < REPEAT_GUARD_MS) return;
            lastId = tagId;
            lastTime = now;

            if (beeper != null) beeper.startTone(ToneGenerator.TONE_PROP_BEEP, 100);

            // Pages 4 onwards hold the NDEF message with the card's address.
            byte[] memory = new byte[48];
            boolean complete = true;
            for (int i = 0; i < 3; i++) {
                try {
                    byte[] chunk = UltralightManagement.getInstance()
                            .readBlock((byte) (4 + (i * 4)), 150);
                    if (chunk == null) { complete = false; break; }
                    System.arraycopy(chunk, 0, memory, i * 16, 16);
                } catch (Exception e) {
                    complete = false;
                    break;
                }
            }

            final String url = complete ? extractUrl(memory) : null;
            final String id = tagId;
            final int count = scanCount.incrementAndGet();

            getBridge().getActivity().runOnUiThread(() -> {
                JSObject event = new JSObject();
                event.put("tagId", id);
                event.put("url", url != null ? url : "");
                event.put("count", count);
                notifyListeners("nfcEvent", event);
            });
        } catch (Exception e) {
            Log.e(TAG, "Read: " + e.getMessage());
        }
    }

    /**
     * The address out of the card's memory.
     *
     * Read as text and found by the host rather than by parsing NDEF properly:
     * the record's header is a byte or two before the host and the message ends
     * at the first byte that is not printable, so walking outwards from the host
     * finds the address whatever wrote it.
     */
    private String extractUrl(byte[] data) {
        try {
            String raw = new String(data, "UTF-8");
            int at = raw.indexOf(CARD_HOST);
            if (at < 0) return null;

            int start = at;
            while (start > 0 && isPrintable(raw.charAt(start - 1))) start--;
            int end = at;
            while (end < raw.length() && isPrintable(raw.charAt(end))) end++;

            String found = raw.substring(start, end);
            return found.startsWith("http") ? found : "https://" + found;
        } catch (Exception ignored) {
            return null;
        }
    }

    private boolean isPrintable(char c) {
        return c >= 33 && c <= 126;
    }

    private String toHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) sb.append(String.format("%02X", b));
        return sb.toString();
    }
}
