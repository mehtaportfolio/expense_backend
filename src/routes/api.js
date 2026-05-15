const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const salaryController = require('../controllers/salaryController');
const authController = require('../controllers/authController');
const notificationController = require('../controllers/notificationController');
const masterController = require('../controllers/masterController');
const milkController = require('../controllers/milkController');
const renderController = require('../controllers/renderController');
const { requireAuth } = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(requireAuth);

// Expense routes
router.get('/expenses', expenseController.getAllExpenses);
router.post('/expenses', expenseController.addExpense);
router.post('/expenses/bulk', expenseController.addExpenses);
router.put('/expenses/:id', expenseController.updateExpense);
router.delete('/expenses/:id', expenseController.deleteExpense);
router.get('/expenses/summary', expenseController.getExpenseSummary);

// Salary routes
router.get('/salary', salaryController.getAllSalaryDetails);
router.post('/salary', salaryController.addSalaryDetail);
router.put('/salary/:id', salaryController.updateSalaryDetail);
router.delete('/salary/:id', salaryController.deleteSalaryDetail);

// Master routes
router.get('/master', masterController.getAllMasterData);
router.post('/master', masterController.addMasterEntry);
router.post('/master/initialize', masterController.initializeMasterTable);

// Milk routes
router.get('/milk', milkController.getAllMilkDetails);
router.put('/milk/:sr_no', milkController.updateMilkDetail);
router.post('/milk/fill-zero', milkController.fillZeroValues);

// Render routes
router.post('/restart', renderController.restartService);

// Auth routes
router.post('/auth/verify', authController.verifyPassword);
router.post('/auth/change-password', authController.changePassword);

// Notification routes
router.post('/subscribe', notificationController.subscribe);
router.post('/unsubscribe', notificationController.unsubscribe);
router.all('/send-daily-summary', notificationController.sendDailySummary);
router.all('/send-monthly-summary', notificationController.sendMonthlySummary);
router.post('/send-test', notificationController.sendTestNotification);

module.exports = router;
