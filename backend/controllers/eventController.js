const Event = require('../models/Event');

exports.createEvent = async (req, res) => {
  try {
    const { title, description, startTime, endTime, location, isOnline, meetingLink, type, targetId } = req.body;
    
    const event = await Event.create({
      title,
      description,
      startTime,
      endTime,
      location,
      isOnline,
      meetingLink,
      type,
      targetId,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create event'
    });
  }
};

exports.getEvents = async (req, res) => {
  try {
    const { type, targetId, upcoming } = req.query;
    const events = await Event.findAll({ type, targetId, upcoming: upcoming === 'true' });
    
    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events'
    });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    await Event.delete(id);
    
    res.json({
      success: true,
      message: 'Event cancelled successfully'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel event'
    });
  }
};
