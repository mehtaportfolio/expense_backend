require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./src/routes/api');

const app = express();

app.use(cors());
app.use(express.json());

// Log all requests for debugging
app.use((req, res, next) => {
  if (!req.url.includes("send-daily-summary") && !req.url.includes("send-monthly-summary")) {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  }
  next();
});

// API Routes
app.use('/api', apiRoutes);

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "expense-tracker-backend",
    time: new Date().toISOString()
  });
});

// Health route
app.get('/health', (req, res) => {
  res.status(200).send("OK");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on PORT ${PORT}`);
});
