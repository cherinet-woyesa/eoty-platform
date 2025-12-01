const knex = require('../knexfile')['development'];
const db = require('knex')(knex);

class JourneyService {
  // --- Admin/Creator Methods ---

  async createJourney(data, userId) {
    const { title, description, type, start_date, end_date, reward_badge_image, milestones } = data;

    return await db.transaction(async (trx) => {
      const [journey] = await trx('journeys')
        .insert({
          title,
          description,
          type,
          start_date,
          end_date,
          reward_badge_image,
          created_by: userId
        })
        .returning('*');

      if (milestones && milestones.length > 0) {
        const milestoneData = milestones.map((m, index) => ({
          journey_id: journey.id,
          title: m.title,
          description: m.description,
          order_index: index + 1,
          type: m.type,
          reference_id: m.reference_id,
          requirements: m.requirements || {}
        }));

        await trx('journey_milestones').insert(milestoneData);
      }

      return journey;
    });
  }

  async getJourneys(filters = {}) {
    let query = db('journeys').where('is_active', true);
    
    if (filters.type) {
      query = query.where('type', filters.type);
    }

    return await query.orderBy('created_at', 'desc');
  }

  async getJourneyById(id) {
    const journey = await db('journeys').where('id', id).first();
    if (!journey) return null;

    const milestones = await db('journey_milestones')
      .where('journey_id', id)
      .orderBy('order_index', 'asc');

    return { ...journey, milestones };
  }

  // --- User/Progress Methods ---

  async enrollUser(userId, journeyId) {
    // Check if already enrolled
    const existing = await db('user_journeys')
      .where({ user_id: userId, journey_id: journeyId })
      .first();

    if (existing) return existing;

    return await db.transaction(async (trx) => {
      // Create user journey record
      const [userJourney] = await trx('user_journeys')
        .insert({
          user_id: userId,
          journey_id: journeyId,
          status: 'in_progress',
          progress_percentage: 0
        })
        .returning('*');

      // Get all milestones for this journey
      const milestones = await trx('journey_milestones')
        .where('journey_id', journeyId)
        .orderBy('order_index', 'asc');

      // Initialize user milestones
      // The first one is 'available', others are 'locked' (unless we want them all open)
      // For a linear journey, usually sequential.
      if (milestones.length > 0) {
        const userMilestonesData = milestones.map((m, index) => ({
          user_journey_id: userJourney.id,
          milestone_id: m.id,
          status: index === 0 ? 'available' : 'locked'
        }));

        await trx('user_milestones').insert(userMilestonesData);
      }

      return userJourney;
    });
  }

  async getUserJourneys(userId) {
    const userJourneys = await db('user_journeys')
      .join('journeys', 'user_journeys.journey_id', 'journeys.id')
      .where('user_journeys.user_id', userId)
      .select(
        'user_journeys.*',
        'journeys.title',
        'journeys.description',
        'journeys.type',
        'journeys.reward_badge_image'
      );

    return userJourneys;
  }

  async getUserJourneyDetails(userJourneyId, userId) {
    // Verify ownership
    const userJourney = await db('user_journeys')
      .join('journeys', 'user_journeys.journey_id', 'journeys.id')
      .where('user_journeys.id', userJourneyId)
      .andWhere('user_journeys.user_id', userId)
      .select(
        'user_journeys.*',
        'journeys.title as journey_title',
        'journeys.description as journey_description'
      )
      .first();

    if (!userJourney) return null;

    const milestones = await db('user_milestones')
      .join('journey_milestones', 'user_milestones.milestone_id', 'journey_milestones.id')
      .where('user_milestones.user_journey_id', userJourneyId)
      .orderBy('journey_milestones.order_index', 'asc')
      .select(
        'user_milestones.*',
        'journey_milestones.title',
        'journey_milestones.description',
        'journey_milestones.type',
        'journey_milestones.reference_id',
        'journey_milestones.order_index'
      );

    return { ...userJourney, milestones };
  }

  async completeMilestone(userJourneyId, milestoneId, userId) {
    // Verify ownership and status
    const userMilestone = await db('user_milestones')
      .join('user_journeys', 'user_milestones.user_journey_id', 'user_journeys.id')
      .where('user_milestones.id', milestoneId)
      .andWhere('user_journeys.id', userJourneyId)
      .andWhere('user_journeys.user_id', userId)
      .select('user_milestones.*', 'user_journeys.journey_id')
      .first();

    if (!userMilestone) throw new Error('Milestone not found or access denied');
    if (userMilestone.status === 'completed') return userMilestone; // Already done
    if (userMilestone.status === 'locked') throw new Error('Milestone is locked');

    return await db.transaction(async (trx) => {
      // Mark as completed
      await trx('user_milestones')
        .where('id', milestoneId)
        .update({
          status: 'completed',
          completed_at: new Date()
        });

      // Unlock next milestone
      const currentMilestoneDef = await trx('journey_milestones').where('id', userMilestone.milestone_id).first();
      
      const nextMilestoneDef = await trx('journey_milestones')
        .where('journey_id', userMilestone.journey_id)
        .andWhere('order_index', '>', currentMilestoneDef.order_index)
        .orderBy('order_index', 'asc')
        .first();

      if (nextMilestoneDef) {
        await trx('user_milestones')
          .where('user_journey_id', userJourneyId)
          .andWhere('milestone_id', nextMilestoneDef.id)
          .update({ status: 'available' });
      }

      // Update Progress
      const allUserMilestones = await trx('user_milestones')
        .where('user_journey_id', userJourneyId);
      
      const completedCount = allUserMilestones.filter(m => m.status === 'completed').length + 1; // +1 because we just updated one but haven't fetched it back
      const totalCount = allUserMilestones.length;
      const progress = Math.round((completedCount / totalCount) * 100);

      const updateData = { progress_percentage: progress };
      if (progress === 100) {
        updateData.status = 'completed';
        updateData.completed_at = new Date();
      }

      await trx('user_journeys')
        .where('id', userJourneyId)
        .update(updateData);

      return { success: true, progress, completed: progress === 100 };
    });
  }
}

module.exports = new JourneyService();
