package org.transitflow.terminal;

import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.ImageView;

import com.getcapacitor.BridgeActivity;
import com.mypos.smartsdk.MyPOSAPI;
import com.mypos.smartsdk.OnPOSInfoListener;
import com.mypos.smartsdk.data.POSInfo;

/**
 * The terminal app.
 *
 * Two things here are not obvious and both were learned the hard way on the
 * hardware, so they are kept exactly as they are:
 *
 *   1. registerPOSInfo() unlocks the terminal. A myPOS device keeps its card
 *      reader closed to applications until one identifies itself through the
 *      SDK; without this call the reader never answers and nothing explains why.
 *
 *   2. The screen is dimmed rather than allowed to sleep. Scanning stops when
 *      the machine sleeps, so the app covers the screen with black and drops the
 *      backlight to look off while staying awake. Some terminals ignore a
 *      brightness of zero, which is why there is an overlay as well as a
 *      brightness change.
 */
public class MainActivity extends BridgeActivity {
    private static final String TAG = "TransitFlow";

    private static MainActivity instance;

    /** Idle for this long and the screen goes dark — but not to sleep. */
    private static final long DIM_DELAY_MS = 120_000L;
    private static final float DIM_LEVEL = 0.01f;
    private static final float FULL_LEVEL = 1.0f;

    private final Handler dimHandler = new Handler(Looper.getMainLooper());
    private View dimOverlay;

    private final Runnable dimRunnable = () -> {
        setBrightness(DIM_LEVEL);
        if (dimOverlay != null) dimOverlay.setVisibility(View.VISIBLE);
    };

    private void setBrightness(float level) {
        try {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.screenBrightness = level;
            getWindow().setAttributes(lp);
        } catch (Exception e) {
            Log.e(TAG, "Brightness: " + e.getMessage());
        }
    }

    /** Full brightness, overlay away, countdown restarted. Safe from any thread. */
    public void wakeScreen() {
        runOnUiThread(() -> {
            dimHandler.removeCallbacks(dimRunnable);
            setBrightness(FULL_LEVEL);
            if (dimOverlay != null) dimOverlay.setVisibility(View.GONE);
            dimHandler.postDelayed(dimRunnable, DIM_DELAY_MS);
        });
    }

    /** Called by the reader thread the moment a card is felt. */
    public static void wakeFromScan() {
        if (instance != null) instance.wakeScreen();
    }

    @Override
    public boolean dispatchTouchEvent(MotionEvent ev) {
        wakeScreen();
        return super.dispatchTouchEvent(ev);
    }

    @Override
    public void onResume() {
        super.onResume();
        wakeScreen();
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        instance = this;

        // Registered before super.onCreate, so the plugin exists by the time the
        // Capacitor bridge looks for it. Registering afterwards is a race the
        // bridge sometimes wins, and then the page finds no scanner at all.
        try {
            registerPlugin(TransitFlowNfcPlugin.class);
        } catch (Exception e) {
            Log.e(TAG, "Plugin registration: " + e.getMessage());
        }

        super.onCreate(savedInstanceState);

        // Unlocks the card reader. Without it the terminal simply never answers.
        try {
            MyPOSAPI.registerPOSInfo(this, new OnPOSInfoListener() {
                @Override
                public void onReceive(POSInfo info) {
                    Log.i(TAG, "Terminal unlocked");
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Terminal unlock: " + e.getMessage());
        }

        // The card page plays a tone on a good or bad scan without anybody
        // touching the screen first.
        this.bridge.getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);

        // The idle screen: black, with the mark faint in the middle. Not
        // clickable, so a touch passes through it and wakes the terminal.
        try {
            FrameLayout overlay = new FrameLayout(this);
            overlay.setBackgroundColor(Color.BLACK);
            overlay.setClickable(false);
            overlay.setFocusable(false);
            overlay.setVisibility(View.GONE);

            ImageView logo = new ImageView(this);
            logo.setImageResource(R.drawable.idle_logo);
            logo.setAdjustViewBounds(true);
            logo.setAlpha(0.6f);
            int width = (int) (320 * getResources().getDisplayMetrics().density);
            FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(
                    width, FrameLayout.LayoutParams.WRAP_CONTENT);
            lp.gravity = Gravity.CENTER;
            overlay.addView(logo, lp);

            dimOverlay = overlay;
            addContentView(dimOverlay, new ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        } catch (Exception e) {
            Log.e(TAG, "Idle overlay: " + e.getMessage());
        }

        wakeScreen();
    }
}
