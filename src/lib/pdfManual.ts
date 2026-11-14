import { File, Paths } from 'expo-file-system';
import { Asset } from 'expo-asset';
import { Alert } from 'react-native';

/**
 * Opens the user manual PDF for the given language.
 *
 * The PDF is bundled in the app assets, copied to the cache directory on
 * first access, then opened with the OS native viewer via File.preview().
 *
 * Trade-off:
 *   Bundling PDFs increases app size but works fully offline without a server.
 *   Hosting the PDF online would keep the bundle small but requires internet.
 */
export async function openManual(
  lang: 'fr' | 'ar',
  translations: { manualLoading: string; manualError: string },
): Promise<void> {
  try {
    // Resolve the bundled asset
    const asset =
      lang === 'fr'
        ? // eslint-disable-next-line @typescript-eslint/no-require-imports
          require('../../assets/pdfs/manual_fr.pdf')
        : // eslint-disable-next-line @typescript-eslint/no-require-imports
          require('../../assets/pdfs/manual_ar.pdf');

    const [loaded] = await Asset.loadAsync(asset);
    if (!loaded.localUri) throw new Error('Asset localUri missing');

    const filename = lang === 'fr' ? 'manual_fr.pdf' : 'manual_ar.pdf';
    const cachedFile = new File(Paths.cache, filename);

    // Copy from bundle to cache if not already there
    if (!cachedFile.exists) {
      const srcFile = new File(loaded.localUri);
      srcFile.copy(cachedFile);
    }

    // Open with system PDF viewer
    const canShow = await File.canPreview(cachedFile);
    if (canShow) {
      await File.preview(cachedFile, { title: filename });
    } else {
      Alert.alert('', translations.manualError);
    }
  } catch {
    Alert.alert('', translations.manualError);
  }
}
