const Joi = require('joi');

const createAccount = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  account_type: Joi.string()
    .valid('bank', 'savings', 'current', 'cash', 'wallet', 'credit', 'investment', 'upi', 'credit_card', 'other')
    .required(),
  bank_name: Joi.string().max(100).allow('', null),
  account_number: Joi.string().max(20).allow('', null),
  balance: Joi.number().default(0),
  currency: Joi.string().length(3).default('INR'),
  color: Joi.string().max(20).allow('', null),
  icon: Joi.string().max(10).allow('', null),
  include_in_net_worth: Joi.boolean().default(true),
  notes: Joi.string().max(1000).allow('', null),
}).options({ allowUnknown: true, stripUnknown: true });

const updateAccount = createAccount.fork(
  ['name', 'account_type'],
  (schema) => schema.optional()
);

module.exports = { createAccount, updateAccount };
