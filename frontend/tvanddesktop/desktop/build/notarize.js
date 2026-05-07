// Notarize hook for electron-builder. Runs after the .app is signed.
// Reads APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID from env
// vars on your Mac (set them in ~/.zshrc as instructed in APP_STORE_GUIDE.md).
//
// Skips automatically when:
//   • Building MAS (Mac App Store does its own notarization on submission)
//   • Env vars are missing (lets you do unsigned dev builds with `yarn start`)
//
// Required only when distributing the .dmg outside the Mac App Store.

const { notarize } = (() => {
  try { return require('@electron/notarize'); }
  catch { return { notarize: null }; }
})();

exports.default = async function (context) {
  const { electronPlatformName, packager, appOutDir } = context;
  if (electronPlatformName !== 'darwin') return;
  if (packager.platformSpecificBuildOptions.target === 'mas') return;

  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.log('  ⊘ Notarization skipped — APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID env vars not set.');
    console.log('     Set them in ~/.zshrc to enable. See APP_STORE_GUIDE.md.');
    return;
  }

  if (!notarize) {
    console.log('  ⊘ @electron/notarize is not installed; run: yarn add -D @electron/notarize');
    return;
  }

  const appName = packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;
  console.log(`  ▸ Notarizing ${appPath} (~ 5–15 min) ...`);

  await notarize({
    appBundleId: 'com.visiongo.megaradio',
    appPath,
    appleId,
    appleIdPassword,
    teamId,
  });

  console.log('  ✓ Notarization complete.');
};
