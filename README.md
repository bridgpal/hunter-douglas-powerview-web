# PowerView Shade Control - Web App

A modern web-based controller for Hunter Douglas PowerView Gen 3 shades using Web Bluetooth API. Control your shades directly from Chrome/Edge without needing a hub or gateway!

## Features

- 🔍 **Scan and discover** PowerView shades via Bluetooth
- 🎚️ **Control shade position** (0-100%) with slider or quick buttons
- 🔐 **AES-128-CTR encryption** with your extracted home key
- 📱 **Cross-platform** - Works on Mac, Windows, Linux, Android (Chrome/Edge)
- 🪟 **Multi-shade support** - Control multiple shades with localStorage persistence
- 🐛 **Built-in debug console** for troubleshooting
- ⚡ **Built with Vite** - Fast development and optimized builds
- 💾 **Persistent shade storage** - Remembers your paired shades

## Quick Start

### Prerequisites

- Chrome or Edge browser (Safari doesn't support Web Bluetooth)
- Bluetooth enabled on your computer
- Hunter Douglas PowerView Gen 3 shades
- Your encryption key (see [EXTRACT_KEY_ANDROID_EMULATOR.md](EXTRACT_KEY_ANDROID_EMULATOR.md))

### Local Development

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd hunter-douglas-pwa
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Copy the environment file:**
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` with your settings:**
   ```bash
   VITE_POWERVIEW_ENCRYPTION_KEY=YOUR_32_CHARACTER_HEX_KEY
   VITE_POWERVIEW_SHADE_PREFIX=DUE
   ```
   **Note:** Vite requires the `VITE_` prefix for environment variables.

5. **Start the dev server:**
   ```bash
   npm run dev
   ```

6. **Open in browser:**
   - Navigate to http://localhost:8000

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

1. Open the app in Chrome/Edge
2. Click **"➕ Add Shade"**
3. Select your shade from the Bluetooth dialog
4. Click **"Pair"**
5. Use the slider or buttons to control position!
6. Add more shades by clicking **"➕ Add Shade"** again
7. Your paired shades are saved in localStorage and will persist between sessions

## Configuration

### Shade Name Filter

The app filters shades by name prefix during scanning. To customize:

**Using .env:**
```bash
VITE_POWERVIEW_SHADE_PREFIX=YOUR_PREFIX
```

Common shade prefixes:
- `DUE` - Duette shades
- `SHD` - Standard shades
- `ROL` - Roller shades

## Project Structure

```
.
├── index.html                  # Multi-shade UI
├── src/
│   ├── js/
│   │   ├── app.js              # Multi-shade logic
│   │   ├── bluetooth.js        # BLE communication
│   │   ├── encryption.js       # AES-128-CTR encryption
│   │   ├── config.js           # Configuration loader
│   │   └── main.js             # Entry point
│   └── style.css               # Styling
├── netlify/
│   └── functions/
│       └── weather.mts         # Example Netlify function
├── .env.example                # Environment template
├── netlify.toml                # Netlify configuration
├── vite.config.js              # Vite build configuration
├── package.json                # Dependencies and scripts
├── README.md                   # This file
└── EXTRACT_KEY_ANDROID_EMULATOR.md  # Key extraction guide
```

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

- Make sure `.env` file exists with `VITE_POWERVIEW_ENCRYPTION_KEY` set
- Restart the dev server after changing `.env` file
- Check the browser console for specific errors

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

