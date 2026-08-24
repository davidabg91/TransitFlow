import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { getActiveTenant } from '../tenant/db';

/**
 * Uploads a (compressed) JPEG data URL to Firebase Storage and returns its public
 * download URL. Photos are keyed by client id so a re-upload overwrites the old file.
 *
 * Storing the URL (a short string) in the client document — instead of the full
 * base64 image — keeps the `clients` collection small, so the real-time listeners
 * used across the admin panels download far less data. Read sites are unchanged:
 * <img src={client.photo}> works for both a Storage URL and a legacy data: URL.
 *
 * Photos live under the company's own folder, so one company's storage rules can
 * never expose another's card photos.
 */
export async function uploadClientPhoto(dataUrl: string, clientId: string): Promise<string> {
    const tenantId = getActiveTenant();
    if (!tenantId) throw new Error('[tenant] Cannot upload a photo before the company is known.');
    const storageRef = ref(storage, `tenants/${tenantId}/client_photos/${clientId}.jpg`);
    await uploadString(storageRef, dataUrl, 'data_url');
    return getDownloadURL(storageRef);
}
