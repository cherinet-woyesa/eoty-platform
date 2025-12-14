const crypto = require('crypto');

const algorithm = 'aes-256-cbc'; // Using AES-256-CBC encryption
const secretKey = process.env.ENCRYPTION_KEY || 'a_very_secret_key_of_at_least_32_chars_long'; // Should be 32 bytes (256 bits)
const iv = process.env.ENCRYPTION_IV || 'a_16_char_iv_key'; // Should be 16 bytes (128 bits)

if (secretKey.length < 32) {
  console.warn('WARNING: ENCRYPTION_KEY is less than 32 characters. Please set a strong 32-character key in your .env file.');
}

if (iv.length < 16) {
  console.warn('WARNING: ENCRYPTION_IV is less than 16 characters. Please set a strong 16-character IV in your .env file.');
}

const encrypt = (text) => {
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey), Buffer.from(iv));
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

module.exports = encrypt;

