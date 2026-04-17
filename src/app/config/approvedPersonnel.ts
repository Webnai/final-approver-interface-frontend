import { UserRole } from '@/app/types/loan';

export interface ApprovedPersonnel {
  email: string;
  name: string;
  role: UserRole;
}

// Keep this list aligned with approved internal users.
export const APPROVED_PERSONNEL: ApprovedPersonnel[] = [
  { email: 'wilbertboadzo144@gmail.com', name: 'Wilbert Boadzo', role: 'Final Approver' },
  { email: 'michaelboadzo@gmail.com', name: 'Michael Boadzo', role: 'Final Approver' },
  { email: 'sarah.johnson@bayport.com', name: 'Sarah Johnson', role: 'Final Approver' },
  { email: 'michael.chen@bayport.com', name: 'Michael Chen', role: 'Final Approver' },
  { email: 'emily.davis@bayport.com', name: 'Emily Davis', role: 'Disbursement Officer' },
  { email: 'james.wilson@bayport.com', name: 'James Wilson', role: 'Disbursement Officer' },
  { email: 'lisa.anderson@bayport.com', name: 'Lisa Anderson', role: 'Disbursement Officer' },
  { email: 'robert.martinez@bayport.com', name: 'Robert Martinez', role: 'Supervisor' },
];

export function getApprovedPersonnelByEmail(email?: string | null): ApprovedPersonnel | undefined {
  if (!email) {
    return undefined;
  }

  const normalizedEmail = email.trim().toLowerCase();
  return APPROVED_PERSONNEL.find((person) => person.email.toLowerCase() === normalizedEmail);
}
