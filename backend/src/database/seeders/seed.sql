-- ============================================================
-- SEED DATA – Default categories
-- ============================================================

INSERT INTO categories (id, user_id, name, type, icon, color, is_default) VALUES
  (uuid_generate_v4(), NULL, 'Salary', 'income', '💼', '#10D078', true),
  (uuid_generate_v4(), NULL, 'Business', 'income', '🏢', '#38BDF8', true),
  (uuid_generate_v4(), NULL, 'Freelance', 'income', '💻', '#7C5CFC', true),
  (uuid_generate_v4(), NULL, 'Investment Returns', 'income', '📈', '#FBBF24', true),
  (uuid_generate_v4(), NULL, 'Rental Income', 'income', '🏠', '#F59E0B', true),
  (uuid_generate_v4(), NULL, 'Interest', 'income', '🏦', '#10D078', true),
  (uuid_generate_v4(), NULL, 'Dividend', 'income', '💰', '#34D399', true),
  (uuid_generate_v4(), NULL, 'Gift', 'income', '🎁', '#EC4899', true),
  (uuid_generate_v4(), NULL, 'Other Income', 'income', '💵', '#8888AA', true),

  (uuid_generate_v4(), NULL, 'Food & Dining', 'expense', '🍽️', '#FF4D6A', true),
  (uuid_generate_v4(), NULL, 'Groceries', 'expense', '🛒', '#F97316', true),
  (uuid_generate_v4(), NULL, 'Transportation', 'expense', '🚗', '#FBBF24', true),
  (uuid_generate_v4(), NULL, 'Shopping', 'expense', '🛍️', '#EC4899', true),
  (uuid_generate_v4(), NULL, 'Entertainment', 'expense', '🎬', '#8B5CF6', true),
  (uuid_generate_v4(), NULL, 'Healthcare', 'expense', '🏥', '#EF4444', true),
  (uuid_generate_v4(), NULL, 'Education', 'expense', '📚', '#3B82F6', true),
  (uuid_generate_v4(), NULL, 'Utilities', 'expense', '💡', '#F59E0B', true),
  (uuid_generate_v4(), NULL, 'Rent', 'expense', '🏠', '#6366F1', true),
  (uuid_generate_v4(), NULL, 'Insurance', 'expense', '🛡️', '#0EA5E9', true),
  (uuid_generate_v4(), NULL, 'EMI/Loan', 'expense', '🏦', '#DC2626', true),
  (uuid_generate_v4(), NULL, 'Travel', 'expense', '✈️', '#10B981', true),
  (uuid_generate_v4(), NULL, 'Subscriptions', 'expense', '📱', '#7C3AED', true),
  (uuid_generate_v4(), NULL, 'Personal Care', 'expense', '💆', '#DB2777', true),
  (uuid_generate_v4(), NULL, 'Gifts & Donations', 'expense', '🎁', '#D97706', true),
  (uuid_generate_v4(), NULL, 'Other Expense', 'expense', '💸', '#8888AA', true),

  (uuid_generate_v4(), NULL, 'Account Transfer', 'transfer', '🔄', '#38BDF8', true)

ON CONFLICT DO NOTHING;
