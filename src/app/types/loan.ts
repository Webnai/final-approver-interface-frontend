export type LoanStatus = 
  | 'Unassigned'
  | 'In Progress'
  | 'On Hold'
  | 'Completed'
  | 'Action Required';

export type Priority = 'Normal' | 'Urgent' | 'High Value';

export interface Checklist {
  idVerified: boolean;
  collateralSigned: boolean;
  sanctionsCheckCleared: boolean;
  creditScoreVerified: boolean;
  kycCompleted: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
  mentionedUser?: string;
}

export interface LoanRecord {
  id: string;
  loanId: string;
  beneficiaryName: string;
  accountNumber: string;
  bankCode: string;
  amount: number;
  status: LoanStatus;
  priority: Priority;
  checklist: Checklist;
  approverName: string;
  approverId: string;
  assignedOfficer?: string;
  assignedOfficerId?: string;
  createdAt: Date;
  claimedAt?: Date;
  completedAt?: Date;
  transactionReference?: string;
  comments: Comment[];
  documentUrl?: string;
}

export type UserRole = 'Final Approver' | 'Disbursement Officer' | 'Supervisor';

export interface User {
  id: string;
  name: string;
  role: UserRole;
}
