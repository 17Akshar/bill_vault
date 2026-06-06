const Joi = require('joi');

const pagination = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().max(100).allow('', null),
  sort: Joi.string().allow('', null),
});

const uuidParam = Joi.object({
  id: Joi.string().uuid().required(),
});

const reminder = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  provider: Joi.string().max(100).allow('', null),
  category: Joi.string().max(50).required(),
  amount: Joi.number().min(0).allow(null),
  due_date: Joi.date().iso().required(),
  is_recurring: Joi.boolean().default(false),
  recurrence_rule: Joi.string().max(50).allow('', null),
  recurrence_end: Joi.date().iso().allow(null),
  notify_days_before: Joi.number().integer().min(0).max(30).default(3),
  notify_on_due: Joi.boolean().default(true),
  account_id: Joi.string().uuid().allow(null),
  notes: Joi.string().max(1000).allow('', null),
});

const budget = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  category_id: Joi.string().uuid().allow(null),
  budget_amount: Joi.number().positive().required(),
  period: Joi.string().valid('weekly', 'monthly', 'quarterly', 'yearly').default('monthly'),
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().allow(null),
  alert_at_pct: Joi.number().integer().min(1).max(100).default(80),
  rollover: Joi.boolean().default(false),
  notes: Joi.string().max(1000).allow('', null),
});

const goal = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  target_amount: Joi.number().positive().required(),
  current_amount: Joi.number().min(0).default(0),
  target_date: Joi.date().iso().allow(null),
  category: Joi.string().max(50).allow('', null),
  icon: Joi.string().max(10).allow('', null),
  color: Joi.string().max(20).allow('', null),
  priority: Joi.alternatives().try(Joi.string().valid('low', 'medium', 'high'), Joi.number().integer().min(1).max(3)).default('medium'),
  notes: Joi.string().max(1000).allow('', null),
});

const loan = Joi.object({
  loan_type: Joi.string().valid('home', 'personal', 'auto', 'education', 'business', 'gold', 'other').required(),
  lender_name: Joi.string().min(1).max(100).required(),
  loan_account_no: Joi.string().max(50).allow('', null),
  principal: Joi.number().positive().required(),
  outstanding: Joi.number().min(0).required(),
  interest_rate: Joi.number().min(0).max(100).required(),
  tenure_months: Joi.number().integer().positive().required(),
  emi_amount: Joi.number().min(0).allow(null),
  emi_type: Joi.string().valid('fixed', 'floating').default('fixed'),
  start_date: Joi.date().iso().allow(null),
  end_date: Joi.date().iso().allow(null),
  emi_due_date: Joi.alternatives().try(Joi.number().integer().min(1).max(31), Joi.string().isoDate()).allow(null),
  account_id: Joi.string().uuid().allow(null),
  notes: Joi.string().max(1000).allow('', null),
});

const creditCard = Joi.object({
  card_name: Joi.string().min(1).max(100).required(),
  issuer: Joi.string().min(1).max(100).required(),
  card_number: Joi.string().max(20).allow('', null),
  credit_limit: Joi.number().positive().required(),
  outstanding: Joi.number().min(0).default(0),
  minimum_payment: Joi.number().min(0).allow(null),
  bill_due_date: Joi.alternatives().try(Joi.number().integer().min(1).max(31), Joi.string()).allow(null),
  billing_date: Joi.alternatives().try(Joi.number().integer().min(1).max(31), Joi.string()).allow(null),
  reward_points: Joi.number().min(0).default(0),
  annual_fee: Joi.number().min(0).allow(null),
  color: Joi.string().max(20).allow('', null),
  notes: Joi.string().max(1000).allow('', null),
});

const rental = Joi.object({
  property_name: Joi.string().min(1).max(255).required(),
  property_type: Joi.string().valid('apartment', 'house', 'commercial', 'plot', 'residential', 'pg', 'land', 'custom', 'other').allow(null),
  address: Joi.string().max(500).allow('', null),
  market_value: Joi.number().min(0).allow(null),
  monthly_rent: Joi.number().min(0).allow(null),
  security_deposit: Joi.number().min(0).allow(null),
  tenant_name: Joi.string().max(100).allow('', null),
  tenant_phone: Joi.string().max(20).allow('', null),
  tenant_email: Joi.string().email().allow('', null),
  lease_start: Joi.date().iso().allow(null),
  lease_end: Joi.date().iso().allow(null),
  rent_due_date: Joi.number().integer().min(1).max(31).allow(null),
  notes: Joi.string().max(1000).allow('', null),
});

const lending = Joi.object({
  type: Joi.string().valid('lent', 'borrowed').required(),
  person_name: Joi.string().min(1).max(100).required(),
  person_phone: Joi.string().max(20).allow('', null),
  amount: Joi.number().positive().required(),
  remaining: Joi.number().min(0).required(),
  interest_rate: Joi.number().min(0).max(100).default(0),
  date: Joi.date().iso().required(),
  due_date: Joi.date().iso().allow(null),
  notes: Joi.string().max(1000).allow('', null),
  account_id: Joi.string().uuid().allow(null),
});

const insurance = Joi.object({
  type: Joi.string().valid('term', 'mediclaim', 'lic', 'motor', 'vehicle', 'health', 'life', 'ulip', 'other').required(),
  policy_number: Joi.string().max(100).allow('', null),
  provider: Joi.string().min(1).max(100).required(),
  plan_name: Joi.string().min(1).max(255).required(),
  sum_assured: Joi.number().min(0).allow(null),
  premium_amount: Joi.number().min(0).allow(null),
  premium_frequency: Joi.string().valid('monthly', 'quarterly', 'half_yearly', 'annual', 'yearly').default('annual'),
  start_date: Joi.date().iso().allow(null),
  end_date: Joi.date().iso().allow(null),
  maturity_date: Joi.date().iso().allow(null),
  premium_due_date: Joi.date().iso().allow(null),
  nominee_name: Joi.string().max(100).allow('', null),
  nominee_relation: Joi.string().max(50).allow('', null),
  agent_name: Joi.string().max(100).allow('', null),
  notes: Joi.string().max(2000).allow('', null),
});

const note = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  content: Joi.string().max(50000).allow('', null),
  note_type: Joi.string().valid('text', 'voice', 'scan', 'checklist', 'general').default('text'),
  tags: Joi.array().items(Joi.string()).default([]),
  is_pinned: Joi.boolean().default(false),
  is_locked: Joi.boolean().default(false),
  reminder_at: Joi.date().iso().allow(null),
  color: Joi.string().max(20).allow('', null),
});

module.exports = {
  pagination,
  uuidParam,
  reminder,
  budget,
  goal,
  loan,
  creditCard,
  rental,
  lending,
  insurance,
  note,
};
