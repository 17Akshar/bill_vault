// Shared dummy data for Rental Tracker module (Steps 1-9)

export type PropertyStatus = 'rented' | 'vacant' | 'pending';
export type PropertyType = 'apartment' | 'shop' | 'villa' | 'office' | 'flat' | 'plot';

export type Property = {
  id: string;
  name: string;
  type: PropertyType;
  address: string;
  city: string;
  purchasePrice: number;
  purchaseDate: string;
  monthlyRent: number;
  tenantName: string;
  rentalStartDate: string;
  rentalEndDate: string;
  securityDeposit: number;
  status: PropertyStatus;
  dueDay: number;
  color: string;
  icon: string;
  totalReceived: number;
  totalExpenses: number;
  outstanding: number;
  notes: string;
};

export type RentPayment = {
  id: string;
  propertyId: string;
  month: string;
  amount: number;
  date: string;
  mode: 'UPI' | 'NEFT' | 'Cash' | 'Cheque';
  status: 'paid' | 'pending' | 'late';
  tenantName: string;
};

export type RentalExpense = {
  id: string;
  propertyId: string;
  title: string;
  category: 'maintenance' | 'tax' | 'repair' | 'utility' | 'society' | 'insurance' | 'other';
  amount: number;
  date: string;
  notes: string;
};

export type TimelineEvent = {
  id: string;
  propertyId: string;
  type: 'payment' | 'expense' | 'tenant_change' | 'agreement' | 'inspection' | 'maintenance';
  title: string;
  date: string;
  amount?: number;
  notes: string;
};

export type PropertyReminder = {
  id: string;
  propertyId: string;
  type: 'rent_due' | 'tax' | 'maintenance' | 'agreement_renewal' | 'utility';
  title: string;
  dueDate: string;
  daysLeft: number;
  repeat: 'one_time' | 'monthly' | 'quarterly' | 'yearly';
};

export type MonthlyBar = { month: string; income: number; expense: number };

// ===== PROPERTIES =====
export const DUMMY_PROPERTIES: Property[] = [
  {
    id: 'p1', name: 'Nerul Sea View Apartment', type: 'apartment',
    address: 'Flat 3B, Sea View Heights, Sector 9', city: 'Navi Mumbai',
    purchasePrice: 8500000, purchaseDate: '10 Jan 2022',
    monthlyRent: 32000, tenantName: 'Rahul Sharma',
    rentalStartDate: '01 Apr 2024', rentalEndDate: '31 Mar 2025',
    securityDeposit: 96000, status: 'rented', dueDay: 5,
    color: '#448AFF', icon: 'home-outline',
    totalReceived: 130000, totalExpenses: 11350, outstanding: 0,
    notes: '2 BHK, sea-facing, parking included',
  },
  {
    id: 'p2', name: 'Kharghar Shop', type: 'shop',
    address: 'Shop 12, Kharghar Plaza, Sector 3', city: 'Navi Mumbai',
    purchasePrice: 4200000, purchaseDate: '22 Jun 2020',
    monthlyRent: 45000, tenantName: 'Meera Patel',
    rentalStartDate: '01 Jan 2024', rentalEndDate: '31 Dec 2024',
    securityDeposit: 135000, status: 'pending', dueDay: 1,
    color: '#FF9100', icon: 'storefront-outline',
    totalReceived: 90000, totalExpenses: 8200, outstanding: 45000,
    notes: 'Ground floor, high footfall area',
  },
  {
    id: 'p3', name: 'Pune Villa', type: 'villa',
    address: 'B-12, Green Valley Society, Baner', city: 'Pune',
    purchasePrice: 12000000, purchaseDate: '05 Mar 2019',
    monthlyRent: 55000, tenantName: 'Vacant',
    rentalStartDate: '', rentalEndDate: '',
    securityDeposit: 0, status: 'vacant', dueDay: 10,
    color: '#00C48C', icon: 'business-outline',
    totalReceived: 0, totalExpenses: 25000, outstanding: 0,
    notes: '4 BHK, garden, 2 car parking',
  },
  {
    id: 'p4', name: 'Andheri Office Space', type: 'office',
    address: 'Unit 506, Infinity Tower, Andheri East', city: 'Mumbai',
    purchasePrice: 9500000, purchaseDate: '14 Aug 2021',
    monthlyRent: 75000, tenantName: 'TechCorp Pvt Ltd',
    rentalStartDate: '01 Feb 2024', rentalEndDate: '31 Jan 2026',
    securityDeposit: 225000, status: 'rented', dueDay: 7,
    color: '#7C4DFF', icon: 'briefcase-outline',
    totalReceived: 225000, totalExpenses: 15000, outstanding: 0,
    notes: '1200 sq ft, IT park, dedicated server room',
  },
];

