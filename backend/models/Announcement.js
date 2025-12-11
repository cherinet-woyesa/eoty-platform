const db = require('../config/database');

const Announcement = {
  async create(data) {
    const [result] = await db('announcements').insert({
      title: data.title,
      content: data.content,
      type: data.type || 'global',
      target_id: data.targetId || null,
      priority: data.priority || 'normal',
      expires_at: data.expiresAt || null,
      created_by: data.createdBy,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('id');
    
    return this.findById(result?.id || result);
  },

  async findById(id) {
    return db('announcements').where({ id }).first();
  },

  async findAll(filters = {}) {
    let query = db('announcements').where('is_active', true);
    
    if (filters.type) {
      query = query.where('type', filters.type);
    }
    
    if (filters.targetId) {
      query = query.where('target_id', filters.targetId);
    }

    return query.orderBy('created_at', 'desc');
  },

  async update(id, data) {
    await db('announcements').where({ id }).update({
      ...data,
      updated_at: new Date()
    });
    return this.findById(id);
  },

  async delete(id) {
    return db('announcements').where({ id }).update({ is_active: false });
  }
};

module.exports = Announcement;
