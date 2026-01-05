# PowerView Shade Control - Web App

A web-based controller for Hunter Douglas PowerView Gen 3 shades using Web Bluetooth API. Control your shades directly from Chrome/Edge without needing a hub or gateway!

## Features

- 🔍 **Scan and discover** PowerView shades via Bluetooth
- 🎚️ **Control shade position** (0-100%) with slider or quick buttons
- 🔐 **AES-128-CTR encryption** with your extracted home key
- 📱 **Cross-platform** - Works on Mac, Windows, Linux, Android (Chrome/Edge)
- 🪟 **Multi-shade support** - Control multiple shades from one page
- 🐛 **Built-in debug console** for troubleshooting
- 💾 **No installation needed** - Just open in browser!

## Quick Start

### Prerequisites

- Chrome or Edge browser (Safari doesn't support Web Bluetooth)
- Bluetooth enabled on your computer
- Hunter Douglas PowerView Gen 3 shades
- Your encryption key (see [EXTRACT_KEY_ANDROID_EMULATOR.md](EXTRACT_KEY_ANDROID_EMULATOR.md))

### Local Development

#### Option 1: Using Netlify Dev (Recommended)

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd hunter-douglas-pwa
   ```

2. **Copy the environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` with your settings:**
   ```bash
   POWERVIEW_ENCRYPTION_KEY=YOUR_32_CHARACTER_HEX_KEY
   POWERVIEW_SHADE_PREFIX=DUE
   ```

4. **Install Netlify CLI (if not already installed):**
   ```bash
   npm install -g netlify-cli
   ```

5. **Start the dev server:**
   ```bash
   netlify dev
   ```

6. **Open in browser:**
   - Single shade: http://localhost:8000/index.html
   - Multi shade: http://localhost:8000/index-multi.html

#### Option 2: Using config.local.js

1. **Copy the config template:**
   ```bash
   cp config.local.example.js config.local.js
   ```

2. **Edit `config.local.js` with your settings:**
   ```javascript
   window.LOCAL_CONFIG = {
       encryptionKey: 'YOUR_32_CHARACTER_HEX_KEY',
       shadePrefix: 'DUE'
   };
   ```

3. **Start any web server:**
   ```bash
   python3 -m http.server 8000
   # or
   npx http-server -p 8000
   ```

4. **Open in browser:**
   - http://localhost:8000/index.html

## Deploying to Netlify

### Step 1: Fork This Repository

1. Click the "Fork" button on GitHub
2. Clone your fork to your local machine

### Step 2: Set Up Netlify

1. **Sign up/Login to [Netlify](https://netlify.com)**

2. **Click "Add new site" → "Import an existing project"**

3. **Connect to GitHub and select your forked repository**

4. **Configure build settings:**
   - Build command: (leave empty)
   - Publish directory: `.`
   - Click "Deploy site"

### Step 3: Configure Environment Variables

1. **Go to Site settings → Environment variables**

2. **Add the following variables:**

   | Key | Value | Example |
   |-----|-------|---------|
   | `POWERVIEW_ENCRYPTION_KEY` | Your 32-character hex key | `YOUR_KEY_HERE` |
   | `POWERVIEW_SHADE_PREFIX` | Your shade name prefix | `DUE` |

3. **Redeploy your site:**
   - Go to Deploys → Trigger deploy → Deploy site

### Step 4: Access Your App

Your app will be available at: `https://your-site-name.netlify.app`

**Important:** Web Bluetooth requires HTTPS, which Netlify provides automatically!

## Getting Your Encryption Key

If you haven't extracted your encryption key yet, follow the complete guide:

**[EXTRACT_KEY_ANDROID_EMULATOR.md](EXTRACT_KEY_ANDROID_EMULATOR.md)**

This guide walks you through:
- Setting up Android Studio (free)
- Creating a rooted Android emulator
- Installing the PowerView app
- Extracting your personal encryption key

**Time:** ~30 minutes
**Cost:** $0 (completely free!)

## Usage

### Single Shade Mode

1. Open the app in Chrome/Edge
2. Click **"📡 Scan for Shades"**
3. Select your shade from the Bluetooth dialog
4. Click **"Pair"**
5. Use the slider or buttons to control position!

### Multi Shade Mode

1. Navigate to the multi-shade page
2. Click **"➕ Add Shade"**
3. Select and pair first shade
4. Click **"➕ Add Shade"** again for additional shades
5. Control each shade independently!

## Configuration

### Shade Name Filter

The app filters shades by name prefix during scanning. To customize:

**Using .env (for Netlify):**
```bash
POWERVIEW_SHADE_PREFIX=YOUR_PREFIX
```

**Using config.local.js (for local development):**
```javascript
window.LOCAL_CONFIG = {
    shadePrefix: 'YOUR_PREFIX'  // e.g., 'DUE', 'SHD', etc.
};
```

Common shade prefixes:
- `DUE` - Duette shades
- `SHD` - Standard shades
- `ROL` - Roller shades

## Forking for Your Own Use

### What to Keep Private

The `.gitignore` file is configured to exclude:
- ✅ `config.local.js` - Your local configuration
- ✅ `.env` - Your environment variables
- ✅ `CLAUDE_CONTEXT.md` - Development history (optional)

### Files to Check Before Pushing

Before committing, make sure you haven't accidentally included:
- Your encryption key in any `.js` files
- Personal shade names or IDs
- Any `.env` files (use `.env.example` as template)

### Files Safe to Share

These files are templates and safe to commit:
- ✅ `config.local.example.js` - Config template
- ✅ `.env.example` - Environment template
- ✅ `config.js` - Configuration loader (no secrets)
- ✅ All HTML, CSS, and core JS files

## Project Structure

```
.
├── index.html                  # Single shade UI
├── index-multi.html            # Multi shade UI
├── style.css                   # Styling
├── app.js                      # Single shade logic
├── app-multi.js                # Multi shade logic
├── bluetooth.js                # BLE communication
├── encryption.js               # AES-128-CTR encryption
├── config.js                   # Configuration loader
├── config.local.example.js     # Local config template
├── .env.example                # Environment template
├── netlify.toml                # Netlify configuration
├── netlify/
│   └── functions/
│       └── config.js           # Netlify function for env injection
├── README.md                   # This file
└── EXTRACT_KEY_ANDROID_EMULATOR.md  # Key extraction guide
```

## How It Works

### Bluetooth Protocol

The app communicates with PowerView Gen 3 shades using:

**Service UUID:** `0000fdc1-0000-1000-8000-00805f9b34fb`
**Characteristic:** `cafe1001-c0ff-ee01-8000-a110ca7ab1e0`

### Command Structure

Commands follow this format:
```
[cmd_id_low, cmd_id_high, sequence, data_length, ...data]
```

**Set Position Command (0x01F7):**
```
F7 01 [seq] 09 [pos*100 lo] [pos*100 hi] 00 80 00 80 00 80 00
```

**Identify Command (0x11F7):**
```
F7 11 [seq] 01 03
```

**Stop Command (0xB8F7):**
```
F7 B8 [seq] 00
```

### Encryption

All commands are encrypted using **AES-128-CTR** mode:
- **Algorithm:** AES-128
- **Mode:** CTR (Counter)
- **Key:** Your 16-byte home key
- **IV:** 16 bytes of zeros

The encryption key is unique to your PowerView account and is stored in the app's SQLite database.

## Browser Compatibility

| Browser | Desktop | Mobile |
|---------|---------|--------|
| Chrome  | ✅      | ✅     |
| Edge    | ✅      | ✅     |
| Opera   | ✅      | ✅     |
| Safari  | ❌      | ❌     |
| Firefox | ❌      | ❌     |

**Note:** Safari and Firefox don't support Web Bluetooth API.

## Troubleshooting

### "Bluetooth not available"

- Ensure Bluetooth is enabled on your computer
- Use Chrome or Edge browser (not Safari/Firefox)
- Make sure site is served over HTTPS or localhost

### "No shades found"

- Check shade is powered on and nearby
- Verify shade isn't connected to another device
- Try rescanning
- Check shade name matches filter in configuration

### Connection drops immediately

- This is normal - connection is established on-demand
- App will reconnect automatically when sending commands

### Commands not working

- Check debug console for errors
- Verify encryption key is correct in `.env` or `config.local.js`
- Ensure shade is in range
- Try power cycling the shade

### "No encryption key configured"

- Make sure `.env` file exists with `POWERVIEW_ENCRYPTION_KEY` set
- OR ensure `config.local.js` has `encryptionKey` configured
- Check the browser console for specific errors

## Security Considerations

### Local Deployment
- ✅ Safe - only accessible on your network
- ✅ Can use localhost
- ✅ Private keys stay on your machine

### Netlify Deployment
- ✅ HTTPS enabled by default
- ✅ Environment variables stored securely
- ⚠️ Anyone with access to your Netlify URL can control your shades
- 💡 Consider adding authentication if sharing publicly

### Best Practices
- Don't commit `.env` or `config.local.js` to git
- Use Netlify's environment variables for production
- Keep your encryption key private
- Consider enabling Netlify password protection for your site

## Credits & Resources

This project was made possible by reverse-engineering work from:

- **[hdpv_ble](https://github.com/patman15/hdpv_ble)** - Home Assistant integration (Python)
- **[openHAB PowerView](https://www.openhab.org/addons/bindings/bluetooth.hdpowerview/)** - Java binding
- Hunter Douglas PowerView Gen 3 protocol analysis

### Key Resources

- [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)
- [CryptoJS Documentation](https://cryptojs.gitbook.io/docs/)
- [Hunter Douglas PowerView](https://www.hunterdouglas.com/smart-automation)
- [Netlify Documentation](https://docs.netlify.com/)

## Contributing

Found a bug or want to add a feature? Contributions welcome!

### Testing Different Shade Types

This has been tested with:
- ✅ PowerView Gen 3 shades
- ✅ Duette shades

If you test with other shade types, please share your findings!

## License

MIT License - Feel free to use and modify!

## Success!

If you got this working, you now have:

✅ Complete control of your PowerView shades
✅ No hub required ($200+ saved)
✅ Works on any device with Chrome
✅ Free and open source
✅ Privacy-focused (local or self-hosted control)
✅ Easy to fork and deploy

**Total cost: $0**
**Setup time: ~30 minutes**
**Result: Priceless** 🪟✨

---

Built with Claude Code
