const crypto = require('crypto');

const algorithm = 'aes-256-cbc';
const rawKey = process.env.ENCRYPTION_KEY || 'eoty-platform-default-passphrase';
const rawIv = process.env.ENCRYPTION_IV || 'eoty-platform-default-iv';

// Derive fixed-length key and IV to satisfy AES-256-CBC requirements
// - Key: 32 bytes
// - IV: 16 bytes
const key = crypto.scryptSync(rawKey, 'eoty-platform-salt', 32);
const iv = crypto.createHash('sha256').update(rawIv).digest().slice(0, 16);

const encrypt = (text) => {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

module.exports = encrypt;

