const db = require('../config/database');

class RecordingPresetsService {
  /**
   * Get all presets for a user
   * @param {string} userId
   * @returns {Promise<Array>}
   */
  async getPresetsByUser(userId) {
    return db('recording_presets')
      .where({ user_id: userId })
      .orderBy('is_default', 'desc')
      .orderBy('created_at', 'desc');
  }

  /**
   * Get a single preset by ID
   * @param {string} userId
   * @param {number} presetId
   * @returns {Promise<Object>}
   */
  async getPresetById(userId, presetId) {
    return db('recording_presets')
      .where({ id: presetId, user_id: userId })
      .first();
  }

  /**
   * Get the default preset for a user
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getDefaultPreset(userId) {
    return db('recording_presets')
      .where({ user_id: userId, is_default: true })
      .first();
  }

  /**
   * Create a new recording preset
   * @param {string} userId
   * @param {Object} presetData
   * @returns {Promise<Object>}
   */
  async createPreset(userId, presetData) {
    const {
      name,
      quality = '720p',
      frame_rate = 30,
      bitrate = null,
      auto_adjust_quality = false,
      video_device_id = null,
      audio_device_id = null,
      enable_screen = false,
      layout = 'picture-in-picture',
      is_default = false
    } = presetData;

    // If this is set as default, unset other defaults
    if (is_default) {
      await db('recording_presets')
        .where({ user_id: userId, is_default: true })
        .update({ is_default: false });
    }

    const [newPreset] = await db('recording_presets').insert({
      user_id: userId,
      name,
      quality,
      frame_rate,
      bitrate,
      auto_adjust_quality,
      video_device_id,
      audio_device_id,
      enable_screen,
      layout,
      is_default,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');

    return newPreset;
  }

  /**
   * Update an existing preset
   * @param {string} userId
   * @param {number} presetId
   * @param {Object} updates
   * @returns {Promise<Object>}
   */
  async updatePreset(userId, presetId, updates) {
    // If setting as default, unset other defaults
    if (updates.is_default === true) {
      await db('recording_presets')
        .where({ user_id: userId, is_default: true })
        .where('id', '!=', presetId)
        .update({ is_default: false });
    }

    const [updatedPreset] = await db('recording_presets')
      .where({ id: presetId, user_id: userId })
      .update({ ...updates, updated_at: new Date() })
      .returning('*');

    return updatedPreset;
  }

  /**
   * Delete a preset
   * @param {string} userId
   * @param {number} presetId
   * @returns {Promise<number>} Number of deleted rows
   */
  async deletePreset(userId, presetId) {
    return db('recording_presets')
      .where({ id: presetId, user_id: userId })
      .del();
  }
}

module.exports = new RecordingPresetsService();

