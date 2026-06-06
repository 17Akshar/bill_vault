const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const { errorHandler, notFound } = require('./middleware/errorHandler.middleware');

const authRoutes = require('./routes/auth.routes');
const accountRoutes = require('./routes/account.routes');
const transactionRoutes = require('./routes/transaction.routes');
const investmentRoutes = require('./routes/investment.routes');
const insuranceRoutes = require('./routes/insurance.routes');
const loanRoutes = require('./routes/loan.routes');
const creditCardRoutes = require('./routes/credit-card.routes');
const rentalRoutes = require('./routes/rental.routes');
const reminderRoutes = require('./routes/reminder.routes');
const budgetRoutes = require('./routes/budget.routes');
const goalRoutes = require('./routes/goal.routes');
const noteRoutes = require('./routes/note.routes');
const lendingRoutes = require('./routes/lending.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const categoryRoutes = require('./routes/category.routes');
const profileRoutes = require('./routes/profile.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const uploadRoutes = require('./routes/upload.routes');
const otherAssetRoutes = require('./routes/other-asset.routes');

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Fincare API is running', timestamp: new Date().toISOString() });
});

const API = '/api';
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/dashboard`, dashboardRoutes);
app.use(`${API}/accounts`, accountRoutes);
app.use(`${API}/transactions`, transactionRoutes);
app.use(`${API}/investments`, investmentRoutes);
app.use(`${API}/insurance`, insuranceRoutes);
app.use(`${API}/loans`, loanRoutes);
app.use(`${API}/credit-cards`, creditCardRoutes);
app.use(`${API}/rentals`, rentalRoutes);
app.use(`${API}/reminders`, reminderRoutes);
app.use(`${API}/budgets`, budgetRoutes);
app.use(`${API}/goals`, goalRoutes);
app.use(`${API}/notes`, noteRoutes);
app.use(`${API}/lending`, lendingRoutes);
app.use(`${API}/categories`, categoryRoutes);
app.use(`${API}/profiles`, profileRoutes);
app.use(`${API}/analytics`, analyticsRoutes);
app.use(`${API}/upload`, uploadRoutes);
app.use(`${API}/other-assets`, otherAssetRoutes);

app.get(`${API}/health`, (req, res) => res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() }));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
