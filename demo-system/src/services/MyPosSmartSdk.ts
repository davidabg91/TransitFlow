import { registerPlugin } from '../shims/capacitor';

export interface MyPosNfcEvent {
  tagId: string;
  url?: string;
  error?: string;
  nfcCounter?: number;
}

export interface MyPosSmartSdkPlugin {
  startNfcScan(): Promise<void>;
  stopNfcScan(): Promise<void>;
  triggerWarningBeep(): Promise<void>;
  addListener(eventName: 'nfcEvent', listenerFunc: (event: MyPosNfcEvent) => void): Promise<import('../shims/capacitor').PluginListenerHandle>;
  addListener(eventName: 'nfcError', listenerFunc: (event: { error: string }) => void): Promise<import('../shims/capacitor').PluginListenerHandle>;
  removeAllListeners(): Promise<void>;
}

// Final unique name for the native lookup
const MyPosSmartSdk = registerPlugin<MyPosSmartSdkPlugin>('DaryScanner');

export default MyPosSmartSdk;
