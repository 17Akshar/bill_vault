/**
 * Indian Rupee Currency Formatting Utilities
 * Formats numbers in Indian numbering system (₹ 1,00,000)
 */

export const formatINR = (amount: number, showSymbol = true): string => {
  const negative = amount < 0;
  const abs = Math.abs(amount);
  const parts = abs.toFixed(2).split('.');
  let intPart = parts[0];
  const decPart = parts[1];

  if (intPart.length > 3) {
    const last3 = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    intPart = grouped + ',' + last3;
  }

  const formatted = `${intPart}.${decPart}`;
  const prefix = negative ? '-' : '';
  return showSymbol ? `${prefix}\u20B9${formatted}` : `${prefix}${formatted}`;
};

export const formatINRCompact = (amount: number): string => {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 10000000) return `${sign}\u20B9${(abs / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000) return `${sign}\u20B9${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${sign}\u20B9${(abs / 1000).toFixed(1)}K`;
  return `${sign}\u20B9${abs.toFixed(0)}`;
};

// Category definitions with sub-categories
export const INCOME_CATEGORIES = [
  { key: 'salary', label: 'Salary', icon: 'briefcase-outline', subs: ['Base Salary', 'Bonus', 'Overtime', 'Arrears'] },
  { key: 'business', label: 'Business', icon: 'storefront-outline', subs: ['Revenue', 'Commission', 'Consulting'] },
  { key: 'freelance', label: 'Freelance', icon: 'laptop-outline', subs: ['Project', 'Retainer', 'Gig'] },
  { key: 'rental', label: 'Rental', icon: 'home-outline', subs: ['House Rent', 'Shop Rent', 'PG/Hostel'] },
  { key: 'investment', label: 'Investment', icon: 'trending-up-outline', subs: ['Dividends', 'Interest', 'Capital Gains', 'FD Maturity'] },
  { key: 'gift', label: 'Gift', icon: 'gift-outline', subs: ['Family', 'Reward', 'Cashback'] },
  { key: 'refund', label: 'Refund', icon: 'arrow-undo-outline', subs: ['Shopping', 'Service', 'Tax'] },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline', subs: [] },
];

export const EXPENSE_CATEGORIES = [
  { key: 'food', label: 'Food & Dining', icon: 'restaurant-outline', subs: ['Restaurant', 'Fast Food', 'Coffee', 'Delivery', 'Canteen'] },
  { key: 'groceries', label: 'Groceries', icon: 'basket-outline', subs: ['Vegetables', 'Fruits', 'Dairy', 'Staples', 'Snacks'] },
  { key: 'transport', label: 'Transport', icon: 'car-outline', subs: ['Fuel', 'Cab/Auto', 'Metro/Bus', 'Parking', 'Toll', 'Maintenance'] },
  { key: 'shopping', label: 'Shopping', icon: 'cart-outline', subs: ['Clothing', 'Electronics', 'Home Decor', 'Gifts', 'Online'] },
  { key: 'bills', label: 'Bills & Utilities', icon: 'flash-outline', subs: ['Electricity', 'Water', 'Gas', 'Internet', 'Phone', 'DTH'] },
  { key: 'rent', label: 'Rent', icon: 'home-outline', subs: ['House', 'Office', 'Storage'] },
  { key: 'emi', label: 'EMI / Loan', icon: 'card-outline', subs: ['Home Loan', 'Car Loan', 'Personal Loan', 'Education Loan', 'Credit Card'] },
  { key: 'health', label: 'Health', icon: 'medkit-outline', subs: ['Doctor', 'Medicine', 'Lab Tests', 'Insurance', 'Gym/Fitness'] },
  { key: 'education', label: 'Education', icon: 'school-outline', subs: ['Tuition', 'Books', 'Courses', 'Coaching', 'Exam Fees'] },
  { key: 'entertainment', label: 'Entertainment', icon: 'film-outline', subs: ['Movies', 'Streaming', 'Games', 'Events', 'Subscriptions'] },
  { key: 'travel', label: 'Travel', icon: 'airplane-outline', subs: ['Flights', 'Hotel', 'Train', 'Activities', 'Food'] },
  { key: 'personal', label: 'Personal Care', icon: 'person-outline', subs: ['Salon', 'Skincare', 'Grooming'] },
  { key: 'investment', label: 'Investment', icon: 'trending-up-outline', subs: ['SIP', 'Stocks', 'FD', 'Gold', 'Crypto'] },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline', subs: [] },
];

export const ACCOUNT_TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  bank: { label: 'Bank Account', icon: 'business-outline', color: '#448AFF' },
  cash: { label: 'Cash', icon: 'cash-outline', color: '#00E676' },
  upi: { label: 'UPI', icon: 'phone-portrait-outline', color: '#7C4DFF' },
  credit_card: { label: 'Credit Card', icon: 'card-outline', color: '#FF9100' },
};

export const PAYMENT_TYPES = [
  { key: 'bank', label: 'Bank Transfer', icon: 'business-outline' },
  { key: 'cash', label: 'Cash', icon: 'cash-outline' },
  { key: 'upi', label: 'UPI', icon: 'phone-portrait-outline' },
  { key: 'credit_card', label: 'Credit Card', icon: 'card-outline' },
];

export const FAMILY_ROLES = [
  { key: 'self', label: 'Self' },
  { key: 'spouse', label: 'Spouse' },
  { key: 'child', label: 'Child' },
  { key: 'parent', label: 'Parent' },
  { key: 'sibling', label: 'Sibling' },
  { key: 'other', label: 'Other' },
];
