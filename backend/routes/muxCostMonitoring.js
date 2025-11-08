/**
 * Mux Cost Monitoring Routes
 * API endpoints for tracking Mux usage and costs
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const muxCostMonitoringService = require('../services/muxCostMonitoringService');

// All routes require admin authentication
router.use(authenticateToken);
router.use(requireRole(['platform_admin', 'chapter_admin']));

/**
 * GET /api/mux-costs/usage
 * Get Mux usage metrics
 */
router.get('/usage', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const metrics = await muxCostMonitoringService.getUsageMetrics({
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null
    });

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error fetching usage metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch usage metrics',
      error: error.message
    });
  }
});

/**
 * GET /api/mux-costs/delivery
 * Get delivery/bandwidth metrics
 */
router.get('/delivery', async (req, res) => {
  try {
    const { timeframe = '30:days', startDate, endDate } = req.query;

    const metrics = await muxCostMonitoringService.getDeliveryMetrics({
      timeframe,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null
    });

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error fetching delivery metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery metrics',
      error: error.message
    });
  }
});

/**
 * GET /api/mux-costs/calculate
 * Calculate estimated costs
 */
router.get('/calculate', async (req, res) => {
  try {
    const { timeframe = '30:days', startDate, endDate } = req.query;

    const costs = await muxCostMonitoringService.calculateCosts({
      timeframe,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null
    });

    res.json({
      success: true,
      data: costs
    });
  } catch (error) {
    console.error('Error calculating costs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate costs',
      error: error.message
    });
  }
});

/**
 * GET /api/mux-costs/trends
 * Get cost trends over time
 */
router.get('/trends', async (req, res) => {
  try {
    const { months = 6 } = req.query;

    const trends = await muxCostMonitoringService.getCostTrends(parseInt(months));

    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('Error fetching cost trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cost trends',
      error: error.message
    });
  }
});

/**
 * GET /api/mux-costs/by-course
 * Get cost breakdown by course
 */
router.get('/by-course', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const courseCosts = await muxCostMonitoringService.getCostsByCourse({
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: courseCosts
    });
  } catch (error) {
    console.error('Error fetching costs by course:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch costs by course',
      error: error.message
    });
  }
});

/**
 * GET /api/mux-costs/projections
 * Get projected costs for next month
 */
router.get('/projections', async (req, res) => {
  try {
    const projections = await muxCostMonitoringService.getProjectedCosts();

    res.json({
      success: true,
      data: projections
    });
  } catch (error) {
    console.error('Error fetching cost projections:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cost projections',
      error: error.message
    });
  }
});

/**
 * GET /api/mux-costs/alerts
 * Get cost alerts
 */
router.get('/alerts', async (req, res) => {
  try {
    const {
      monthlyLimit,
      dailyLimit,
      warningThreshold
    } = req.query;

    const thresholds = {};
    if (monthlyLimit) thresholds.monthlyLimit = parseFloat(monthlyLimit);
    if (dailyLimit) thresholds.dailyLimit = parseFloat(dailyLimit);
    if (warningThreshold) thresholds.warningThreshold = parseFloat(warningThreshold);

    const alerts = await muxCostMonitoringService.getCostAlerts(thresholds);

    res.json({
      success: true,
      data: {
        alerts,
        hasAlerts: alerts.length > 0,
        criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
        warningAlerts: alerts.filter(a => a.severity === 'warning').length
      }
    });
  } catch (error) {
    console.error('Error fetching cost alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cost alerts',
      error: error.message
    });
  }
});

/**
 * GET /api/mux-costs/dashboard
 * Get comprehensive cost dashboard data
 */
router.get('/dashboard', async (req, res) => {
  try {
    const { timeframe = '30:days' } = req.query;

    // Fetch all data in parallel
    const [
      currentCosts,
      usageMetrics,
      deliveryMetrics,
      courseCosts,
      projections,
      alerts
    ] = await Promise.all([
      muxCostMonitoringService.calculateCosts({ timeframe }),
      muxCostMonitoringService.getUsageMetrics({}),
      muxCostMonitoringService.getDeliveryMetrics({ timeframe }),
      muxCostMonitoringService.getCostsByCourse({ limit: 5 }),
      muxCostMonitoringService.getProjectedCosts(),
      muxCostMonitoringService.getCostAlerts({})
    ]);

    res.json({
      success: true,
      data: {
        timeframe,
        currentCosts,
        usageMetrics,
        deliveryMetrics,
        topCourses: courseCosts,
        projections,
        alerts: {
          items: alerts,
          hasAlerts: alerts.length > 0,
          criticalCount: alerts.filter(a => a.severity === 'critical').length,
          warningCount: alerts.filter(a => a.severity === 'warning').length
        },
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching cost dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cost dashboard',
      error: error.message
    });
  }
});

module.exports = router;
