// Shared dummy data for Credit Cards module (replaced by API in Step 10)

export type CCCard = {
  card_id: string;
  bank_name: string;
  name: string;
  card_number_last4: string;
  network: 'VISA' | 'Mastercard' | 'RuPay' | 'Amex';
  credit_limit: number;
  current_outstanding: number;
  billing_date: number;       // day of month billing cycle starts
  billing_end_date: number;   // day of month billing cycle ends
  due_date: number;           // payment due day of month
  payment_due_label: string;
  days_until_due: number;
  minimum_due: number;
  last_payment_amount: number;
  last_payment_date: string;
  color: string;
  color2: string;
  is_active: boolean;
};

export type CCTransaction = {
  txn_id: string;
  card_id: string;
  merchant_name: string;
  category: string;
  category_icon: string;
  category_color: string;
  amount: number;
  date: string;
  date_label: string;
  type: 'purchase' | 'payment' | 'refund';
};

export const DUMMY_CARDS: CCCard[] = [
  {
    card_id: 'cc_hdfc_millennia',
    bank_name: 'HDFC Bank',
    name: 'Millennia Credit Card',
    card_number_last4: '4567',
    network: 'VISA',
    credit_limit: 200000,
    current_outstanding: 82500,
    billing_date: 1,
    billing_end_date: 30,
    due_date: 5,
    payment_due_label: '05 May 2024',
    days_until_due: 5,
    minimum_due: 4125,
    last_payment_amount: 40000,
    last_payment_date: '15 Apr 2024',
    color: '#6C47FF',
    color2: '#4B2FBF',
    is_active: true,
  },
  {
    card_id: 'cc_icici_sapphiro',
    bank_name: 'ICICI Bank',
    name: 'Sapphiro Credit Card',
    card_number_last4: '7690',
    network: 'Mastercard',
    credit_limit: 100000,
    current_outstanding: 50000,
    billing_date: 1,
    billing_end_date: 30,
    due_date: 12,
    payment_due_label: '12 May 2024',
    days_until_due: 12,
    minimum_due: 2500,
    last_payment_amount: 20000,
    last_payment_date: '10 Apr 2024',
    color: '#FF6B35',
    color2: '#FF4D67',
    is_active: true,
  },
];

export const DUMMY_TRANSACTIONS: CCTransaction[] = [
  { txn_id: 't1', card_id: 'cc_hdfc_millennia', merchant_name: 'Amazon India', category: 'Shopping', category_icon: 'bag-handle-outline', category_color: '#FF9100', amount: 5499, date: '2024-04-25', date_label: '25 Apr 2024', type: 'purchase' },
  { txn_id: 't2', card_id: 'cc_hdfc_millennia', merchant_name: 'Zomato', category: 'Food', category_icon: 'restaurant-outline', category_color: '#FF4D67', amount: 875, date: '2024-04-24', date_label: '24 Apr 2024', type: 'purchase' },
  { txn_id: 't3', card_id: 'cc_hdfc_millennia', merchant_name: 'BigBasket', category: 'Groceries', category_icon: 'basket-outline', category_color: '#00C48C', amount: 1230, date: '2024-04-23', date_label: '23 Apr 2024', type: 'purchase' },
  { txn_id: 't4', card_id: 'cc_hdfc_millennia', merchant_name: 'Uber', category: 'Transport', category_icon: 'car-outline', category_color: '#448AFF', amount: 320, date: '2024-04-22', date_label: '22 Apr 2024', type: 'purchase' },
  { txn_id: 't5', card_id: 'cc_hdfc_millennia', merchant_name: 'Reliance Digital', category: 'Electronics', category_icon: 'laptop-outline', category_color: '#7C4DFF', amount: 18999, date: '2024-04-21', date_label: '21 Apr 2024', type: 'purchase' },
  { txn_id: 't6', card_id: 'cc_hdfc_millennia', merchant_name: 'Swiggy', category: 'Food', category_icon: 'restaurant-outline', category_color: '#FF4D67', amount: 450, date: '2024-04-20', date_label: '20 Apr 2024', type: 'purchase' },
  { txn_id: 't7', card_id: 'cc_hdfc_millennia', merchant_name: 'PVR Cinemas', category: 'Entertainment', category_icon: 'film-outline', category_color: '#EC4899', amount: 1200, date: '2024-04-19', date_label: '19 Apr 2024', type: 'purchase' },
  { txn_id: 't8', card_id: 'cc_hdfc_millennia', merchant_name: 'Pantaloons', category: 'Shopping', category_icon: 'shirt-outline', category_color: '#FF9100', amount: 2650, date: '2024-04-18', date_label: '18 Apr 2024', type: 'purchase' },
  { txn_id: 't9', card_id: 'cc_icici_sapphiro', merchant_name: 'Flipkart', category: 'Shopping', category_icon: 'bag-handle-outline', category_color: '#FF9100', amount: 3299, date: '2024-04-24', date_label: '24 Apr 2024', type: 'purchase' },
  { txn_id: 't10', card_id: 'cc_icici_sapphiro', merchant_name: 'BookMyShow', category: 'Entertainment', category_icon: 'film-outline', category_color: '#EC4899', amount: 900, date: '2024-04-22', date_label: '22 Apr 2024', type: 'purchase' },
  { txn_id: 't11', card_id: 'cc_icici_sapphiro', merchant_name: 'Nykaa', category: 'Personal Care', category_icon: 'sparkles-outline', category_color: '#FF69B4', amount: 1850, date: '2024-04-20', date_label: '20 Apr 2024', type: 'purchase' },
];

export const DUMMY_CALENDAR_EVENTS = [
  { date: '2024-05-05', type: 'payment_due' as const, card_id: 'cc_hdfc_millennia', label: 'HDFC Bank Millennia Payment Due', amount: 82500 },
  { date: '2024-05-12', type: 'payment_due' as const, card_id: 'cc_icici_sapphiro', label: 'ICICI Bank Sapphiro Payment Due', amount: 50000 },
  { date: '2024-05-15', type: 'reminder' as const, card_id: 'cc_hdfc_millennia', label: 'EMI Payment Reminder', amount: 12500 },
  { date: '2024-05-24', type: 'reminder' as const, card_id: 'cc_icici_sapphiro', label: 'Insurance Payment Reminder', amount: 8000 },
];

export const EXPENSE_CATEGORIES = [
  { key: 'food', label: 'Food & Dining', icon: 'restaurant-outline', color: '#FF4D67' },
  { key: 'shopping', label: 'Shopping', icon: 'bag-handle-outline', color: '#FF9100' },
  { key: 'groceries', label: 'Groceries', icon: 'basket-outline', color: '#00C48C' },
  { key: 'transport', label: 'Transport', icon: 'car-outline', color: '#448AFF' },
  { key: 'electronics', label: 'Electronics', icon: 'laptop-outline', color: '#7C4DFF' },
  { key: 'entertainment', label: 'Entertainment', icon: 'film-outline', color: '#EC4899' },
  { key: 'health', label: 'Health', icon: 'medkit-outline', color: '#00BCD4' },
  { key: 'travel', label: 'Travel', icon: 'airplane-outline', color: '#8BC34A' },
  { key: 'personal', label: 'Personal Care', icon: 'sparkles-outline', color: '#FF69B4' },
  { key: 'bills', label: 'Bills', icon: 'flash-outline', color: '#FFC107' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline', color: '#90A4AE' },
];
