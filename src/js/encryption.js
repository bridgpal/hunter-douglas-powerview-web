// PowerView Encryption using AES-128-CTR
// Encryption key is loaded from config
import CryptoJS from 'crypto-js';
import { config } from './config.js';

class PowerViewEncryption {
    /**
     * Encrypts data using AES-128-CTR with your home key
     * @param {ArrayBuffer|Uint8Array} data - Data to encrypt
     * @returns {Uint8Array} Encrypted data
     */
    static encrypt(data) {
        // Convert to hex string for CryptoJS
        const dataArray = new Uint8Array(data);
        const hexData = Array.from(dataArray)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        // Parse as WordArray
        const wordArray = CryptoJS.enc.Hex.parse(hexData);
        const key = CryptoJS.enc.Hex.parse(config.encryptionKey);

        // IV is 16 bytes of zeros for CTR mode
        const iv = CryptoJS.enc.Hex.parse('00000000000000000000000000000000');

        // Encrypt using AES-128-CTR
        const encrypted = CryptoJS.AES.encrypt(wordArray, key, {
            iv: iv,
            mode: CryptoJS.mode.CTR,
            padding: CryptoJS.pad.NoPadding
        });

        // Convert back to Uint8Array
        const encryptedHex = encrypted.ciphertext.toString();
        const encryptedArray = new Uint8Array(encryptedHex.match(/.{2}/g).map(byte => parseInt(byte, 16)));

        return encryptedArray;
    }

    /**
     * Decrypts data using AES-128-CTR with your home key
     * @param {ArrayBuffer|Uint8Array} data - Data to decrypt
     * @returns {Uint8Array} Decrypted data
     */
    static decrypt(data) {
        // Convert to hex string for CryptoJS
        const dataArray = new Uint8Array(data);
        const hexData = Array.from(dataArray)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        const key = CryptoJS.enc.Hex.parse(config.encryptionKey);
        const iv = CryptoJS.enc.Hex.parse('00000000000000000000000000000000');

        // Create ciphertext object
        const ciphertext = CryptoJS.enc.Hex.parse(hexData);

        // Decrypt using AES-128-CTR
        const decrypted = CryptoJS.AES.decrypt(
            { ciphertext: ciphertext },
            key,
            {
                iv: iv,
                mode: CryptoJS.mode.CTR,
                padding: CryptoJS.pad.NoPadding
            }
        );

        // Convert back to Uint8Array
        const decryptedHex = decrypted.toString();
        const decryptedArray = new Uint8Array(decryptedHex.match(/.{2}/g).map(byte => parseInt(byte, 16)));

        return decryptedArray;
    }
}

// Utility functions
function bytesToHex(bytes) {
    return Array.from(new Uint8Array(bytes))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ');
}

function hexToBytes(hex) {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return new Uint8Array(bytes);
}

export { PowerViewEncryption, bytesToHex, hexToBytes };
