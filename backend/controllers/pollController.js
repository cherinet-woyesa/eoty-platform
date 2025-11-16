const db = require('../config/database');

const pollController = {
  // Create a new poll for a lesson
  async createPoll(req, res) {
    try {
      const userId = req.user.userId;
      const { lessonId } = req.params;
      const { 
        question, 
        description, 
        options, 
        allow_multiple_choice = false,
        show_results_before_voting = false,
        show_results_after_voting = true,
        start_date,
        end_date,
        metadata = {}
      } = req.body;

      // Validate required fields
      if (!question || !options || !Array.isArray(options) || options.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Question and at least 2 options are required'
        });
      }

      // Validate options structure
      const validatedOptions = options.map((opt, index) => {
        if (typeof opt === 'string') {
          return { id: index + 1, text: opt };
        } else if (opt && typeof opt === 'object' && opt.text) {
          return { id: opt.id || index + 1, text: opt.text };
        } else {
          throw new Error('Invalid option format');
        }
      });

      // Verify lesson exists and user has permission (teacher/admin)
      const lesson = await db('lessons as l')
        .join('courses as c', 'l.course_id', 'c.id')
        .where({ 'l.id': lessonId })
        .select('l.id', 'c.created_by')
        .first();

      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found'
        });
      }

      // Check if user is teacher/admin (can create polls)
      const user = await db('users').where({ id: userId }).select('role').first();
      const isAuthorized = user && (user.role === 'teacher' || user.role === 'admin' || lesson.created_by === userId);

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: 'Only teachers and admins can create polls'
        });
      }

      // Create poll
      const [pollId] = await db('polls').insert({
        lesson_id: lessonId,
        created_by: userId,
        question,
        description: description || null,
        options: JSON.stringify(validatedOptions),
        allow_multiple_choice: allow_multiple_choice || false,
        show_results_before_voting: show_results_before_voting || false,
        show_results_after_voting: show_results_after_voting !== false,
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
        is_active: true,
        is_published: true, // Auto-publish for now
        total_responses: 0,
        metadata: JSON.stringify(metadata),
        created_at: new Date(),
        updated_at: new Date()
      }).returning('id');

      const poll = await db('polls')
        .where({ id: pollId.id })
        .first();

      res.status(201).json({
        success: true,
        message: 'Poll created successfully',
        data: { poll: { ...poll, options: validatedOptions } }
      });
    } catch (error) {
      console.error('Create poll error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create poll: ' + error.message
      });
    }
  },

  // Get polls for a lesson
  async getLessonPolls(req, res) {
    try {
      const { lessonId } = req.params;
      const { include_inactive = false } = req.query;

      let query = db('polls')
        .where({ lesson_id: lessonId });

      if (!include_inactive) {
        query = query.where({ is_active: true, is_published: true });
      }

      const polls = await query
        .select('*')
        .orderBy('created_at', 'desc');

      // Parse JSON fields
      const parsedPolls = polls.map(poll => ({
        ...poll,
        options: typeof poll.options === 'string' ? JSON.parse(poll.options) : poll.options,
        metadata: poll.metadata ? (typeof poll.metadata === 'string' ? JSON.parse(poll.metadata) : poll.metadata) : {}
      }));

      res.json({
        success: true,
        data: { polls: parsedPolls }
      });
    } catch (error) {
      console.error('Get lesson polls error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch polls'
      });
    }
  },

  // Get single poll with results (if user has voted or results are public)
  async getPoll(req, res) {
    try {
      const userId = req.user?.userId;
      const { pollId } = req.params;

      const poll = await db('polls')
        .where({ id: pollId })
        .first();

      if (!poll) {
        return res.status(404).json({
          success: false,
          message: 'Poll not found'
        });
      }

      // Parse JSON fields
      const options = typeof poll.options === 'string' ? JSON.parse(poll.options) : poll.options;
      const metadata = poll.metadata ? (typeof poll.metadata === 'string' ? JSON.parse(poll.metadata) : poll.metadata) : {};

      // Check if user has voted
      let userResponse = null;
      if (userId) {
        userResponse = await db('poll_responses')
          .where({ poll_id: pollId, user_id: userId })
          .first();
      }

      // Get results if user has voted or if results are public
      let results = null;
      if (userResponse || poll.show_results_before_voting) {
        const responses = await db('poll_responses')
          .where({ poll_id: pollId })
          .select('option_id', db.raw('COUNT(*) as count'))
          .groupBy('option_id');

        // Calculate percentages
        const totalResponses = poll.total_responses || 0;
        results = options.map(opt => {
          const response = responses.find(r => r.option_id === opt.id);
          const count = response ? parseInt(response.count) : 0;
          return {
            option_id: opt.id,
            option_text: opt.text,
            count,
            percentage: totalResponses > 0 ? ((count / totalResponses) * 100).toFixed(1) : 0
          };
        });
      }

      res.json({
        success: true,
        data: {
          poll: {
            ...poll,
            options,
            metadata
          },
          userResponse: userResponse ? {
            option_id: userResponse.option_id,
            custom_answer: userResponse.custom_answer,
            created_at: userResponse.created_at
          } : null,
          results: results || null,
          totalResponses: poll.total_responses || 0,
          canVote: !userResponse && poll.is_active && poll.is_published
        }
      });
    } catch (error) {
      console.error('Get poll error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch poll'
      });
    }
  },

  // Submit a poll response (vote)
  async submitPollResponse(req, res) {
    try {
      const userId = req.user.userId;
      const { pollId } = req.params;
      const { option_id, custom_answer = null } = req.body;

      if (!option_id) {
        return res.status(400).json({
          success: false,
          message: 'Option ID is required'
        });
      }

      // Get poll
      const poll = await db('polls')
        .where({ id: pollId })
        .first();

      if (!poll) {
        return res.status(404).json({
          success: false,
          message: 'Poll not found'
        });
      }

      if (!poll.is_active || !poll.is_published) {
        return res.status(400).json({
          success: false,
          message: 'Poll is not active'
        });
      }

      // Check if poll has expired
      if (poll.end_date && new Date(poll.end_date) < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Poll has expired'
        });
      }

      // Check if poll has started
      if (poll.start_date && new Date(poll.start_date) > new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Poll has not started yet'
        });
      }

      // Parse options to validate option_id
      const options = typeof poll.options === 'string' ? JSON.parse(poll.options) : poll.options;
      const validOption = options.find(opt => opt.id === option_id);
      
      if (!validOption) {
        return res.status(400).json({
          success: false,
          message: 'Invalid option ID'
        });
      }

      // Check if user has already voted (unless multiple choice is allowed)
      if (!poll.allow_multiple_choice) {
        const existingResponse = await db('poll_responses')
          .where({ poll_id: pollId, user_id: userId })
          .first();

        if (existingResponse) {
          return res.status(400).json({
            success: false,
            message: 'You have already voted on this poll'
          });
        }
      }

      // Submit response
      await db('poll_responses').insert({
        poll_id: pollId,
        user_id: userId,
        option_id,
        custom_answer,
        response_metadata: JSON.stringify({
          timestamp: new Date().toISOString(),
          user_agent: req.get('User-Agent') || 'Unknown'
        }),
        created_at: new Date(),
        updated_at: new Date()
      });

      // Update poll total_responses
      await db('polls')
        .where({ id: pollId })
        .increment('total_responses', 1);

      // Get updated results
      const responses = await db('poll_responses')
        .where({ poll_id: pollId })
        .select('option_id', db.raw('COUNT(*) as count'))
        .groupBy('option_id');

      const totalResponses = (poll.total_responses || 0) + 1;
      const results = options.map(opt => {
        const response = responses.find(r => r.option_id === opt.id);
        const count = response ? parseInt(response.count) : 0;
        return {
          option_id: opt.id,
          option_text: opt.text,
          count,
          percentage: totalResponses > 0 ? ((count / totalResponses) * 100).toFixed(1) : 0
        };
      });

      res.json({
        success: true,
        message: 'Vote submitted successfully',
        data: {
          results,
          totalResponses
        }
      });
    } catch (error) {
      console.error('Submit poll response error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit vote: ' + error.message
      });
    }
  },

  // Get poll results (for admins/teachers or after voting)
  async getPollResults(req, res) {
    try {
      const userId = req.user.userId;
      const { pollId } = req.params;

      const poll = await db('polls')
        .where({ id: pollId })
        .first();

      if (!poll) {
        return res.status(404).json({
          success: false,
          message: 'Poll not found'
        });
      }

      // Check permissions (admin/teacher or poll creator can see results)
      const user = await db('users').where({ id: userId }).select('role').first();
      const isAuthorized = user && (user.role === 'teacher' || user.role === 'admin' || poll.created_by === userId);

      if (!isAuthorized && !poll.show_results_before_voting) {
        // Check if user has voted
        const userResponse = await db('poll_responses')
          .where({ poll_id: pollId, user_id: userId })
          .first();

        if (!userResponse && !poll.show_results_after_voting) {
          return res.status(403).json({
            success: false,
            message: 'You must vote first to see results'
          });
        }
      }

      // Get responses
      const responses = await db('poll_responses')
        .where({ poll_id: pollId })
        .select('option_id', db.raw('COUNT(*) as count'))
        .groupBy('option_id');

      const options = typeof poll.options === 'string' ? JSON.parse(poll.options) : poll.options;
      const totalResponses = poll.total_responses || 0;

      const results = options.map(opt => {
        const response = responses.find(r => r.option_id === opt.id);
        const count = response ? parseInt(response.count) : 0;
        return {
          option_id: opt.id,
          option_text: opt.text,
          count,
          percentage: totalResponses > 0 ? ((count / totalResponses) * 100).toFixed(1) : 0
        };
      });

      res.json({
        success: true,
        data: {
          results,
          totalResponses,
          poll: {
            question: poll.question,
            allow_multiple_choice: poll.allow_multiple_choice
          }
        }
      });
    } catch (error) {
      console.error('Get poll results error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch poll results'
      });
    }
  },

  // Delete a poll (admin/teacher only)
  async deletePoll(req, res) {
    try {
      const userId = req.user.userId;
      const { pollId } = req.params;

      const poll = await db('polls')
        .where({ id: pollId })
        .first();

      if (!poll) {
        return res.status(404).json({
          success: false,
          message: 'Poll not found'
        });
      }

      // Check permissions
      const user = await db('users').where({ id: userId }).select('role').first();
      const isAuthorized = user && (user.role === 'teacher' || user.role === 'admin' || poll.created_by === userId);

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this poll'
        });
      }

      // Delete poll (cascade will delete responses)
      await db('polls')
        .where({ id: pollId })
        .delete();

      res.json({
        success: true,
        message: 'Poll deleted successfully'
      });
    } catch (error) {
      console.error('Delete poll error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete poll'
      });
    }
  }
};

module.exports = pollController;

