/**
 * Protected localStorage wrapper that prevents accidental token deletion
 */

const PROTECTED_KEYS = ['token', 'user'];
let isClearing = false;

// Store original methods
const originalSetItem = localStorage.setItem.bind(localStorage);
const originalRemoveItem = localStorage.removeItem.bind(localStorage);
const originalClear = localStorage.clear.bind(localStorage);

// Override setItem to log
localStorage.setItem = function(key: string, value: string) {
  console.log(`📝 localStorage.setItem('${key}')`, value.substring(0, 50) + '...');
  return originalSetItem(key, value);
};

// Override removeItem to log and protect
localStorage.removeItem = function(key: string) {
  if (PROTECTED_KEYS.includes(key) && !isClearing) {
    console.warn(`⚠️ BLOCKED: Attempt to remove protected key '${key}'`);
    console.trace('Stack trace:');
    return;
  }
  console.log(`🗑️ localStorage.removeItem('${key}')`);
  return originalRemoveItem(key);
};

// Override clear to log
localStorage.clear = function() {
  console.warn('🗑️ localStorage.clear() called');
  console.trace('Stack trace:');
  return originalClear();
};

// Export function to allow intentional clearing
export function clearAuthStorage() {
  isClearing = true;
  originalRemoveItem('token');
  originalRemoveItem('user');
  isClearing = false;
  console.log('✅ Auth storage cleared intentionally');
}

export function setAuthStorage(token: string, user: any) {
  originalSetItem('token', token);
  originalSetItem('user', JSON.stringify(user));
  console.log('✅ Auth storage set');
}
