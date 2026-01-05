# How to Extract PowerView Encryption Key Using Android Emulator

This guide shows you how to extract your Hunter Douglas PowerView encryption key using an Android emulator on macOS, without needing any physical hardware.

## Overview

The PowerView app stores your home encryption key in an SQLite database. By running the app in a rooted Android emulator, we can access this database and extract the key.

## Prerequisites

- macOS computer
- Internet connection
- Hunter Douglas PowerView account credentials
- ~4GB free disk space

## Step 1: Install Android Studio

### Download Android Studio

1. Go to https://developer.android.com/studio
2. Click **"Download Android Studio"**
3. Accept the terms and download the DMG file
4. Open the downloaded DMG and drag **Android Studio** to your Applications folder
5. Open Android Studio from Applications

### Complete Setup Wizard

1. Android Studio will open with a setup wizard
2. Choose **"Standard"** installation type
3. Select your preferred theme
4. Click **"Next"** through the remaining screens
5. Wait for the SDK components to download (this takes 5-10 minutes)
6. Click **"Finish"** when complete

## Step 2: Create a Rooted Android Virtual Device (AVD)

### Open Device Manager

1. In Android Studio welcome screen, click **"More Actions"** dropdown
2. Select **"Virtual Device Manager"**

### Create New Virtual Device

1. Click the **"Create Device"** button (+ icon)
2. Select a device definition:
   - Choose **"Pixel 7"** (or any recent Pixel device)
   - Click **"Next"**

### Select System Image (IMPORTANT)

This is the critical step - you need a **rootable** system image:

1. Click on the **"x86 Images"** tab (or "Other Images")
2. Look for an image labeled **"Google APIs"** (NOT "Google Play")
   - Example: **"Tiramisu"** or **"UpsideDownCake"** with "Google APIs"
   - API Level 33 or 34 work well
3. If the image has a download icon, click it to download
4. Select the **"Google APIs"** image (not "Google Play")
5. Click **"Next"**

**Why Google APIs?**
- **Google Play** images = Production builds, no root access ❌
- **Google APIs** images = Development builds, has root access ✅

### Finish AVD Creation

1. Give your AVD a name (e.g., "PowerView Extractor")
2. Click **"Finish"**
3. Your new AVD should appear in the Device Manager list

## Step 3: Start the Emulator

1. In Device Manager, find your newly created AVD
2. Click the **▶ (Play)** button to start it
3. Wait for the emulator to fully boot (1-2 minutes)
4. You should see the Android home screen

## Step 4: Enable Root Access

### Test Root Access

Open Terminal and run:

```bash
cd ~/Library/Android/sdk/platform-tools
./adb root
```

You should see:
```
restarting adbd as root
```

If you see `adbd cannot run as root in production builds`, you selected the wrong system image. Go back to Step 2 and choose a "Google APIs" image.

### Verify Root Access

```bash
./adb shell "su 0 whoami"
```

Should output: `root`

## Step 5: Install PowerView App

### Option A: Download APK from APKMirror (Recommended)

1. On your Mac, open a web browser
2. Go to: https://www.apkmirror.com/apk/hunterdouglas/powerview/
3. Click on the latest version (e.g., "3.8.1")
4. Scroll down and click **"Download APK"**
5. Click through the download button (APKMirror has multiple clicks)
6. Save the APK to your `~/Downloads` folder

### Option B: Download APK from APKCombo

1. Go to: https://apkcombo.com/powerview/com.hunterdouglas.powerview/download/apk
2. Download the latest APK version
3. Save to `~/Downloads`

### Install the APK

In Terminal, run:

```bash
cd ~/Library/Android/sdk/platform-tools

# Install the APK (adjust filename if different)
./adb install ~/Downloads/com.hunterdouglas.powerview*.apk
```

You should see:
```
Performing Streamed Install
Success
```

## Step 6: Set Up PowerView App

### Launch PowerView App

1. In the emulator, open the app drawer (swipe up from bottom)
2. Find and tap the **"PowerView"** app icon
3. The app will open

### Log In to Your Account

1. Tap **"Sign In"** or **"Log In"**
2. Enter your Hunter Douglas account email and password
3. Log in

