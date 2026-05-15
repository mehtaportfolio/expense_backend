const notificationService = require('../services/notificationService');
const webpush = require('web-push');
const expenseService = require('../services/expenseService');
const salaryService = require('../services/salaryService');

// Configure web-push
webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL || 'your-email@example.com'}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const subscribe = async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Subscription or endpoint missing' });
    }
    await notificationService.upsertSubscription(subscription);
    res.status(201).json({ message: 'Subscribed successfully' });
  } catch (error) {
    console.error('Error in subscribe:', error);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
};

const unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;
    await notificationService.deleteSubscription(endpoint);
    res.json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    console.error('Error in unsubscribe:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
};

const sendDailySummary = async (req, res) => {
  try {
    const { todayTotal, monthTotal } = await expenseService.getExpenseSummary();
    const formatCurrency = (val) => `₹${val.toLocaleString('en-IN')}`;
    
    const title = 'Daily Expense Summary';
    const body = `Today's Total: ${formatCurrency(todayTotal)}\nMonth's Total: ${formatCurrency(monthTotal)}`;

    await sendNotificationToAll(title, body);
    res.status(200).send("OK");
  } catch (err) {
    console.error('Error in sendDailySummary:', err);
    res.status(500).json({ status: 'error', message: 'Failed to send notifications' });
  }
};

const sendMonthlySummary = async (req, res) => {
  try {
    const summary = await getMonthlySummaryData();
    if (!summary) {
      return res.status(200).send("No data");
    }

    const formatCurrency = (val) => `₹${val.toLocaleString('en-IN')}`;

    const title = `Monthly Summary - ${summary.monthName}`;
    const body =
      `Gross Salary: ${formatCurrency(summary.grossSalary)}\n` +
      `Total Expenses: ${formatCurrency(summary.expenses)}\n` +
      `Direct Saving: ${formatCurrency(summary.directSaving)}\n` +
      `Balance: ${formatCurrency(summary.balanceAmount)}\n` +
      `Saving %: ${summary.savingPercentage.toFixed(2)}%`;

    await sendNotificationToAll(title, body);
    res.status(200).send("OK");
  } catch (err) {
    console.error("Monthly summary error:", err);
    res.status(500).send("error");
  }
};

const sendTestNotification = async (req, res) => {
  try {
    const { title, body } = req.body;
    const { todayTotal, monthTotal } = await expenseService.getExpenseSummary();
    const formatCurrency = (val) => `₹${val.toLocaleString('en-IN')}`;

    const finalTitle = title || 'Expense Tracker Summary';
    const finalBody = body || `Today's Total: ${formatCurrency(todayTotal)}\nMonth's Total: ${formatCurrency(monthTotal)}`;

    await sendNotificationToAll(finalTitle, finalBody);
    res.status(200).json({ message: 'Test notification initiated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Helper functions
async function sendNotificationToAll(title, body) {
  const currentSubscriptions = await notificationService.getSubscriptions();
  const notificationPayload = JSON.stringify({ title, body, url: '/' });

  const pushPromises = currentSubscriptions.map(sub => 
    webpush.sendNotification(sub, notificationPayload).catch(async err => {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await notificationService.deleteSubscription(sub.endpoint);
      }
    })
  );

  await Promise.all(pushPromises);
}

async function getMonthlySummaryData() {
  const now = new Date();
  let lastMonth = now.getMonth() - 1;
  let year = now.getFullYear();
  if (lastMonth < 0) {
    lastMonth = 11;
    year -= 1;
  }
  const lastMonthStr = `${year}-${String(lastMonth + 1).padStart(2, '0')}`;

  const allExpenses = await expenseService.getAllExpenses();
  const monthExpenses = allExpenses
    .filter(exp => exp.date.substring(0, 7) === lastMonthStr && exp.expense_type !== 'income')
    .reduce((sum, exp) => sum + exp.amount, 0);

  const salaryData = await salaryService.getAllSalaryDetails();
  const monthSalary = salaryData.find(s => {
    const d = new Date(s.date);
    return d.getMonth() === lastMonth && d.getFullYear() === year;
  });

  if (!monthSalary) return null;

  const grossSalary = monthSalary.gross_salary;
  const directSaving = (monthSalary.epf || 0) + (monthSalary.mf || 0) + (monthSalary.vpf || 0) + (monthSalary.etf || 0);
  const balanceAmount = grossSalary - directSaving - monthExpenses;
  const savingPercentage = grossSalary > 0 ? ((grossSalary - monthExpenses) / grossSalary) * 100 : 0;
  const monthName = new Date(year, lastMonth).toLocaleString('default', { month: 'long' });

  return { grossSalary, expenses: monthExpenses, directSaving, balanceAmount, savingPercentage, monthName };
}

module.exports = {
  subscribe,
  unsubscribe,
  sendDailySummary,
  sendMonthlySummary,
  sendTestNotification
};
