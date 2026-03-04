require('dotenv').config();
const express = require('express');
const webpush = require('web-push');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');

const app = express();

app.use(cors());
app.use(express.json());

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Configure web-push
webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL || 'your-email@example.com'}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Load subscriptions from Supabase
async function getSubscriptions() {
  try {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('subscription_json');
    
    if (error) throw error;
    return data.map(item => item.subscription_json);
  } catch (err) {
    console.error('Error loading subscriptions from Supabase:', err);
    return [];
  }
}

// Function to calculate daily and monthly totals from Supabase
async function getExpenseSummary() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  const today = `${year}-${month}-${day}`;
  const currentMonth = `${year}-${month}`;

  console.log(`Calculating summary for Today: ${today}, Month: ${currentMonth}`);

  try {
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('amount, date, expense_type')
      .neq('expense_type', 'income')
      .gte('date', `${currentMonth}-01`);

    if (error) throw error;

    const todayTotal = expenses
      .filter(exp => exp.date.startsWith(today))
      .reduce((sum, exp) => sum + exp.amount, 0);

    const monthTotal = expenses
      .filter(exp => exp.date.startsWith(currentMonth))
      .reduce((sum, exp) => sum + exp.amount, 0);

    return { todayTotal, monthTotal };
  } catch (err) {
    console.error('Error fetching expenses from Supabase:', err);
    return { todayTotal: 0, monthTotal: 0 };
  }
}

// Function to send notifications to all subscribers
async function sendNotificationToAll(title, body) {
  const currentSubscriptions = await getSubscriptions();
  console.log(`Sending notification to ${currentSubscriptions.length} subscribers`);

  const notificationPayload = JSON.stringify({
    title,
    body,
    url: '/'
  });

  const pushPromises = currentSubscriptions.map(sub => 
    webpush.sendNotification(sub, notificationPayload).catch(async err => {
      console.error('Error sending notification:', err.statusCode);
      if (err.statusCode === 410 || err.statusCode === 404) { // Subscription expired or removed
        console.log('Removing expired subscription:', sub.endpoint);
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', sub.endpoint);
      }
    })
  );

  await Promise.all(pushPromises);
}

// Schedule tasks
// Every 2 hours
cron.schedule('0 */2 * * *', async () => {
  console.log('Running 4-hour notification task');
  const { todayTotal, monthTotal } = await getExpenseSummary();
  const formatCurrency = (val) => `₹${val.toLocaleString('en-IN')}`;
  
  await sendNotificationToAll(
    'Daily Expense Summary',
    `Today's Total: ${formatCurrency(todayTotal)}\nMonth's Total: ${formatCurrency(monthTotal)}`
  );
}, {
  timezone: "Asia/Kolkata"
});

// Endpoint to trigger daily summary (used by external cron)
app.post('/send-daily-summary', async (req, res) => {
  console.log('Received request for daily summary trigger');
  try {
    const { todayTotal, monthTotal } = await getExpenseSummary();
    const formatCurrency = (val) => `₹${val.toLocaleString('en-IN')}`;
    
    await sendNotificationToAll(
      'Daily Expense Summary',
      `Today's Total: ${formatCurrency(todayTotal)}\nMonth's Total: ${formatCurrency(monthTotal)}`
    );
    
    // Return minimal response to avoid "output too large" errors in cron services
    res.status(200).json({ 
      status: 'ok', 
      message: 'Summary notifications sent',
      time: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error in /send-daily-summary:', err);
    res.status(500).json({ status: 'error', message: 'Failed to send notifications' });
  }
});

// Endpoint to subscribe a new device
app.post('/subscribe', async (req, res) => {
  console.log('Received subscription request');
  const { subscription } = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Subscription or endpoint missing' });
  }

  try {
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({ 
        endpoint: subscription.endpoint, 
        subscription_json: subscription 
      }, { onConflict: 'endpoint' });

    if (error) throw error;
    
    console.log('Subscription saved to Supabase');
    res.status(201).json({ message: 'Subscribed successfully' });
  } catch (err) {
    console.error('Error saving subscription:', err);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

// Endpoint to unsubscribe
app.post('/unsubscribe', async (req, res) => {
  const { endpoint } = req.body;
  try {
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint);
    
    if (error) throw error;
    res.status(200).json({ message: 'Unsubscribed successfully' });
  } catch (err) {
    console.error('Error unsubscribing:', err);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// Function to calculate monthly summary from Supabase
async function getMonthlySummary() {
  const now = new Date();
  let lastMonth = now.getMonth() - 1;
  let year = now.getFullYear();
  if (lastMonth < 0) {
    lastMonth = 11;
    year -= 1;
  }
  const lastMonthStr = `${year}-${String(lastMonth + 1).padStart(2, '0')}`;

  try {
    const { data: allExpenses, error: allExpError } = await supabase
      .from('expenses')
      .select('amount, date, expense_type')
      .neq('expense_type', 'income');
    
    if (allExpError) throw allExpError;

    const monthExpenses = allExpenses
      .filter(exp => exp.date.substring(0, 7) === lastMonthStr)
      .reduce((sum, exp) => sum + exp.amount, 0);

    const { data: salaryData, error: salError } = await supabase
      .from('salary_details')
      .select('*');
    
    if (salError) throw salError;

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
  } catch (err) {
    console.error('Error fetching monthly summary:', err);
    return null;
  }
}

// 9 AM 1st of every month
cron.schedule('0 9 1 * *', async () => {
  console.log('Running Monthly summary notification task');
  const summary = await getMonthlySummary();
  if (!summary) return;

  const formatCurrency = (val) => `₹${val.toLocaleString('en-IN')}`;
  
  await sendNotificationToAll(
    `Monthly Summary - ${summary.monthName}`,
    `Gross Salary: ${formatCurrency(summary.grossSalary)}\n` +
    `Total Expenses: ${formatCurrency(summary.expenses)}\n` +
    `Direct Saving: ${formatCurrency(summary.directSaving)}\n` +
    `Balance: ${formatCurrency(summary.balanceAmount)}\n` +
    `Saving %: ${summary.savingPercentage.toFixed(2)}%`
  );
}, {
  timezone: "Asia/Kolkata"
});

// Endpoint to trigger a test notification (for debugging)
app.post('/send-test', async (req, res) => {
  const { title, body } = req.body;
  
  try {
    const { todayTotal, monthTotal } = await getExpenseSummary();
    const formatCurrency = (val) => `₹${val.toLocaleString('en-IN')}`;

    const finalTitle = title || 'Expense Tracker Summary';
    const finalBody = body || `Today's Total: ${formatCurrency(todayTotal)}\nMonth's Total: ${formatCurrency(monthTotal)}`;

    await sendNotificationToAll(finalTitle, finalBody);
    res.status(200).json({ message: 'Test notification initiated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "push-backend",
    time: new Date().toISOString()
  });
});

// Health route
app.get('/health', (req, res) => {
  res.status(200).send("OK");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Push server running on PORT ${PORT}`);
});
