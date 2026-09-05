import type { CapacitorConfig } from '@capacitor/cli';

/**
 * The terminal app.
 *
 * Ships the site inside itself rather than loading it, which is how the
 * DaryCard terminals run: a till that is briefly offline still opens cards it
 * has seen, and the reader keeps working. The price is that a change to the
 * site reaches the terminals only when the app is rebuilt and reinstalled.
 */
const config: CapacitorConfig = {
    appId: 'org.transitflow.terminal',
    appName: 'TransitFlow',
    webDir: 'dist',
    server: {
        androidScheme: 'https',
    },
    android: {
        // The reader loop wants the machine awake; the app dims its own screen
        // instead, so scanning never stops.
        allowMixedContent: false,
    },
};

export default config;
