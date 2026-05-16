export type LendBorrowType = 'lent' | 'borrowed';
export type PaymentStatus = 'pending' | 'partial' | 'completed';
export type ReminderFrequency = 'one_time' | 'weekly' | 'monthly' | 'quarterly';

export interface Payment {
  id: string;
  date: string;
  amount: number;
  status: PaymentStatus;
  notes?: string;
}

export interface LendBorrowEntry {
  id: string;
  personName: string;
  phoneNumber: string;
  type: LendBorrowType;
  amount: number;
  principal: number;
  remainingAmount: number;
  startDate: string;
  reason: string;
  interestRate?: number;
  dueDate?: string;
  status: PaymentStatus;
  paymentHistory: Payment[];
  reminders: LendBorrowReminder[];
}

export interface LendBorrowReminder {
  id: string;
  type: 'payment' | 'custom';
  dueDate: string;
  frequency: ReminderFrequency;
  nextDueDate: string;
  isActive: boolean;
}

export interface MonthlyData {
  month: string;
  lent: number;
  borrowed: number;
}

export const DUMMY_LEND_BORROW: LendBorrowEntry[] = [
  {
    id: '1',
    personName: 'Rahul Sharma',
    phoneNumber: '+91 98765 43210',
    type: 'lent',
    amount: 50000,
    principal: 50000,
    remainingAmount: 30000,
    startDate: '12 Jan 2024',
    reason: 'Personal loan',
    interestRate: 8,
    dueDate: '12 Jan 2025',
    status: 'partial',
    paymentHistory: [
      { id: '1', date: '12 Feb 2024', amount: 5000, status: 'completed', notes: 'First instalment' },
      { id: '2', date: '12 Mar 2024', amount: 5000, status: 'completed', notes: 'Second instalment' },
      { id: '3', date: '12 Apr 2024', amount: 10000, status: 'completed', notes: 'Extra payment' },
    ],
    reminders: [
      {
        id: '1',
        type: 'payment',
        dueDate: '12 May 2024',
        frequency: 'monthly',
        nextDueDate: '12 May 2024',
        isActive: true,
      },
    ],
  },
  {
    id: '2',
    personName: 'Priya Patel',
    phoneNumber: '+91 87654 32109',
    type: 'borrowed',
    amount: 25000,
    principal: 25000,
    remainingAmount: 25000,
    startDate: '15 Mar 2024',
    reason: 'For travel expenses',
    status: 'pending',
    paymentHistory: [],
    reminders: [
      {
        id: '2',
        type: 'payment',
        dueDate: '15 Jun 2024',
        frequency: 'one_time',
        nextDueDate: '15 Jun 2024',
        isActive: true,
      },
    ],
  },
  {
    id: '3',
    personName: 'Amit Kumar',
    phoneNumber: '+91 76543 21098',
    type: 'lent',
    amount: 75000,
    principal: 75000,
    remainingAmount: 50000,
    startDate: '01 Nov 2023',
    reason: 'Business investment',
    interestRate: 10,
    dueDate: '01 Nov 2024',
    status: 'partial',
    paymentHistory: [
      { id: '4', date: '01 Jan 2024', amount: 25000, status: 'completed', notes: 'Quarterly payment' },
    ],
    reminders: [
      {
        id: '3',
        type: 'payment',
        dueDate: '01 May 2024',
        frequency: 'quarterly',
        nextDueDate: '01 May 2024',
        isActive: true,
      },
    ],
  },
  {
    id: '4',
    personName: 'Zara Khan',
    phoneNumber: '+91 65432 10987',
    type: 'borrowed',
    amount: 15000,
    principal: 15000,
    remainingAmount: 0,
    startDate: '20 Dec 2023',
    reason: 'Emergency expenses',
    status: 'completed',
    paymentHistory: [
      { id: '5', date: '15 Jan 2024', amount: 15000, status: 'completed', notes: 'Full payment' },
    ],
    reminders: [],
  },
  {
    id: '5',
    personName: 'Vikram Singh',
    phoneNumber: '+91 54321 09876',
    type: 'lent',
    amount: 100000,
    principal: 100000,
    remainingAmount: 70000,
    startDate: '05 Jun 2023',
    reason: 'Home renovation',
    interestRate: 7,
    dueDate: '05 Jun 2025',
    status: 'partial',
    paymentHistory: [
      { id: '6', date: '05 Aug 2023', amount: 10000, status: 'completed', notes: 'First instalment' },
      { id: '7', date: '05 Oct 2023', amount: 10000, status: 'completed', notes: 'Second instalment' },
      { id: '8', date: '05 Jan 2024', amount: 10000, status: 'completed', notes: 'Third instalment' },
    ],
    reminders: [
      {
        id: '4',
        type: 'payment',
        dueDate: '05 Apr 2024',
        frequency: 'quarterly',
        nextDueDate: '05 Apr 2024',
        isActive: true,
      },
    ],
  },
  {
    id: '6',
    personName: 'Sneha Desai',
    phoneNumber: '+91 43210 98765',
    type: 'borrowed',
    amount: 35000,
    principal: 35000,
    remainingAmount: 20000,
    startDate: '10 Feb 2024',
    reason: 'Medical expenses',
    dueDate: '10 Aug 2024',
    status: 'partial',
    paymentHistory: [
      { id: '9', date: '10 Apr 2024', amount: 15000, status: 'completed', notes: 'Partial payment' },
    ],
    reminders: [
      {
        id: '5',
        type: 'payment',
        dueDate: '10 Aug 2024',
        frequency: 'one_time',
        nextDueDate: '10 Aug 2024',
        isActive: true,
      },
    ],
  },
];

export const REMINDER_TYPES = [
  { key: 'payment', label: 'Payment Reminder', icon: 'cash-outline', color: '#FF5252' },
  { key: 'custom', label: 'Custom Reminder', icon: 'notifications-outline', color: '#448AFF' },
];

export const MONTHLY_TREND_DATA: MonthlyData[] = [
  { month: 'Jan', lent: 50000, borrowed: 15000 },
  { month: 'Feb', lent: 75000, borrowed: 35000 },
  { month: 'Mar', lent: 75000, borrowed: 60000 },
  { month: 'Apr', lent: 125000, borrowed: 60000 },
  { month: 'May', lent: 125000, borrowed: 50000 },
  { month: 'Jun', lent: 125000, borrowed: 40000 },
];
