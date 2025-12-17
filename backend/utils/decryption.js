const crypto = require('crypto');

const algorithm = 'aes-256-cbc';
const rawKey = process.env.ENCRYPTION_KEY || 'eoty-platform-default-passphrase';
const rawIv = process.env.ENCRYPTION_IV || 'eoty-platform-default-iv';

// Derive fixed-length key and IV matching encryption.js
const key = crypto.scryptSync(rawKey, 'eoty-platform-salt', 32);
const iv = crypto.createHash('sha256').update(rawIv).digest().slice(0, 16);

const decrypt = (encryptedText) => {
  try {
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
};

module.exports = decrypt;

