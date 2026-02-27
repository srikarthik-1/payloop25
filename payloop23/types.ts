
export interface TransactionHistory {
  date: string;
  bill: number; // Original bill amount before discount
  discountPercentage?: number;
  finalBill: number; // Bill amount after discount
  pointsUsed?: number;
  points: number; // Points earned on this transaction
}

export interface Customer {
  mobile: string;
  name:string;
  pin: string;
  points: number;
  totalSpent: number;
  history: TransactionHistory[];
}

export type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export interface TierThreshold {
  minSpend: number;
  minPoints: number;
}

export interface TierSettings {
  bronze: TierThreshold;
  silver: TierThreshold;
  gold: TierThreshold;
  platinum: TierThreshold;
}

export interface DiscountSettings {
  bronze: number;
  silver: number;
  gold: number;
  platinum: number;
}

export interface DeadlineSettings {
  bronze: number;
  silver: number;
  gold: number;
  platinum: number;
}

export interface Admin {
  businessName: string;
  username: string;
  password: string;
}

export interface SmsLog {
  timestamp: string;
  recipientMobile: string;
  recipientName: string;
  message: string;
}

export interface LastTransactionDetails {
  customerName: string;
  businessName: string;
  finalBill: number;
  pointsUsed: number;
  pointsEarned: number;
  newTotalPoints: number;
  deadlineDays: number | null;
}