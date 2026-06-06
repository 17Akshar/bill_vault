const Joi = require('joi');

const createTransaction = Joi.object({
  type: Joi.string().valid('income', 'expense', 'transfer').required(),
  amount: Joi.number().positive().required(),
  description: Joi.string().min(1).max(255).required(),
  category_id: Joi.string().uuid().allow(null),
  account_id: Joi.string().uuid().allow(null),
  to_account_id: Joi.string().uuid().when('type', {
    is: 'transfer',
    then: Joi.required(),
    otherwise: Joi.allow(null),
  }),
  date: Joi.date().iso().required(),
  notes: Joi.string().max(1000).allow('', null),
  tags: Joi.array().items(Joi.string()).default([]),
  is_recurring: Joi.boolean().default(false),
  recurrence_rule: Joi.string().allow(null),
  is_tax_related: Joi.boolean().default(false),
  reference_no: Joi.string().max(100).allow('', null),
  payee: Joi.string().max(100).allow('', null),
});

const updateTransaction = createTransaction.fork(
  ['type', 'amount', 'description', 'date'],
  (schema) => schema.optional()
);

const listTransactions = Joi.object({
  type: Joi.string().valid('income', 'expense', 'transfer', 'all'),
  month: Joi.number().integer().min(1).max(12),
  year: Joi.number().integer().min(2000).max(2100),
  account_id: Joi.string().uuid(),
  category_id: Joi.string().uuid(),
  search: Joi.string().max(100),
  min_amount: Joi.number().min(0),
  max_amount: Joi.number().min(0),
  sort: Joi.string().valid('date_asc', 'date_desc', 'amount_asc', 'amount_desc').default('date_desc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

module.exports = { createTransaction, updateTransaction, listTransactions };
