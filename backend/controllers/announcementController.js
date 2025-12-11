const Announcement = require('../models/Announcement');

exports.createAnnouncement = async (req, res) => {
  try {
    const { title, content, type, targetId, priority, expiresAt } = req.body;
    
    const announcement = await Announcement.create({
      title,
      content,
      type,
      targetId,
      priority,
      expiresAt,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: announcement
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create announcement'
    });
  }
};

exports.getAnnouncements = async (req, res) => {
  try {
    const { type, targetId } = req.query;
    const announcements = await Announcement.findAll({ type, targetId });
    
    res.json({
      success: true,
      data: announcements
    });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcements'
    });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    await Announcement.delete(id);
    
    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete announcement'
    });
  }
};
