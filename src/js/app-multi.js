// Multi-shade app logic
import { BluetoothManager, PowerViewCommands } from './bluetooth.js';
import { validateConfig } from './config.js';

let shadeManagers = new Map(); // Map of shade ID -> BluetoothManager

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
    // Original line 16 was: debug('Encryption key loaded: ' + HOME_KEY.substring(0, 8) + '...', 'success');
    debug('Ready to add shades!', 'info');

    // Setup event listeners
    const addShadeBtn = document.getElementById('addShadeButton');
    if (addShadeBtn) addShadeBtn.addEventListener('click', addShade);

    const closeAllBtn = document.querySelector('.control-all .btn-secondary:nth-child(1)');
    const halfAllBtn = document.querySelector('.control-all .btn-secondary:nth-child(2)');
    const openAllBtn = document.querySelector('.control-all .btn-secondary:nth-child(3)');

    if (closeAllBtn) closeAllBtn.addEventListener('click', () => setAllShades(0));
    if (halfAllBtn) halfAllBtn.addEventListener('click', () => setAllShades(50));
    if (openAllBtn) openAllBtn.addEventListener('click', () => setAllShades(100));

    const clearBtn = document.querySelector('.debug-section .btn-small');
    if (clearBtn) clearBtn.addEventListener('click', clearDebug);
});

async function addShade() {
    try {
        updateStatus('Scanning for shades...');
        debug('Scanning for shades...', 'info');

        const manager = new BluetoothManager(debug);
        const device = await manager.scan();

        if (device) {
            // Check if already added
            if (shadeManagers.has(device.id)) {
                updateStatus(`${device.name} already added`);
                debug(`Shade ${device.name} already in list`, 'info');
                return;
            }

            updateStatus(`Connecting to ${device.name}...`);
            await manager.connect();

            // Add to our collection
            shadeManagers.set(device.id, manager);

            // Create UI card for this shade
            createShadeCard(device.id, device.name, manager);

            updateStatus(`${device.name} connected`);
            debug(`Successfully added ${device.name}`, 'success');
        }

    } catch (error) {
        if (error.name === 'NotFoundError') {
            updateStatus('No shades found or cancelled');
        } else {
            updateStatus(`Error: ${error.message}`);
            debug(`Error adding shade: ${error.message}`, 'error');
        }
    }
}

function createShadeCard(shadeId, shadeName, manager) {
    const container = document.getElementById('shadesContainer');

    const card = document.createElement('div');
    card.className = 'shade-card';
    card.id = `shade-${shadeId}`;

    // Create card without inline event handlers
    card.innerHTML = `
        <div class="shade-header">
            <div class="shade-title">${shadeName}</div>
            <span class="shade-status status-connected">Connected</span>
        </div>

        <div class="control-group">
            <label>Position: <span id="position-${shadeId}">50</span>%</label>
            <input type="range"
                   id="slider-${shadeId}"
                   min="0"
                   max="100"
                   value="50"
                   class="slider"
                   data-shade-id="${shadeId}">
        </div>

        <div class="quick-actions">
            <button class="btn btn-secondary shade-btn-close" data-shade-id="${shadeId}">Close</button>
            <button class="btn btn-secondary shade-btn-half" data-shade-id="${shadeId}">50%</button>
            <button class="btn btn-secondary shade-btn-open" data-shade-id="${shadeId}">Open</button>
        </div>

        <div class="advanced-section">
            <button class="btn btn-small shade-btn-identify" data-shade-id="${shadeId}">Identify</button>
            <button class="btn btn-small shade-btn-remove" data-shade-id="${shadeId}">Remove</button>
        </div>
    `;

    container.appendChild(card);

    // Attach event listeners after adding to DOM
    const slider = document.getElementById(`slider-${shadeId}`);
    if (slider) {
        slider.addEventListener('input', (e) => {
            document.getElementById(`position-${shadeId}`).textContent = e.target.value;
        });
        slider.addEventListener('change', (e) => {
            setShadePosition(shadeId, parseInt(e.target.value));
        });
    }

    // Button listeners
    const closeBtn = card.querySelector('.shade-btn-close');
    const halfBtn = card.querySelector('.shade-btn-half');
    const openBtn = card.querySelector('.shade-btn-open');
    const identifyBtn = card.querySelector('.shade-btn-identify');
    const removeBtn = card.querySelector('.shade-btn-remove');

    if (closeBtn) closeBtn.addEventListener('click', () => setShadePosition(shadeId, 0));
    if (halfBtn) halfBtn.addEventListener('click', () => setShadePosition(shadeId, 50));
    if (openBtn) openBtn.addEventListener('click', () => setShadePosition(shadeId, 100));
    if (identifyBtn) identifyBtn.addEventListener('click', () => identifyShade(shadeId));
    if (removeBtn) removeBtn.addEventListener('click', () => removeShade(shadeId));
}

async function setShadePosition(shadeId, position) {
    const manager = shadeManagers.get(shadeId);
    if (!manager) {
        debug(`Shade ${shadeId} not found`, 'error');
        return;
    }

    try {
        debug(`Setting shade ${shadeId} to ${position}%`, 'info');

        const command = PowerViewCommands.setPosition(parseInt(position));
        await manager.sendCommand(command);

        // Update slider if called from button
        const slider = document.getElementById(`slider-${shadeId}`);
        if (slider) {
            slider.value = position;
            document.getElementById(`position-${shadeId}`).textContent = position;
        }

        debug(`Command sent to shade ${shadeId}`, 'success');

    } catch (error) {
        debug(`Error controlling shade ${shadeId}: ${error.message}`, 'error');
    }
}

async function identifyShade(shadeId) {
    const manager = shadeManagers.get(shadeId);
    if (!manager) return;

    try {
        debug(`Identifying shade ${shadeId}`, 'info');
        const command = PowerViewCommands.identify();
        await manager.sendCommand(command);
    } catch (error) {
        debug(`Error identifying shade: ${error.message}`, 'error');
    }
}

function removeShade(shadeId) {
    const manager = shadeManagers.get(shadeId);
    if (manager) {
        manager.disconnect();
        shadeManagers.delete(shadeId);
    }

    const card = document.getElementById(`shade-${shadeId}`);
    if (card) {
        card.remove();
    }

    debug(`Removed shade ${shadeId}`, 'info');
}

// Control all shades at once
async function setAllShades(position) {
    for (const [shadeId, manager] of shadeManagers) {
        await setShadePosition(shadeId, position);
    }
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

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    for (const [_, manager] of shadeManagers) {
        manager.disconnect();
    }
});