// ===== PAYMENTS (for p1) =====
export const DUMMY_PAYMENTS: RentPayment[] = [
  { id: 'rp1', propertyId: 'p1', month: 'May 2024', amount: 32000, date: '05 May 2024', mode: 'UPI', status: 'paid', tenantName: 'Rahul Sharma' },
  { id: 'rp2', propertyId: 'p1', month: 'Apr 2024', amount: 32000, date: '04 Apr 2024', mode: 'NEFT', status: 'paid', tenantName: 'Rahul Sharma' },
  { id: 'rp3', propertyId: 'p1', month: 'Mar 2024', amount: 32000, date: '06 Mar 2024', mode: 'UPI', status: 'paid', tenantName: 'Rahul Sharma' },
  { id: 'rp4', propertyId: 'p1', month: 'Feb 2024', amount: 32000, date: '07 Feb 2024', mode: 'Cash', status: 'late', tenantName: 'Rahul Sharma' },
  { id: 'rp5', propertyId: 'p2', month: 'May 2024', amount: 45000, date: '', mode: 'UPI', status: 'pending', tenantName: 'Meera Patel' },
  { id: 'rp6', propertyId: 'p4', month: 'May 2024', amount: 75000, date: '07 May 2024', mode: 'NEFT', status: 'paid', tenantName: 'TechCorp Pvt Ltd' },
  { id: 'rp7', propertyId: 'p4', month: 'Apr 2024', amount: 75000, date: '07 Apr 2024', mode: 'NEFT', status: 'paid', tenantName: 'TechCorp Pvt Ltd' },
];

// ===== EXPENSES (for p1) =====
export const DUMMY_EXPENSES: RentalExpense[] = [
  { id: 'e1', propertyId: 'p1', title: 'Society Maintenance', category: 'society', amount: 3500, date: '01 May 2024', notes: 'Monthly society charges' },
  { id: 'e2', propertyId: 'p1', title: 'Plumbing Repair', category: 'repair', amount: 2800, date: '15 Apr 2024', notes: 'Kitchen sink repair' },
  { id: 'e3', propertyId: 'p1', title: 'Property Tax Q1', category: 'tax', amount: 5050, date: '10 Apr 2024', notes: 'Q1 2024 property tax' },
  { id: 'e4', propertyId: 'p1', title: 'Painting Work', category: 'maintenance', amount: 8500, date: '01 Feb 2024', notes: 'Full apartment painting' },
  { id: 'e5', propertyId: 'p2', title: 'Shop Maintenance', category: 'maintenance', amount: 2000, date: '10 May 2024', notes: '' },
  { id: 'e6', propertyId: 'p3', title: 'Garden Maintenance', category: 'maintenance', amount: 5000, date: '05 May 2024', notes: 'Monthly gardening' },
  { id: 'e7', propertyId: 'p3', title: 'Security Guard', category: 'utility', amount: 8000, date: '01 May 2024', notes: '' },
  { id: 'e8', propertyId: 'p3', title: 'Electricity Bill', category: 'utility', amount: 4500, date: '20 Apr 2024', notes: '' },
  { id: 'e9', propertyId: 'p4', title: 'AC Service', category: 'maintenance', amount: 6000, date: '12 Apr 2024', notes: '4 units serviced' },
  { id: 'e10', propertyId: 'p4', title: 'Property Insurance', category: 'insurance', amount: 9000, date: '01 Mar 2024', notes: 'Annual premium' },
];

