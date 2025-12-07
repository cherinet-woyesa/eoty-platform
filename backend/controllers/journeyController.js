const journeyService = require('../services/journeyService');

class JourneyController {
  async createJourney(req, res) {
    try {
      const journey = await journeyService.createJourney(req.body, req.user.userId);
      res.status(201).json(journey);
    } catch (error) {
      console.error('Error creating journey:', error);
      res.status(500).json({ error: 'Failed to create journey' });
    }
  }

  async getJourneys(req, res) {
    try {
      const journeys = await journeyService.getJourneys(req.query);
      res.json(journeys);
    } catch (error) {
      console.error('Error fetching journeys:', error);
      res.status(500).json({ error: 'Failed to fetch journeys' });
    }
  }

  async getJourneyById(req, res) {
    try {
      const journey = await journeyService.getJourneyById(req.params.id);
      if (!journey) return res.status(404).json({ error: 'Journey not found' });
      res.json(journey);
    } catch (error) {
      console.error('Error fetching journey:', error);
      res.status(500).json({ error: 'Failed to fetch journey' });
    }
  }

  async enrollUser(req, res) {
    try {
      const userJourney = await journeyService.enrollUser(req.user.userId, req.params.id);
      res.status(201).json(userJourney);
    } catch (error) {
      console.error('Error enrolling user:', error);
      res.status(500).json({ error: 'Failed to enroll user' });
    }
  }

  async getUserJourneys(req, res) {
    try {
      const userJourneys = await journeyService.getUserJourneys(req.user.userId);
      res.json(userJourneys);
    } catch (error) {
      console.error('Error fetching user journeys:', error);
      res.status(500).json({ error: 'Failed to fetch user journeys' });
    }
  }

  async getUserJourneyDetails(req, res) {
    try {
      const details = await journeyService.getUserJourneyDetails(req.params.id, req.user.userId);
      if (!details) return res.status(404).json({ error: 'User journey not found' });
      res.json(details);
    } catch (error) {
      console.error('Error fetching user journey details:', error);
      res.status(500).json({ error: 'Failed to fetch user journey details' });
    }
  }

  async completeMilestone(req, res) {
    try {
      const { userJourneyId, milestoneId } = req.params;
      const result = await journeyService.completeMilestone(userJourneyId, milestoneId, req.user.userId);
      res.json(result);
    } catch (error) {
      console.error('Error completing milestone:', error);
      res.status(500).json({ error: error.message || 'Failed to complete milestone' });
    }
  }
}

module.exports = new JourneyController();



