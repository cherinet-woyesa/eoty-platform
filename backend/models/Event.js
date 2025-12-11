const db = require('../config/database');

const Event = {
  async create(data) {
    const [result] = await db('events').insert({
      title: data.title,
      description: data.description,
      start_time: data.startTime,
      end_time: data.endTime,
      location: data.location,
      is_online: data.isOnline || false,
      meeting_link: data.meetingLink,
      type: data.type || 'global',
      target_id: data.targetId || null,
      created_by: data.createdBy,
      is_cancelled: false,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('id');
    
    return this.findById(result?.id || result);
  },

  async findById(id) {
    return db('events').where({ id }).first();
  },

  async findAll(filters = {}) {
    let query = db('events').where('is_cancelled', false);
    
    if (filters.type) {
      query = query.where('type', filters.type);
    }
    
    if (filters.targetId) {
      query = query.where('target_id', filters.targetId);
    }
    
    if (filters.upcoming) {
      query = query.where('start_time', '>=', new Date());
    }

    return query.orderBy('start_time', 'asc');
  },

  async update(id, data) {
    await db('events').where({ id }).update({
      ...data,
      updated_at: new Date()
    });
    return this.findById(id);
  },

  async delete(id) {
    return db('events').where({ id }).update({ is_cancelled: true });
  }
};

module.exports = Event;
