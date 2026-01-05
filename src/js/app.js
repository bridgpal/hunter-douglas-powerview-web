// Multi-shade app logic
import { BluetoothManager, PowerViewCommands } from './bluetooth.js';
import { validateConfig } from './config.js';

let shadeManagers = new Map(); // Map of shade ID -> BluetoothManager
const STORAGE_KEY = 'powerview_saved_shades';

// LocalStorage functions
function getSavedShades() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        debug('Error reading saved shades from localStorage', 'error');
        return [];
    }
}

function saveShadeToStorage(shadeId, shadeName) {
    try {
        const saved = getSavedShades();
        // Check if already saved
        if (!saved.find(s => s.id === shadeId)) {
            saved.push({ id: shadeId, name: shadeName });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
            debug(`Saved ${shadeName} to localStorage`, 'info');
        }
    } catch (error) {
        debug('Error saving to localStorage', 'error');
    }
}

function removeShadeFromStorage(shadeId) {
    try {
        const saved = getSavedShades();
        const filtered = saved.filter(s => s.id !== shadeId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        debug('Removed shade from localStorage', 'info');
    } catch (error) {
        debug('Error removing from localStorage', 'error');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Validate config first
    try {
        validateConfig();
    } catch (error) {
        debug(error.message, 'error');
        updateStatus(error.message);
        document.getElementById('addShadeButton').disabled = true;
        return;
    }

    // Check if Web Bluetooth is supported
    if (!navigator.bluetooth) {
        updateStatus('Web Bluetooth not supported. Use Chrome or Edge browser.');
        document.getElementById('addShadeButton').disabled = true;
        debug('Web Bluetooth API not available', 'error');
        debug('Please use Chrome or Edge browser', 'error');
        return;
    }

    debug('App initialized', 'success');
    debug('Ready to add shades!', 'info');

    // Setup event listeners
    const addShadeBtn = document.getElementById('addShadeButton');
    if (addShadeBtn) addShadeBtn.addEventListener('click', addShade);

    const reconnectAllBtn = document.getElementById('reconnectAllButton');
    if (reconnectAllBtn) reconnectAllBtn.addEventListener('click', reconnectAllShades);

    const closeAllBtn = document.querySelector('.control-all .btn-secondary:nth-child(1)');
    const halfAllBtn = document.querySelector('.control-all .btn-secondary:nth-child(2)');
    const openAllBtn = document.querySelector('.control-all .btn-secondary:nth-child(3)');

    if (closeAllBtn) closeAllBtn.addEventListener('click', () => setAllShades(0));
    if (halfAllBtn) halfAllBtn.addEventListener('click', () => setAllShades(50));
    if (openAllBtn) openAllBtn.addEventListener('click', () => setAllShades(100));

    const clearBtn = document.querySelector('.debug-section .btn-small');
    if (clearBtn) clearBtn.addEventListener('click', clearDebug);

    // Load saved shades (but don't auto-reconnect due to user gesture requirement)
    loadSavedShades();
});

function loadSavedShades() {
    const savedShades = getSavedShades();

    if (savedShades.length === 0) {
        debug('No saved shades found', 'info');
        return;
    }

    debug(`Found ${savedShades.length} saved shade(s)`, 'info');
    debug('Click "Reconnect All" or individual "Reconnect" buttons', 'info');

    // Show reconnect all button
    const reconnectAllBtn = document.getElementById('reconnectAllButton');
    if (reconnectAllBtn) {
        reconnectAllBtn.style.display = 'inline-block';
    }

    // Create cards for saved shades with disconnected status
    for (const shade of savedShades) {
        createShadeCard(shade.id, shade.name, null, 'disconnected');
    }
}

async function reconnectAllShades() {
    const savedShades = getSavedShades();

    if (savedShades.length === 0) {
        debug('No saved shades to reconnect', 'info');
        return;
    }

    updateStatus('Reconnecting to saved shades...');
    debug('Reconnecting all shades...', 'info');

    for (const shade of savedShades) {
        // Only reconnect if not already connected
        if (!shadeManagers.has(shade.id)) {
            await reconnectToShade(shade.id, shade.name);
        }
    }

    updateStatus('Ready');
}

async function reconnectToShade(shadeId, shadeName) {
    try {
        // Create card with "connecting" status first
        createShadeCard(shadeId, shadeName, null, 'connecting');
        debug(`Reconnecting to ${shadeName}...`, 'info');

        // Request device by ID
        const manager = new BluetoothManager(debug);
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ name: shadeName }],
            optionalServices: [
                '0000fdc1-0000-1000-8000-00805f9b34fb',
                '0000180a-0000-1000-8000-00805f9b34fb',
                '0000180f-0000-1000-8000-00805f9b34fb'
            ]
        });

        // Manually set the device on the manager
        manager.device = device;
        await manager.connect();

        // Update manager in map
        shadeManagers.set(shadeId, manager);

        // Update card status to connected
        updateShadeStatus(shadeId, 'connected');
        debug(`Reconnected to ${shadeName}`, 'success');

    } catch (error) {
        debug(`Failed to reconnect to ${shadeName}: ${error.message}`, 'error');
        updateShadeStatus(shadeId, 'disconnected');
    }
}

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

            // Save to localStorage
            saveShadeToStorage(device.id, device.name);

            // Create UI card for this shade
            createShadeCard(device.id, device.name, manager, 'connected');

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

