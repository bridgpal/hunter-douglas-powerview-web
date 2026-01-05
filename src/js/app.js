// Main app logic
import { BluetoothManager, PowerViewCommands } from './bluetooth.js';
import { validateConfig } from './config.js';

let bluetoothManager = null;
let currentShade = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Validate config first
    try {
        validateConfig();
    } catch (error) {
        debug(error.message, 'error');
        updateStatus(error.message);
        document.getElementById('scanButton').disabled = true;
        return;
    }

    // Create bluetooth manager with debug callback
    bluetoothManager = new BluetoothManager(debug);

    // Check if Web Bluetooth is supported
    if (!navigator.bluetooth) {
        updateStatus('Web Bluetooth not supported. Use Chrome or Edge browser.');
        document.getElementById('scanButton').disabled = true;
        debug('Web Bluetooth API not available', 'error');
        debug('Please use Chrome or Edge browser', 'error');
        return;
    }

    debug('App initialized', 'success');
    // BUG FIX: Removed HOME_KEY reference - it doesn't exist!
    // Original line 19 was: debug('Encryption key loaded: ' + HOME_KEY.substring(0, 8) + '...', 'success');

    // Setup event listeners (replacing inline onclick handlers)
    document.getElementById('scanButton').addEventListener('click', scanForShades);

    // Button event listeners
    const closeBtn = document.querySelector('.quick-actions .btn-secondary:nth-child(1)');
    const halfBtn = document.querySelector('.quick-actions .btn-secondary:nth-child(2)');
    const openBtn = document.querySelector('.quick-actions .btn-secondary:nth-child(3)');
    const identifyBtn = document.querySelector('.advanced-section .btn-small:nth-child(1)');
    const disconnectBtn = document.querySelector('.advanced-section .btn-small:nth-child(2)');
    const clearBtn = document.querySelector('.debug-section .btn-small');

    if (closeBtn) closeBtn.addEventListener('click', () => setPosition(0));
    if (halfBtn) halfBtn.addEventListener('click', () => setPosition(50));
    if (openBtn) openBtn.addEventListener('click', () => setPosition(100));
    if (identifyBtn) identifyBtn.addEventListener('click', identifyShade);
    if (disconnectBtn) disconnectBtn.addEventListener('click', disconnect);
    if (clearBtn) clearBtn.addEventListener('click', clearDebug);

    // Slider event listeners
    document.getElementById('positionSlider').addEventListener('input', (e) => {
        document.getElementById('positionValue').textContent = e.target.value;
    });
    document.getElementById('positionSlider').addEventListener('change', (e) => {
        setPosition(parseInt(e.target.value));
    });
});

async function scanForShades() {
    try {
        updateStatus('Scanning for shades...');
        const scanButton = document.getElementById('scanButton');
        scanButton.disabled = true;

        const device = await bluetoothManager.scan();

        if (device) {
            updateStatus(`Found: ${device.name}`);
            await connectToShade(device);
        }

    } catch (error) {
        if (error.name === 'NotFoundError') {
            updateStatus('No shades found. Make sure your shade is nearby.');
        } else {
            updateStatus(`Error: ${error.message}`);
        }
        debug(`Scan error: ${error}`, 'error');
    } finally {
        document.getElementById('scanButton').disabled = false;
    }
}

async function connectToShade(device) {
    try {
        updateStatus(`Connecting to ${device.name}...`);

        await bluetoothManager.connect();

        currentShade = device;
        updateStatus(`Connected to ${device.name}`);

        // Show control panel
        document.getElementById('controlPanel').style.display = 'block';
        document.getElementById('shadeName').textContent = device.name;

        debug('Connection successful!', 'success');
        debug('You can now control the shade', 'info');

    } catch (error) {
        updateStatus(`Connection failed: ${error.message}`);
        debug(`Connection error: ${error}`, 'error');
    }
}

async function setPosition(position) {
    try {
        if (!bluetoothManager.commandCharacteristic) {
            debug('Not connected to shade', 'error');
            return;
        }

        updateStatus(`Setting position to ${position}%...`);
        debug(`Setting position to ${position}%`, 'info');

        const command = PowerViewCommands.setPosition(position);
        await bluetoothManager.sendCommand(command);

        updateStatus(`Position set to ${position}%`);

    } catch (error) {
        updateStatus(`Error: ${error.message}`);
        debug(`Error setting position: ${error}`, 'error');
    }
}

async function identifyShade() {
    try {
        if (!bluetoothManager.commandCharacteristic) {
            debug('Not connected to shade', 'error');
            return;
        }

        updateStatus('Identifying shade...');
        debug('Sending identify command', 'info');

        const command = PowerViewCommands.identify();
        await bluetoothManager.sendCommand(command);

        updateStatus('Identify command sent');

    } catch (error) {
        updateStatus(`Error: ${error.message}`);
        debug(`Error identifying shade: ${error}`, 'error');
    }
}

function disconnect() {
    bluetoothManager.disconnect();
    currentShade = null;
    document.getElementById('controlPanel').style.display = 'none';
    updateStatus('Disconnected');
    debug('Disconnected from shade', 'info');
}

function updateStatus(message) {
    document.getElementById('status').textContent = message;
}

function debug(message, type = 'info') {
    const debugConsole = document.getElementById('debugConsole');
    const line = document.createElement('div');
    line.className = `debug-line ${type}`;

    const timestamp = new Date().toLocaleTimeString();
    line.textContent = `[${timestamp}] ${message}`;

    debugConsole.appendChild(line);
    debugConsole.scrollTop = debugConsole.scrollHeight;

    // Also log to browser console
    window.console.log(`[${type.toUpperCase()}] ${message}`);
}

function clearDebug() {
    document.getElementById('debugConsole').innerHTML = '';
}

// Handle disconnection
window.addEventListener('beforeunload', () => {
    if (bluetoothManager) {
        bluetoothManager.disconnect();
    }
});
