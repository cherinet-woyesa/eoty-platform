const recordingPresetsService = require('../services/recordingPresetsService');

const recordingPresetsController = {
  async getPresets(req, res) {
    try {
      const userId = req.user.userId;
      const presets = await recordingPresetsService.getPresetsByUser(userId);
      res.json({ success: true, data: { presets } });
    } catch (error) {
      console.error('Error getting recording presets:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve recording presets.' });
    }
  },

  async getPreset(req, res) {
    try {
      const { presetId } = req.params;
      const userId = req.user.userId;

      const preset = await recordingPresetsService.getPresetById(userId, parseInt(presetId));

      if (!preset) {
        return res.status(404).json({ success: false, message: 'Preset not found.' });
      }

      res.json({ success: true, data: { preset } });
    } catch (error) {
      console.error('Error getting recording preset:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve recording preset.' });
    }
  },

  async getDefaultPreset(req, res) {
    try {
      const userId = req.user.userId;
      const preset = await recordingPresetsService.getDefaultPreset(userId);

      if (!preset) {
        return res.json({ success: true, data: { preset: null } });
      }

      res.json({ success: true, data: { preset } });
    } catch (error) {
      console.error('Error getting default preset:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve default preset.' });
    }
  },

  async createPreset(req, res) {
    try {
      const userId = req.user.userId;
      const presetData = req.body;

      if (!presetData.name) {
        return res.status(400).json({ success: false, message: 'Preset name is required.' });
      }

      const newPreset = await recordingPresetsService.createPreset(userId, presetData);
      res.status(201).json({ success: true, message: 'Preset created successfully.', data: { preset: newPreset } });
    } catch (error) {
      console.error('Error creating recording preset:', error);
      res.status(500).json({ success: false, message: 'Failed to create recording preset.' });
    }
  },

  async updatePreset(req, res) {
    try {
      const { presetId } = req.params;
      const userId = req.user.userId;
      const updates = req.body;

      const updatedPreset = await recordingPresetsService.updatePreset(userId, parseInt(presetId), updates);

      if (!updatedPreset) {
        return res.status(404).json({ success: false, message: 'Preset not found or unauthorized.' });
      }

      res.json({ success: true, message: 'Preset updated successfully.', data: { preset: updatedPreset } });
    } catch (error) {
      console.error('Error updating recording preset:', error);
      res.status(500).json({ success: false, message: 'Failed to update recording preset.' });
    }
  },

  async deletePreset(req, res) {
    try {
      const { presetId } = req.params;
      const userId = req.user.userId;

      const deletedCount = await recordingPresetsService.deletePreset(userId, parseInt(presetId));

      if (deletedCount === 0) {
        return res.status(404).json({ success: false, message: 'Preset not found or unauthorized.' });
      }

      res.json({ success: true, message: 'Preset deleted successfully.' });
    } catch (error) {
      console.error('Error deleting recording preset:', error);
      res.status(500).json({ success: false, message: 'Failed to delete recording preset.' });
    }
  }
};

module.exports = recordingPresetsController;

