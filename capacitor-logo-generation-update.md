Capacitor Logo Generation Update

Date: 2025-10-21

Change Summary
- Updated Capacitor assets generation to use logo/LaudiumLogo.png for app icons.
- Modified NPM scripts in package.json:
  - assets:init now runs with --icon "logo/LaudiumLogo.png"
  - assets:generate now runs with --icon "logo/LaudiumLogo.png"
- Added a test script test-capacitor-assets-config.js to verify the configuration.

How to Generate/Regenerate App Icons
1. Ensure logo/LaudiumLogo.png exists and is the desired source image.
2. Initialize assets (only needed once or when re-initializing):
   npm run assets:init
3. Generate platform assets for Android and iOS:
   npm run assets:generate

Notes
- Splash screen image remains unchanged (resources/splash.png). If you need to update the splash, replace resources/splash.png or pass --splash to the commands similarly.
- The Android/iOS projects should be synced after asset generation:
   npm run cap:sync

Verification
- Run the test to confirm scripts point to the correct icon source:
   node test-capacitor-assets-config.js


Running From Any Directory (Windows)
- If you see "Missing script" errors, it usually means you’re not in the project root.
- You can run the provided PowerShell helpers from anywhere and they will switch to the repo root automatically:
  - Init:   C:\JunieProjects\Laudium Biz\scripts\assets-init.ps1
  - Generate: C:\JunieProjects\Laudium Biz\scripts\assets-generate.ps1
- Both scripts use logo/LaudiumLogo.png for icons exactly like the npm scripts.