// ===== TIMELINE (for p1) =====
export const DUMMY_TIMELINE: TimelineEvent[] = [
  { id: 't1', propertyId: 'p1', type: 'payment', title: 'Rent Received – May 2024', date: '05 May 2024', amount: 32000, notes: 'UPI transfer' },
  { id: 't2', propertyId: 'p1', type: 'expense', title: 'Society Charges Paid', date: '01 May 2024', amount: 3500, notes: '' },
  { id: 't3', propertyId: 'p1', type: 'payment', title: 'Rent Received – Apr 2024', date: '04 Apr 2024', amount: 32000, notes: 'NEFT transfer' },
  { id: 't4', propertyId: 'p1', type: 'expense', title: 'Plumbing Repair', date: '15 Apr 2024', amount: 2800, notes: 'Kitchen sink' },
  { id: 't5', propertyId: 'p1', type: 'expense', title: 'Property Tax Q1', date: '10 Apr 2024', amount: 5050, notes: '' },
  { id: 't6', propertyId: 'p1', type: 'payment', title: 'Rent Received – Mar 2024', date: '06 Mar 2024', amount: 32000, notes: '' },
  { id: 't7', propertyId: 'p1', type: 'agreement', title: 'Lease Agreement Signed', date: '01 Apr 2024', notes: '12-month lease with Rahul Sharma' },
  { id: 't8', propertyId: 'p1', type: 'inspection', title: 'Property Inspection', date: '28 Mar 2024', notes: 'Pre-rental condition check' },
  { id: 't9', propertyId: 'p1', type: 'maintenance', title: 'Full Apartment Painting', date: '01 Feb 2024', amount: 8500, notes: '' },
  { id: 't10', propertyId: 'p1', type: 'tenant_change', title: 'New Tenant Move-in', date: '01 Apr 2024', notes: 'Rahul Sharma, family of 3' },
];

// ===== REMINDERS =====
export const DUMMY_REMINDERS: PropertyReminder[] = [
  { id: 'r1', propertyId: 'p1', type: 'rent_due', title: 'Rent Due – Nerul Apartment', dueDate: '05 Jun 2024', daysLeft: 7, repeat: 'monthly' },
  { id: 'r2', propertyId: 'p2', type: 'rent_due', title: 'Kharghar Shop – Rent Pending', dueDate: '01 Jun 2024', daysLeft: 3, repeat: 'monthly' },
  { id: 'r3', propertyId: 'p1', type: 'maintenance', title: 'Nerul – AC Servicing Due', dueDate: '15 Jun 2024', daysLeft: 17, repeat: 'quarterly' },
  { id: 'r4', propertyId: 'p4', type: 'agreement_renewal', title: 'Office – Agreement Expires', dueDate: '31 Jan 2026', daysLeft: 245, repeat: 'one_time' },
  { id: 'r5', propertyId: 'p3', type: 'tax', title: 'Pune Villa – Property Tax Q2', dueDate: '30 Jun 2024', daysLeft: 32, repeat: 'quarterly' },
];

// ===== ANALYTICS =====
export const MONTHLY_BARS: MonthlyBar[] = [
  { month: 'Dec', income: 107000, expense: 12000 },
  { month: 'Jan', income: 107000, expense: 18500 },
  { month: 'Feb', income: 107000, expense: 22300 },
  { month: 'Mar', income: 139000, expense: 14800 },
  { month: 'Apr', income: 139000, expense: 28000 },
  { month: 'May', income: 107000, expense: 16500 },
];

export const EXPENSE_CAT_COLORS: Record<string, string> = {
  maintenance: '#FF9100',
  tax: '#FF5252',
  repair: '#7C4DFF',
  utility: '#00BCD4',
  society: '#448AFF',
  insurance: '#00C48C',
  other: '#607D8B',
};

export const EXPENSE_CAT_ICONS: Record<string, string> = {
  maintenance: 'construct-outline',
  tax: 'document-text-outline',
  repair: 'hammer-outline',
  utility: 'flash-outline',
  society: 'people-outline',
  insurance: 'shield-outline',
  other: 'ellipsis-horizontal-outline',
};

export const TIMELINE_COLORS: Record<string, string> = {
  payment: '#00C48C',
  expense: '#FF5252',
  tenant_change: '#448AFF',
  agreement: '#7C4DFF',
  inspection: '#FFB300',
  maintenance: '#FF9100',
};

export const TIMELINE_ICONS: Record<string, string> = {
  payment: 'cash-outline',
  expense: 'receipt-outline',
  tenant_change: 'person-outline',
  agreement: 'document-outline',
  inspection: 'search-outline',
  maintenance: 'construct-outline',
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: 'Apartment', shop: 'Commercial Shop', villa: 'Villa',
  office: 'Office Space', flat: 'Flat', plot: 'Plot',
};
