import { Capacitor } from '@capacitor/core';

/**
 * The iOS app is the same build as the website, run inside a Capacitor shell (ios/).
 * Everything that differs between the two goes through this file, and every native
 * branch is behind isNativeApp(), so the website behaves exactly as before.
 * Plugins are imported on demand: the website never downloads them.
 */
export const isNativeApp = () => Capacitor.isNativePlatform();

/** Where the website lives. Links shared from the app point here, because the app's own
 * address (capacitor://localhost) means nothing on another device. */
export const PUBLIC_SITE_URL = 'https://op-help.annonable.chatgpt.site/';

/** What the build stamp shows (see __BUILD__ in vite.config.ts). */
export const buildStamp = () =>
  [
    isNativeApp() ? 'iOS app' : 'web',
    `v${__BUILD__.version}`,
    __BUILD__.sha,
    __BUILD__.branch,
    `built ${__BUILD__.date}`,
  ].join(' · ');

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const cancelled = (e: unknown) => /cancel/i.test(String((e as Error)?.message ?? e));

/** App only: write the file to the app's cache and hand it to the iOS share sheet
 * (Save to Files, AirDrop, Mail…). Resolves false if the person closes the sheet. */
export async function nativeShareFile(blob: Blob, filename: string): Promise<boolean> {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ]);
  const { uri } = await Filesystem.writeFile({
    path: filename,
    data: await blobToBase64(blob),
    directory: Directory.Cache,
  });
  try {
    await Share.share({ title: filename, files: [uri] });
    return true;
  } catch (e) {
    if (cancelled(e)) return false;
    throw e;
  }
}

/** App only: share a link through the iOS share sheet. Resolves false on cancel. */
export async function nativeShareUrl(url: string, title: string): Promise<boolean> {
  const { Share } = await import('@capacitor/share');
  try {
    await Share.share({ title, url });
    return true;
  } catch (e) {
    if (cancelled(e)) return false;
    throw e;
  }
}

/** App only: copy text with the native clipboard. */
export async function nativeCopy(text: string): Promise<void> {
  const { Clipboard } = await import('@capacitor/clipboard');
  await Clipboard.write({ string: text });
}

/** Save a file: the share sheet in the app, a download on the website. */
export async function saveBlob(blob: Blob, filename: string): Promise<void> {
  if (isNativeApp()) {
    await nativeShareFile(blob, filename);
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** App only: match the status bar text to the page (dark text, or light in blackout). */
export async function setNativeStatusBar(blackout: boolean): Promise<void> {
  if (!isNativeApp()) return;
  const { StatusBar, Style } = await import('@capacitor/status-bar');
  await StatusBar.setStyle({ style: blackout ? Style.Dark : Style.Light });
}
