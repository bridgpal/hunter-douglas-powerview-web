// Configuration for PowerView Shade Control
// Uses Vite's import.meta.env for environment variables

export const config = {
  encryptionKey: import.meta.env.VITE_POWERVIEW_ENCRYPTION_KEY,
  shadePrefix: import.meta.env.VITE_POWERVIEW_SHADE_PREFIX || 'DUE'
};

export function validateConfig() {
  if (!config.encryptionKey || config.encryptionKey.length === 0) {
    throw new Error('VITE_POWERVIEW_ENCRYPTION_KEY not configured. Please see README.md for setup instructions.');
  }
  if (config.encryptionKey.length !== 32) {
    throw new Error('Encryption key must be 32 hex characters (got ' + config.encryptionKey.length + ')');
  }
}
