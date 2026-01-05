// PowerView Bluetooth Manager
// Real UUIDs extracted from hdpv_ble project
import { PowerViewEncryption, bytesToHex } from './encryption.js';
import { config } from './config.js';

const POWERVIEW_SERVICE_UUID = '0000fdc1-0000-1000-8000-00805f9b34fb';  // Main shade service
const COMMAND_CHARACTERISTIC_UUID = 'cafe1001-c0ff-ee01-8000-a110ca7ab1e0';  // TX characteristic (read/write/notify)
const STATUS_CHARACTERISTIC_UUID = 'cafe1001-c0ff-ee01-8000-a110ca7ab1e0';  // Same as command (bidirectional)

class BluetoothManager {
    constructor(debugCallback) {
        this.device = null;
        this.server = null;
        this.service = null;
        this.commandCharacteristic = null;
        this.statusCharacteristic = null;
        this.debug = debugCallback; // Store debug callback
    }

    /**
     * Scans for PowerView shades
     */
    async scan() {
        try {
            this.debug('Scanning for PowerView shades...', 'info');

            // Filter for PowerView shades (configurable prefix)
            this.device = await navigator.bluetooth.requestDevice({
                filters: [
                    { namePrefix: config.shadePrefix }
                ],
                optionalServices: [
                    POWERVIEW_SERVICE_UUID,
                    '0000180a-0000-1000-8000-00805f9b34fb', // Device Information
                    '0000180f-0000-1000-8000-00805f9b34fb'  // Battery Service
                ]
            });

            this.debug(`Found device: ${this.device.name}`, 'success');
            return this.device;

        } catch (error) {
            this.debug(`Scan error: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Connects to a shade
     */
    async connect() {
        try {
            if (!this.device) {
                throw new Error('No device selected');
            }

            this.debug(`Connecting to ${this.device.name}...`, 'info');

            this.server = await this.device.gatt.connect();
            this.debug('Connected to GATT server', 'success');

            // Discover all services first
            this.debug('Discovering services...', 'info');
            const services = await this.server.getPrimaryServices();

            this.debug(`Found ${services.length} service(s):`, 'info');
            for (const service of services) {
                this.debug(`  Service: ${service.uuid}`, 'info');

                // Discover characteristics for each service
                const characteristics = await service.getCharacteristics();
                for (const char of characteristics) {
                    this.debug(`    Characteristic: ${char.uuid}`, 'info');
                    this.debug(`      Properties: ${JSON.stringify(char.properties)}`, 'info');
                }
            }

            // Try to get the PowerView service
            try {
                this.service = await this.server.getPrimaryService(POWERVIEW_SERVICE_UUID);
                this.debug('Found PowerView service', 'success');

                // Get characteristics
                this.commandCharacteristic = await this.service.getCharacteristic(COMMAND_CHARACTERISTIC_UUID);
                this.statusCharacteristic = await this.service.getCharacteristic(STATUS_CHARACTERISTIC_UUID);

                // Subscribe to notifications
                await this.statusCharacteristic.startNotifications();
                this.statusCharacteristic.addEventListener('characteristicvaluechanged', this.handleStatusUpdate.bind(this));

                this.debug('Ready to send commands', 'success');

            } catch (serviceError) {
                this.debug('PowerView service not found with expected UUID', 'error');
                this.debug('Use the discovered UUIDs above to update bluetooth.js', 'info');
            }

        } catch (error) {
            this.debug(`Connection error: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Ensures we're connected before sending
     */
    async ensureConnected() {
        if (!this.device) {
            throw new Error('No device selected');
        }

        if (!this.device.gatt.connected) {
            this.debug('Reconnecting to shade...', 'info');
            await this.connect();
        }
    }

    /**
     * Sends a command to the shade
     */
    async sendCommand(commandData) {
        try {
            // Make sure we're connected
            await this.ensureConnected();

            if (!this.commandCharacteristic) {
                throw new Error('Not connected to shade');
            }

            this.debug(`Sending command: ${bytesToHex(commandData)}`, 'info');

            // Encrypt the command
            const encrypted = PowerViewEncryption.encrypt(commandData);
            this.debug(`Encrypted: ${bytesToHex(encrypted)}`, 'info');

            // Write to characteristic
            await this.commandCharacteristic.writeValue(encrypted);
            this.debug('Command sent', 'success');

        } catch (error) {
            this.debug(`Send error: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Handles status updates from the shade
     */
    handleStatusUpdate(event) {
        const value = event.target.value;
        const encrypted = new Uint8Array(value.buffer);

        this.debug(`Received status: ${bytesToHex(encrypted)}`, 'info');

        try {
            const decrypted = PowerViewEncryption.decrypt(encrypted);
            this.debug(`Decrypted status: ${bytesToHex(decrypted)}`, 'success');

            // Parse status (format depends on protocol)
            // Typically: [status_code, position_hi, position_lo, battery, ...]
            const position = ((decrypted[1] << 8) | decrypted[2]) / 655.35; // Convert to 0-100
            this.debug(`Shade position: ${position.toFixed(0)}%`, 'info');

        } catch (error) {
            this.debug(`Error decrypting status: ${error.message}`, 'error');
        }
    }

    /**
     * Disconnects from the shade
     */
    disconnect() {
        if (this.device && this.device.gatt.connected) {
            this.device.gatt.disconnect();
            this.debug('Disconnected', 'info');
        }
        this.device = null;
        this.server = null;
        this.service = null;
        this.commandCharacteristic = null;
        this.statusCharacteristic = null;
    }
}

// Command builder
class PowerViewCommands {
    static sequenceCounter = 0;

    /**
     * Creates a set position command
     * @param {number} position - Position 0-100
     * @returns {Uint8Array} Command data ready to encrypt
     */
    static setPosition(position) {
        // Clamp position
        position = Math.max(0, Math.min(100, position));

        // Command ID for SET_POSITION = 0x01F7
        const cmdId = 0x01F7;

        // Position value (pos1 * 100) as 16-bit little-endian
        const pos1Value = position * 100;
        const pos1Lo = pos1Value & 0xFF;
        const pos1Hi = (pos1Value >> 8) & 0xFF;

        // pos2, pos3, tilt = 0x8000 (not used)
        const unusedLo = 0x00;
        const unusedHi = 0x80;

        // Velocity = 0x00
        const velocity = 0x00;

        // Data payload
        const dataPayload = new Uint8Array([
            pos1Lo, pos1Hi,     // pos1 * 100 (little-endian)
            unusedLo, unusedHi, // pos2 = 0x8000
            unusedLo, unusedHi, // pos3 = 0x8000
            unusedLo, unusedHi, // tilt = 0x8000
            velocity            // velocity
        ]);

        // Build command packet: [cmd_lo, cmd_hi, sequence, data_length, ...data]
        const packet = new Uint8Array(4 + dataPayload.length);
        packet[0] = cmdId & 0xFF;           // Command ID low byte
        packet[1] = (cmdId >> 8) & 0xFF;    // Command ID high byte
        packet[2] = this.sequenceCounter;    // Sequence number
        packet[3] = dataPayload.length;      // Data length
        packet.set(dataPayload, 4);          // Data

        this.sequenceCounter++;

        return packet;
    }

    /**
     * Creates an identify command (beep/flash)
     * @returns {Uint8Array} Command data
     */
    static identify() {
        const cmdId = 0x11F7; // IDENTIFY command
        const beeps = 0x03;   // Number of beeps

        const dataPayload = new Uint8Array([beeps]);

        const packet = new Uint8Array(4 + dataPayload.length);
        packet[0] = cmdId & 0xFF;
        packet[1] = (cmdId >> 8) & 0xFF;
        packet[2] = this.sequenceCounter;
        packet[3] = dataPayload.length;
        packet.set(dataPayload, 4);

        this.sequenceCounter++;

        return packet;
    }

    /**
     * Creates a stop command
     * @returns {Uint8Array} Command data
     */
    static stop() {
        const cmdId = 0xB8F7; // STOP command

        const packet = new Uint8Array(4); // No data payload
        packet[0] = cmdId & 0xFF;
        packet[1] = (cmdId >> 8) & 0xFF;
        packet[2] = this.sequenceCounter;
        packet[3] = 0; // Data length = 0

        this.sequenceCounter++;

        return packet;
    }
}

export { BluetoothManager, PowerViewCommands };
