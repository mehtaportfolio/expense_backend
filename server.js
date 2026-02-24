require('dotenv').config();
const express = require('express');
const webpush = require('web-push');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

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
  'mailto:your-email@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const SUBSCRIPTIONS_FILE = path.join(__dirname, 'subscriptions.json');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Helper to load subscriptions
function loadSubscriptions() {
  try {
    if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
      return JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error loading subscriptions:', err);
  }
  return [];
}

// Helper to save subscriptions
function saveSubscriptions(subs) {
  try {
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subs, null, 2));
  } catch (err) {
    console.error('Error saving subscriptions:', err);
  }
}

let subscriptions = loadSubscriptions();

// Function to calculate daily and monthly totals from Supabase
async function getExpenseSummary() {
  const now = new Date();
  
  // Use IST timezone for date calculations if possible, 
  // or just rely on the fact that YYYY-MM-DD is consistent.
  // For now, let's use a more robust way to get local YYYY-MM and YYYY-MM-DD
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  const today = `${year}-${month}-${day}`;
  const currentMonth = `${year}-${month}`;

  console.log(`Calculating summary for Today: ${today}, Month: ${currentMonth}`);

  try {
    // Fetch all expenses for the current month to be safe
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('amount, date, expense_type')
      .neq('expense_type', 'income')
      .gte('date', `${currentMonth}-01`);

    if (error) throw error;

    console.log(`Fetched ${expenses?.length || 0} expenses for the month.`);

    const todayTotal = expenses
      .filter(exp => exp.date.startsWith(today))
      .reduce((sum, exp) => sum + exp.amount, 0);

    const monthTotal = expenses
      .filter(exp => exp.date.startsWith(currentMonth))
      .reduce((sum, exp) => sum + exp.amount, 0);

    console.log(`Results - Today: ${todayTotal}, Month: ${monthTotal}`);

    return { todayTotal, monthTotal };
  } catch (err) {
    console.error('Error fetching expenses from Supabase:', err);
    return { todayTotal: 0, monthTotal: 0 };
  }
}

// Function to send notifications to all subscribers
async function sendNotificationToAll(title, body) {
  const notificationPayload = JSON.stringify({
    title,
    body,
    url: '/'
  });

  const pushPromises = subscriptions.map(sub => 
    webpush.sendNotification(sub, notificationPayload).catch(err => {
      console.error('Error sending notification:', err);
      if (err.statusCode === 410 || err.statusCode === 404) { // Subscription expired or removed
        subscriptions = subscriptions.filter(s => s.endpoint !== sub.endpoint);
        saveSubscriptions(subscriptions);
      }
    })
  );

  await Promise.all(pushPromises);
}

// Schedule tasks
// 8 AM Daily
cron.schedule('0 8 * * *', async () => {
  console.log('Running 8 AM notification task');
  const { todayTotal, monthTotal } = await getExpenseSummary();
  const formatCurrency = (val) => `₹${val.toLocaleString('en-IN')}`;
  
  await sendNotificationToAll(
    'Morning Expense Summary',
    `Today's Total: ${formatCurrency(todayTotal)}\nMonth's Total: ${formatCurrency(monthTotal)}`
  );
}, {
  timezone: "Asia/Kolkata"
});

// 10 PM Daily
cron.schedule('0 22 * * *', async () => {
  console.log('Running 10 PM notification task');
  const { todayTotal, monthTotal } = await getExpenseSummary();
  const formatCurrency = (val) => `₹${val.toLocaleString('en-IN')}`;
  
  await sendNotificationToAll(
    'Daily Expense Summary',
    `Today's Total: ${formatCurrency(todayTotal)}\nMonth's Total: ${formatCurrency(monthTotal)}`
  );
}, {
  timezone: "Asia/Kolkata"
});

// Endpoint to subscribe a new device
app.post('/subscribe', (req, res) => {
  console.log('Received subscription request');
  const { subscription } = req.body;
  if (!subscription) {
    console.error('Subscription body missing!');
    return res.status(400).json({ error: 'Subscription missing' });
  }

  console.log('Subscription endpoint:', subscription.endpoint);

  // Check if subscription already exists
  const existingSub = subscriptions.find(s => s.endpoint === subscription.endpoint);
  if (!existingSub) {
    subscriptions.push(subscription);
    saveSubscriptions(subscriptions);
    console.log('New subscription saved. Total:', subscriptions.length);
  } else {
    console.log('Subscription already exists.');
  }

  res.status(201).json({ message: 'Subscribed successfully' });
});

// Endpoint to unsubscribe
app.post('/unsubscribe', (req, res) => {
  const { endpoint } = req.body;
  subscriptions = subscriptions.filter(sub => sub.endpoint !== endpoint);
  saveSubscriptions(subscriptions);
  res.status(200).json({ message: 'Unsubscribed successfully' });
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
    const { data: expenses, error: expError } = await supabase
      .from('expenses')
      .select('amount, date, expense_type')
      .eq('date', lastMonthStr) // This is simplified, usually you'd filter by month/year parts
      .neq('expense_type', 'income');

    // Better way to filter by month in Supabase would be date strings or specialized functions
    // Re-fetching all and filtering in JS for simplicity like frontend
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
    res.status(200).json({ message: `Attempted to send to ${subscriptions.length} clients` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Root route (important for uptime monitoring)
app.get('/', (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "push-backend",
    time: new Date().toISOString()
  });
});

// Health route (even better for monitoring)
app.get('/health', (req, res) => {
  res.status(200).send("OK");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Push server running on http://localhost:${PORT}`);
});