**Important:** Your shades will sync from the cloud. You don't need Bluetooth working in the emulator - the app stores the encryption key as soon as you log in!

4. Wait for the app to sync (you might see "Home Unreachable" - that's fine!)

## Step 7: Extract the Database

Now that you're logged in, the encryption key is stored in the app's SQLite database.

### Find the Database File

In Terminal, run:

```bash
cd ~/Library/Android/sdk/platform-tools

# List database files
./adb shell "su 0 ls /data/data/com.hunterdouglas.powerview/databases/"
```

You should see output like:
```
YourDatabaseName_X
YourDatabaseName_X-journal
google_app_measurement_local.db
...
```

The main database is the one with a random-looking name (e.g., `YourDatabaseName_X`).

### Copy Database to Your Mac

```bash
# Replace DBNAME with your actual database filename
DBNAME="YourDatabaseName_X"

# Extract the database
./adb shell "su 0 cat /data/data/com.hunterdouglas.powerview/databases/$DBNAME" > ~/code/hunter-douglas-app/powerview.db
```

### Verify the Database

```bash
ls -lh ~/code/hunter-douglas-app/powerview.db
```

Should show a file around 50-100KB.

## Step 8: Extract the Encryption Key

### Query the Database

```bash
cd ~/code/hunter-douglas-app

# Extract the home_key
sqlite3 powerview.db "SELECT home_key FROM homes;"
```

You should see output like:
```
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**This is your encryption key!** 🎉

### Save the Key

```bash
# Save to a file
sqlite3 powerview.db "SELECT home_key FROM homes;" > encryption_key.txt

# Display it
cat encryption_key.txt
```

## Step 9: Use Your Key

Now you can use this key in your PowerView control app!

### Update Web App

The key is already in your web app at:
```
~/code/hunter-douglas-app/web/encryption.js
```

If you need to update it:

```javascript
const HOME_KEY = 'YOUR_KEY_HERE';  // Replace with your actual key
```

### Test Your App

1. Open http://localhost:8000 in Chrome
2. Click "Scan for Shades"
3. Select your shade and pair
4. Control the position - it should work! ✅

## Troubleshooting

### "Package not debuggable" Error

This means the emulator doesn't have root access. Solution:
1. Delete the current AVD
2. Create a new one with **"Google APIs"** (not "Google Play")

### "adb: command not found"

The `adb` tool is in Android Studio's SDK folder. Always use the full path:
```bash
~/Library/Android/sdk/platform-tools/adb
```

Or add it to your PATH:
```bash
echo 'export PATH="$HOME/Library/Android/sdk/platform-tools:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Database Not Found

Make sure you:
1. Logged into the PowerView app in the emulator
2. Waited for it to sync (even if it says "unreachable")
3. Using the correct database filename

### Empty or Null Key

If the key is empty:
1. Make sure you're logged in with your actual Hunter Douglas account
2. The account must have shades registered to it
3. Try logging out and back in again

### Emulator Won't Start

If the emulator fails to start:
1. Check virtualization is enabled in your Mac's settings
2. Try selecting a different system image (API 33 or 34)
3. Allocate more RAM to the AVD (edit AVD settings)

## Clean Up

Once you have your key, you can:

```bash
# Stop the emulator
~/Library/Android/sdk/platform-tools/adb emu kill

# (Optional) Delete the AVD to free up space
# In Android Studio → Device Manager → Delete AVD
```

## Security Note

Your encryption key is sensitive! It allows control of your shades. Keep it secure:
- Don't share it publicly
- Don't commit it to public repositories
- Only use it in trusted applications

## What You've Accomplished

✅ Set up a rooted Android emulator
✅ Sideloaded the PowerView app
✅ Extracted your personal encryption key
✅ Can now control your shades without the official app or gateway!

## Next Steps

- Use the web app to control your shades
- Add multiple shades to the multi-shade version
- Integrate with home automation systems
- Build custom scenes and schedules

---

**Total Time:** ~30 minutes

**Cost:** $0 (completely free!)

**Result:** Full control of your Hunter Douglas PowerView shades! 🎉
