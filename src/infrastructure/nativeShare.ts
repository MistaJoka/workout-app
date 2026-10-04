import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

// Android app only. Its WebView has no Web Share API and silently drops
// download links, so a backup or share card handed to either goes nowhere
// (found on a real phone: "Backup saved" with no file anywhere). Instead the
// file is written to the app's cache and handed to Android's own share
// sheet (Drive, Files, Messages...).

export type NativeShareOutcome = 'shared' | 'cancelled'

export async function shareFileNative(
  content: string | Blob,
  filename: string,
  message?: { title?: string; text?: string }
): Promise<NativeShareOutcome> {
  const { uri } = await Filesystem.writeFile({
    path: `share/${filename}`,
    directory: Directory.Cache,
    recursive: true,
    ...(typeof content === 'string'
      ? { data: content, encoding: Encoding.UTF8 }
      : { data: base64(new Uint8Array(await content.arrayBuffer())) }),
  })
  try {
    await Share.share({
      files: [uri],
      ...(message?.title ? { title: message.title, dialogTitle: message.title } : {}),
      ...(message?.text ? { text: message.text } : {}),
    })
    return 'shared'
  } catch (error) {
    if (error instanceof Error && /cancel/i.test(error.message)) return 'cancelled'
    throw error
  }
}

function base64(bytes: Uint8Array): string {
  let binary = ''
  // Chunked: spreading a large image into one call overflows the stack.
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}
