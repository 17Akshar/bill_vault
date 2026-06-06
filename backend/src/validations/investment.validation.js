const Joi = require('joi');

const CATEGORIES = [
  'mutual_fund', 'etf', 'stock', 'fd', 'cd', 'rd', 'bond', 'gold',
  'nps', 'ppf', 'epf', 'crypto', 'esop', 'private_equity', 'aif',
  'artwork', 'real_estate', 'other',
];

const createInvestment = Joi.object({
  category: Joi.string().valid(...CATEGORIES).required(),
  name: Joi.string().min(1).max(255).required(),
  invested_amount: Joi.number().min(0).default(0),
  current_value: Joi.number().min(0).default(0),
  quantity: Joi.number().min(0).allow(null),
  purchase_price: Joi.number().min(0).allow(null),
  current_price: Joi.number().min(0).allow(null),
  purchase_date: Joi.date().iso().allow(null),
  maturity_date: Joi.date().iso().allow(null),
  currency: Joi.string().length(3).default('INR'),
  status: Joi.string().valid('active', 'matured', 'sold', 'withdrawn', 'closed').default('active'),
  notes: Joi.string().max(2000).allow('', null),
  color: Joi.string().max(20).allow('', null),
  // category-specific fields
  extra: Joi.object().allow(null),
});

const updateInvestment = createInvestment.fork(
  ['category', 'name'],
  (s) => s.optional()
);

const addTransaction = Joi.object({
  type: Joi.string().valid('buy', 'sell', 'dividend', 'interest', 'bonus', 'split', 'sip').required(),
  amount: Joi.number().positive().required(),
  quantity: Joi.number().min(0).allow(null),
  price: Joi.number().min(0).allow(null),
  date: Joi.date().iso().required(),
  notes: Joi.string().max(500).allow('', null),
});

module.exports = { createInvestment, updateInvestment, addTransaction };
