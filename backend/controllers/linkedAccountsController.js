const db = require('../config/database');

// The linked_accounts column on users is JSONB storing an array of { provider, externalId?, connected }
// These controller methods provide a stable API even before real OAuth provider flows are added.

const linkedAccountsController = {
  async listLinkedAccounts(req, res) {
    try {
      const user = await db('users')
        .where({ id: req.user.userId })
        .select('linked_accounts')
        .first();

      let accounts = [];
      if (user?.linked_accounts) {
        if (typeof user.linked_accounts === 'object') {
          accounts = Array.isArray(user.linked_accounts) ? user.linked_accounts : [];
        } else if (typeof user.linked_accounts === 'string' && user.linked_accounts.trim()) {
          try { accounts = JSON.parse(user.linked_accounts); } catch { accounts = []; }
        }
      }

      return res.json({ success: true, data: { accounts } });
    } catch (err) {
      console.error('listLinkedAccounts error:', err);
      return res.status(500).json({ success: false, message: 'Failed to load linked accounts' });
    }
  },

  async connectAccount(req, res) {
    try {
      const { provider, externalId } = req.body;
      if (!provider) {
        return res.status(400).json({ success: false, message: 'Provider is required' });
      }

      // Load existing accounts
      const user = await db('users')
        .where({ id: req.user.userId })
        .select('linked_accounts')
        .first();

      let accounts = [];
      if (user?.linked_accounts) {
        if (typeof user.linked_accounts === 'object') {
          accounts = Array.isArray(user.linked_accounts) ? user.linked_accounts : [];
        } else if (typeof user.linked_accounts === 'string' && user.linked_accounts.trim()) {
          try { accounts = JSON.parse(user.linked_accounts); } catch { accounts = []; }
        }
      }

      const idx = accounts.findIndex((a) => a.provider === provider);
      if (idx >= 0) {
        accounts[idx] = { ...accounts[idx], connected: true, externalId: externalId || accounts[idx].externalId };
      } else {
        accounts.push({ provider, externalId: externalId || null, connected: true });
      }

      await db('users')
        .where({ id: req.user.userId })
        .update({ linked_accounts: JSON.stringify(accounts), updated_at: new Date() });

      return res.json({ success: true, message: 'Account connected', data: { accounts } });
    } catch (err) {
      console.error('connectAccount error:', err);
      return res.status(500).json({ success: false, message: 'Failed to connect account' });
    }
  },

  async disconnectAccount(req, res) {
    try {
      const { provider } = req.body;
      if (!provider) {
        return res.status(400).json({ success: false, message: 'Provider is required' });
      }

      const user = await db('users')
        .where({ id: req.user.userId })
        .select('linked_accounts')
        .first();

      let accounts = [];
      if (user?.linked_accounts) {
        if (typeof user.linked_accounts === 'object') {
          accounts = Array.isArray(user.linked_accounts) ? user.linked_accounts : [];
        } else if (typeof user.linked_accounts === 'string' && user.linked_accounts.trim()) {
          try { accounts = JSON.parse(user.linked_accounts); } catch { accounts = []; }
        }
      }

      const idx = accounts.findIndex((a) => a.provider === provider);
      if (idx >= 0) {
        accounts[idx] = { ...accounts[idx], connected: false };
      }

      await db('users')
        .where({ id: req.user.userId })
        .update({ linked_accounts: JSON.stringify(accounts), updated_at: new Date() });

      return res.json({ success: true, message: 'Account disconnected', data: { accounts } });
    } catch (err) {
      console.error('disconnectAccount error:', err);
      return res.status(500).json({ success: false, message: 'Failed to disconnect account' });
    }
  }
};

module.exports = linkedAccountsController;

