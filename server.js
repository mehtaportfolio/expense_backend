const express = require('express');
const webpush = require('web-push');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Replace with your generated VAPID keys from environment variables
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'BL--ZRGfw6N4MLDzEZklLanQj2iWWPBj55tw_LfLfVwLX08-fLNpiodcDEAEs6oj74G7h1qZBq8ZlKTIVhSrLZE',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'OZ83E8J1dCeR2Zhmftooc6qCXlVRC5zAbEEnmyqoCP0'
};

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

let subscriptions = [];

// Endpoint to subscribe a new device
app.post('/subscribe', (req, res) => {
  const { subscription } = req.body;
  if (!subscription) {
    return res.status(400).json({ error: 'Subscription missing' });
  }

  // Check if subscription already exists
  const existingSub = subscriptions.find(s => s.endpoint === subscription.endpoint);
  if (!existingSub) {
    subscriptions.push(subscription);
  }

  res.status(201).json({ message: 'Subscribed successfully' });
});

// Endpoint to unsubscribe
app.post('/unsubscribe', (req, res) => {
  const { endpoint } = req.body;
  subscriptions = subscriptions.filter(sub => sub.endpoint !== endpoint);
  res.status(200).json({ message: 'Unsubscribed successfully' });
});

// Endpoint to trigger a test notification (for debugging)
app.post('/send-test', (req, res) => {
  const { title, body } = req.body;
  
  const notificationPayload = JSON.stringify({
    title: title || 'Test Notification',
    body: body || 'This is a test notification from the server!',
    url: '/'
  });

  const pushPromises = subscriptions.map(sub => 
    webpush.sendNotification(sub, notificationPayload).catch(err => {
      console.error('Error sending notification:', err);
      if (err.statusCode === 410) { // Subscription expired or removed
        subscriptions = subscriptions.filter(s => s.endpoint !== sub.endpoint);
      }
    })
  );

  Promise.all(pushPromises)
    .then(() => res.status(200).json({ message: `Attempted to send to ${subscriptions.length} clients` }))
    .catch(err => res.status(500).json({ error: err.message }));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Push server running on http://localhost:${PORT}`);
});
