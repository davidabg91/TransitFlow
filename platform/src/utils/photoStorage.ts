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

/**
 * The company's own logo, for the top of its printed registers and reports.
 *
 * Always one file per company, so replacing the logo overwrites the old one
 * rather than leaving orphans behind. Stored as PNG: a logo usually has a
 * transparent background, and a JPEG would put a white box around it on the
 * page.
 */
export async function uploadCompanyLogo(dataUrl: string): Promise<string> {
    const tenantId = getActiveTenant();
    if (!tenantId) throw new Error('[tenant] Cannot upload a logo before the company is known.');
    const storageRef = ref(storage, `tenants/${tenantId}/branding/logo.png`);
    await uploadString(storageRef, dataUrl, 'data_url');
    return getDownloadURL(storageRef);
}

/**
 * Scales a chosen image down to something a page header can use, and returns it
 * as a PNG data URL. A logo picked off a desktop is routinely a 4000px export;
 * printed at 40px tall it only has to carry a few hundred pixels, and shrinking
 * it here keeps the upload — and every later print — small.
 */
export function prepareLogo(file: File, maxWidth = 600, maxHeight = 200): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Файлът не можа да бъде прочетен.'));
        reader.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error('Файлът не е изображение.'));
            img.onload = () => {
                const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height);
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(img.width * scale));
                canvas.height = Math.max(1, Math.round(img.height * scale));
                const ctx = canvas.getContext('2d');
                if (!ctx) { reject(new Error('Изображението не можа да бъде обработено.')); return; }
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/png'));
            };
            img.src = String(reader.result || '');
        };
        reader.readAsDataURL(file);
    });
}