function createShadeCard(shadeId, shadeName, manager, status = 'connected') {
    // Check if card already exists (for reconnect scenario)
    let card = document.getElementById(`shade-${shadeId}`);
    if (card) {
        // Just update status if card exists
        updateShadeStatus(shadeId, status);
        return;
    }

    const container = document.getElementById('shadesContainer');

    card = document.createElement('div');
    card.className = 'shade-card';
    card.id = `shade-${shadeId}`;

    const statusClass = status === 'connected' ? 'status-connected' :
                        status === 'connecting' ? 'status-connecting' :
                        'status-disconnected';
    const statusText = status === 'connected' ? 'Connected' :
                       status === 'connecting' ? 'Connecting...' :
                       'Disconnected';

    // Create card without inline event handlers
    card.innerHTML = `
        <div class="shade-header">
            <div class="shade-title">${shadeName}</div>
            <span class="shade-status ${statusClass}" id="status-${shadeId}">${statusText}</span>
        </div>

        <div class="control-group">
            <label>Position: <span id="position-${shadeId}">50</span>%</label>
            <input type="range"
                   id="slider-${shadeId}"
                   min="0"
                   max="100"
                   value="50"
                   class="slider"
                   data-shade-id="${shadeId}"
                   ${status !== 'connected' ? 'disabled' : ''}>
        </div>

        <div class="quick-actions">
            <button class="btn btn-secondary shade-btn-close" data-shade-id="${shadeId}" ${status !== 'connected' ? 'disabled' : ''}>Close</button>
            <button class="btn btn-secondary shade-btn-half" data-shade-id="${shadeId}" ${status !== 'connected' ? 'disabled' : ''}>50%</button>
            <button class="btn btn-secondary shade-btn-open" data-shade-id="${shadeId}" ${status !== 'connected' ? 'disabled' : ''}>Open</button>
        </div>

        <div class="advanced-section">
            <button class="btn btn-small shade-btn-identify" data-shade-id="${shadeId}" ${status !== 'connected' ? 'disabled' : ''}>Identify</button>
            <button class="btn btn-small shade-btn-reconnect" data-shade-id="${shadeId}" style="display: ${status === 'disconnected' ? 'inline-block' : 'none'};">Reconnect</button>
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
    const reconnectBtn = card.querySelector('.shade-btn-reconnect');
    const removeBtn = card.querySelector('.shade-btn-remove');

    if (closeBtn) closeBtn.addEventListener('click', () => setShadePosition(shadeId, 0));
    if (halfBtn) halfBtn.addEventListener('click', () => setShadePosition(shadeId, 50));
    if (openBtn) openBtn.addEventListener('click', () => setShadePosition(shadeId, 100));
    if (identifyBtn) identifyBtn.addEventListener('click', () => identifyShade(shadeId));
    if (reconnectBtn) reconnectBtn.addEventListener('click', () => reconnectToShade(shadeId, shadeName));
    if (removeBtn) removeBtn.addEventListener('click', () => removeShade(shadeId));
}

function updateShadeStatus(shadeId, status) {
    const statusElement = document.getElementById(`status-${shadeId}`);
    const card = document.getElementById(`shade-${shadeId}`);

    if (!statusElement || !card) return;

    // Update status badge
    statusElement.className = 'shade-status';
    if (status === 'connected') {
        statusElement.classList.add('status-connected');
        statusElement.textContent = 'Connected';
    } else if (status === 'connecting') {
        statusElement.classList.add('status-connecting');
        statusElement.textContent = 'Connecting...';
    } else {
        statusElement.classList.add('status-disconnected');
        statusElement.textContent = 'Disconnected';
    }

    // Enable/disable controls
    const isConnected = status === 'connected';
    const slider = card.querySelector('.slider');
    const buttons = card.querySelectorAll('.shade-btn-close, .shade-btn-half, .shade-btn-open, .shade-btn-identify');
    const reconnectBtn = card.querySelector('.shade-btn-reconnect');

    if (slider) slider.disabled = !isConnected;
    buttons.forEach(btn => btn.disabled = !isConnected);

    if (reconnectBtn) {
        reconnectBtn.style.display = status === 'disconnected' ? 'inline-block' : 'none';
    }
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
        updateShadeStatus(shadeId, 'disconnected');
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
        updateShadeStatus(shadeId, 'disconnected');
    }
}

function removeShade(shadeId) {
    const manager = shadeManagers.get(shadeId);
    if (manager) {
        manager.disconnect();
        shadeManagers.delete(shadeId);
    }

    // Remove from localStorage
    removeShadeFromStorage(shadeId);

    const card = document.getElementById(`shade-${shadeId}`);
    if (card) {
        card.remove();
    }

    debug(`Removed shade ${shadeId}`, 'info');

    // Hide reconnect all button if no saved shades remain
    const savedShades = getSavedShades();
    if (savedShades.length === 0) {
        const reconnectAllBtn = document.getElementById('reconnectAllButton');
        if (reconnectAllBtn) {
            reconnectAllBtn.style.display = 'none';
        }
    }
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