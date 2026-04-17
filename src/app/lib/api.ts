import { signOut } from 'firebase/auth';
import { auth } from '@/app/lib/firebase';
import type { Checklist, Comment, LoanRecord, LoanStatus, Priority, User, UserRole } from '@/app/types/loan';

const DEFAULT_LOCAL_API_BASE_URL = 'http://localhost:3000';
const DEFAULT_PRODUCTION_API_BASE_URL = 'https://final-approver-interface-backend.onrender.com';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() ||
  (import.meta.env.PROD ? DEFAULT_PRODUCTION_API_BASE_URL : DEFAULT_LOCAL_API_BASE_URL);

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export type LoanQueueFilter = 'all' | 'unassigned' | 'mine' | 'action-required' | 'in-progress' | 'on-hold' | 'completed';

export interface BackendUserProfile {
  id?: string;
  uid?: string;
  email?: string;
  name?: string;
  displayName?: string;
  role?: string;
}

export interface DashboardMetricsData {
  totalPendingAmount: number;
  averageTurnaroundHours: number;
  staleApplications: number;
  processingToday: number;
  completedToday: number;
  totalCompletedValue: number;
}

export interface SupervisorCapacityOfficer {
  name: string;
  activeLoans: number;
  totalValue: number;
  averageAgeHours: number;
  isStale: boolean;
}

export interface SupervisorCapacityData {
  activeOfficers: number;
  totalPending: number;
  unassigned: number;
  averageProcessingHours: number;
  officers: SupervisorCapacityOfficer[];
}

export interface LoanStatusBreadcrumb {
  id: string;
  label: string;
  status: LoanStatus;
  timestamp: Date;
  actor?: string;
  note?: string;
}

export interface LoanInstructionPayload {
  loanId: string;
  beneficiaryName: string;
  accountNumber: string;
  bankCode: string;
  amount: number;
  priority: Priority;
  checklist: Checklist;
  approverName: string;
  approverId: string;
}

function joinUrl(path: string) {
  return `${API_BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

function buildQueryString(query?: Record<string, string | number | boolean | undefined>) {
  if (!query) {
    return '';
  }

  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    params.set(key, String(value));
  });

  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

async function getFirebaseIdToken() {
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    return null;
  }

  return currentUser.getIdToken();
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'y'].includes(value.toLowerCase().trim());
  }

  return Boolean(value);
}

function parseDate(value: unknown) {
  if (!value) {
    return new Date();
  }

  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function normalizeRole(value: unknown): UserRole {
  const normalized = String(value ?? '').toLowerCase();

  if (normalized.includes('supervisor')) {
    return 'Supervisor';
  }

  if (normalized.includes('disbursement') || normalized.includes('officer')) {
    return 'Disbursement Officer';
  }

  return 'Final Approver';
}

function normalizePriority(value: unknown): Priority {
  const normalized = String(value ?? '').toLowerCase();

  if (normalized.includes('urgent')) {
    return 'Urgent';
  }

  if (normalized.includes('high')) {
    return 'High Value';
  }

  return 'Normal';
}

function normalizeStatus(value: unknown): LoanStatus {
  const normalized = String(value ?? '').toLowerCase().replace(/[\s_-]/g, '');

  if (normalized.includes('actionrequired')) {
    return 'Action Required';
  }

  if (normalized.includes('onhold')) {
    return 'On Hold';
  }

  if (normalized.includes('completed')) {
    return 'Completed';
  }

  if (normalized.includes('progress')) {
    return 'In Progress';
  }

  return 'Unassigned';
}

function unwrapCollection<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const candidateKeys = ['data', 'items', 'results', 'loans', 'queue', 'records'];

  for (const key of candidateKeys) {
    const candidate = record[key];
    if (Array.isArray(candidate)) {
      return candidate as T[];
    }
  }

  return [];
}

function normalizeChecklist(raw: Record<string, unknown> | undefined): Checklist {
  const rawChecklist = raw?.checklist && typeof raw.checklist === 'object' ? (raw.checklist as Record<string, unknown>) : undefined;
  const checklistSource = rawChecklist ?? raw ?? {};

  return {
    idVerified: toBoolean(checklistSource.idVerified ?? checklistSource.id_verified ?? raw?.idVerified),
    collateralSigned: toBoolean(checklistSource.collateralSigned ?? checklistSource.collateral_signed ?? raw?.collateralSigned),
    sanctionsCheckCleared: toBoolean(checklistSource.sanctionsCheckCleared ?? checklistSource.sanctions_check_cleared ?? raw?.sanctionsCheckCleared),
    creditScoreVerified: toBoolean(checklistSource.creditScoreVerified ?? checklistSource.credit_score_verified ?? raw?.creditScoreVerified),
    kycCompleted: toBoolean(checklistSource.kycCompleted ?? checklistSource.kyc_completed ?? raw?.kycCompleted),
  };
}

function normalizeComment(raw: Record<string, unknown>): Comment {
  return {
    id: String(raw.id ?? raw.commentId ?? raw.comment_id ?? crypto.randomUUID()),
    userId: String(raw.userId ?? raw.user_id ?? raw.authorId ?? raw.author_id ?? ''),
    userName: String(raw.userName ?? raw.user_name ?? raw.authorName ?? raw.author_name ?? 'Unknown'),
    message: String(raw.message ?? raw.body ?? raw.comment ?? ''),
    timestamp: parseDate(raw.timestamp ?? raw.createdAt ?? raw.created_at),
    mentionedUser: raw.mentionedUser ? String(raw.mentionedUser) : raw.mentioned_user ? String(raw.mentioned_user) : undefined,
  };
}

export function normalizeLoanRecord(raw: Record<string, unknown>): LoanRecord {
  const comments = unwrapCollection<Record<string, unknown>>(raw.comments ?? raw.commentThreads ?? raw.comment_threads).map(normalizeComment);

  return {
    id: String(raw.id ?? raw.loanId ?? raw.loan_id ?? raw.referenceId ?? raw.reference_id ?? crypto.randomUUID()),
    loanId: String(raw.loanId ?? raw.loan_id ?? raw.referenceId ?? raw.reference_id ?? raw.id ?? ''),
    beneficiaryName: String(raw.beneficiaryName ?? raw.beneficiary_name ?? raw.customerName ?? raw.customer_name ?? ''),
    accountNumber: String(raw.accountNumber ?? raw.account_number ?? raw.account ?? ''),
    bankCode: String(raw.bankCode ?? raw.bank_code ?? raw.swiftCode ?? raw.swift_code ?? ''),
    amount: toNumber(raw.amount ?? raw.disbursementAmount ?? raw.disbursement_amount),
    status: normalizeStatus(raw.status ?? raw.state),
    priority: normalizePriority(raw.priority ?? raw.priorityTag ?? raw.priority_tag),
    checklist: normalizeChecklist(raw),
    approverName: String(raw.approverName ?? raw.approver_name ?? raw.requestedByName ?? raw.requested_by_name ?? ''),
    approverId: String(raw.approverId ?? raw.approver_id ?? raw.requestedById ?? raw.requested_by_id ?? ''),
    assignedOfficer: raw.assignedOfficer ? String(raw.assignedOfficer) : raw.assigned_officer ? String(raw.assigned_officer) : undefined,
    assignedOfficerId: raw.assignedOfficerId ? String(raw.assignedOfficerId) : raw.assigned_officer_id ? String(raw.assigned_officer_id) : undefined,
    createdAt: parseDate(raw.createdAt ?? raw.created_at ?? raw.submittedAt ?? raw.submitted_at),
    claimedAt: raw.claimedAt || raw.claimed_at ? parseDate(raw.claimedAt ?? raw.claimed_at) : undefined,
    completedAt: raw.completedAt || raw.completed_at ? parseDate(raw.completedAt ?? raw.completed_at) : undefined,
    transactionReference: raw.transactionReference ? String(raw.transactionReference) : raw.transaction_reference ? String(raw.transaction_reference) : undefined,
    comments,
    documentUrl: raw.documentUrl ? String(raw.documentUrl) : raw.document_url ? String(raw.document_url) : undefined,
  };
}

export function normalizeUserProfile(raw: BackendUserProfile): User {
  return {
    id: String(raw.id ?? raw.uid ?? raw.email ?? 'current-user'),
    name: String(raw.name ?? raw.displayName ?? raw.email ?? 'Current User'),
    role: normalizeRole(raw.role),
  };
}

function normalizeMetrics(raw: Record<string, unknown>): DashboardMetricsData {
  return {
    totalPendingAmount: toNumber(raw.totalPendingAmount ?? raw.pendingAmount ?? raw.totalPendingDisbursement ?? raw.totalPendingValue),
    averageTurnaroundHours: toNumber(raw.averageTurnaroundHours ?? raw.averageProcessingHours ?? raw.avgTurnaroundHours ?? raw.avgProcessingTimeHours),
    staleApplications: toNumber(raw.staleApplications ?? raw.staleCount ?? raw.staleLoans ?? raw.overdueCount),
    processingToday: toNumber(raw.processingToday ?? raw.processedToday ?? raw.todayCount ?? raw.receivedToday),
    completedToday: toNumber(raw.completedToday ?? raw.totalCompletedToday ?? raw.completedCountToday),
    totalCompletedValue: toNumber(raw.totalCompletedValue ?? raw.completedValue ?? raw.valueProcessed ?? raw.totalDisbursedValue),
  };
}

function normalizeCapacity(raw: Record<string, unknown>): SupervisorCapacityData {
  const officers = unwrapCollection<Record<string, unknown>>(raw.officers ?? raw.capacity ?? raw.items).map((officer) => ({
    name: String(officer.name ?? officer.officerName ?? officer.officer_name ?? ''),
    activeLoans: toNumber(officer.activeLoans ?? officer.active_loans ?? officer.count ?? 0),
    totalValue: toNumber(officer.totalValue ?? officer.total_value ?? officer.value ?? 0),
    averageAgeHours: toNumber(officer.averageAgeHours ?? officer.avgAgeHours ?? officer.avg_age_hours ?? officer.average_age_hours ?? 0),
    isStale: toBoolean(officer.isStale ?? officer.hasStaleApplications ?? officer.has_stale_applications),
  }));

  return {
    activeOfficers: toNumber(raw.activeOfficers ?? raw.active_officers ?? officers.length),
    totalPending: toNumber(raw.totalPending ?? raw.pendingLoans ?? raw.pendingCount ?? raw.total_pending),
    unassigned: toNumber(raw.unassigned ?? raw.unassignedLoans ?? raw.unassigned_count),
    averageProcessingHours: toNumber(raw.averageProcessingHours ?? raw.avgProcessingHours ?? raw.avg_processing_hours),
    officers,
  };
}

function normalizeBreadcrumbs(payload: unknown): LoanStatusBreadcrumb[] {
  return unwrapCollection<Record<string, unknown>>(payload).map((entry) => ({
    id: String(entry.id ?? entry.breadcrumbId ?? entry.breadcrumb_id ?? crypto.randomUUID()),
    label: String(entry.label ?? entry.title ?? entry.name ?? entry.status ?? ''),
    status: normalizeStatus(entry.status ?? entry.state ?? entry.label),
    timestamp: parseDate(entry.timestamp ?? entry.createdAt ?? entry.created_at),
    actor: entry.actor ? String(entry.actor) : entry.actorName ? String(entry.actorName) : entry.actor_name ? String(entry.actor_name) : undefined,
    note: entry.note ? String(entry.note) : entry.message ? String(entry.message) : undefined,
  }));
}

async function requestJson<T>(path: string, options: RequestInit & { query?: Record<string, string | number | boolean | undefined>; requireAuth?: boolean } = {}) {
  const { query, requireAuth = true, headers, ...rest } = options;
  const token = requireAuth ? await getFirebaseIdToken() : null;

  const response = await fetch(`${joinUrl(path)}${buildQueryString(query)}`, {
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
      ...(headers ?? {}),
    },
  });

  if (response.status === 401) {
    if (auth) {
      await signOut(auth);
    }

    throw new ApiError('Unauthorized', 401, null);
  }

  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = await response.text();
    }

    const message = typeof payload === 'string' && payload.trim() ? payload : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return (await response.text()) as T;
  }

  return (await response.json()) as T;
}

export async function fetchCurrentUserProfile() {
  const payload = await requestJson<BackendUserProfile | { data?: BackendUserProfile } | { user?: BackendUserProfile }>('/api/me');
  if (!payload) {
    throw new ApiError('Empty profile response', 500, null);
  }

  const user = (payload as { data?: BackendUserProfile; user?: BackendUserProfile }).data ?? (payload as { user?: BackendUserProfile }).user ?? payload;
  return normalizeUserProfile(user as BackendUserProfile);
}

export async function fetchDashboardMetrics() {
  const payload = await requestJson<Record<string, unknown> | { data?: Record<string, unknown> }>('/api/dashboard/metrics');
  const metrics = (payload as { data?: Record<string, unknown> }).data ?? payload;
  return normalizeMetrics(metrics as Record<string, unknown>);
}

export async function fetchSupervisorCapacity() {
  const payload = await requestJson<Record<string, unknown> | { data?: Record<string, unknown> }>('/api/supervisor/capacity');
  const capacity = (payload as { data?: Record<string, unknown> }).data ?? payload;
  return normalizeCapacity(capacity as Record<string, unknown>);
}

export async function fetchLoanQueue(status: LoanQueueFilter) {
  const payload = await requestJson<unknown>('/api/loans/queue', {
    query: { status },
  });

  return unwrapCollection<Record<string, unknown>>(payload).map(normalizeLoanRecord);
}

export async function submitLoanInstruction(payload: LoanInstructionPayload) {
  const response = await requestJson<unknown>('/api/loans/instructions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (response && typeof response === 'object') {
    const record = (response as { data?: Record<string, unknown>; loan?: Record<string, unknown> }).data ?? (response as { loan?: Record<string, unknown> }).loan ?? response as Record<string, unknown>;
    return normalizeLoanRecord(record);
  }

  return normalizeLoanRecord({
    id: payload.loanId,
    loanId: payload.loanId,
    beneficiaryName: payload.beneficiaryName,
    accountNumber: payload.accountNumber,
    bankCode: payload.bankCode,
    amount: payload.amount,
    priority: payload.priority,
    approverName: payload.approverName,
    approverId: payload.approverId,
    createdAt: new Date().toISOString(),
    status: 'Unassigned',
    checklist: payload.checklist,
    comments: [],
  });
}

export async function claimLoan(loanId: string) {
  await requestJson(`/api/loans/${encodeURIComponent(loanId)}/claim`, {
    method: 'POST',
  });
}

export async function updateLoanInstruction(loanId: string, payload: Partial<LoanInstructionPayload>) {
  await requestJson(`/api/loans/${encodeURIComponent(loanId)}/instruction`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function getLoanPackage(loanId: string) {
  const payload = await requestJson<unknown>(`/api/loans/${encodeURIComponent(loanId)}/package`);
  if (payload && typeof payload === 'object') {
    const record = (payload as { data?: Record<string, unknown>; loan?: Record<string, unknown>; package?: Record<string, unknown> }).data ?? (payload as { loan?: Record<string, unknown>; package?: Record<string, unknown> }).loan ?? (payload as { package?: Record<string, unknown> }).package ?? payload as Record<string, unknown>;
    return normalizeLoanRecord(record);
  }

  throw new ApiError('Unexpected package response', 500, payload);
}

export async function getStatusBreadcrumbs(loanId: string) {
  const payload = await requestJson<unknown>(`/api/loans/${encodeURIComponent(loanId)}/status-breadcrumbs`);
  return normalizeBreadcrumbs(payload);
}

export async function postLoanComment(loanId: string, message: string) {
  await requestJson(`/api/loans/${encodeURIComponent(loanId)}/comments`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export async function returnLoanToApprover(loanId: string, reason: string) {
  await requestJson(`/api/loans/${encodeURIComponent(loanId)}/return`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function putLoanOnHold(loanId: string) {
  await requestJson(`/api/loans/${encodeURIComponent(loanId)}/hold`, {
    method: 'PATCH',
  });
}

export async function completeLoan(loanId: string, transactionReference: string) {
  await requestJson(`/api/loans/${encodeURIComponent(loanId)}/complete`, {
    method: 'POST',
    body: JSON.stringify({ transactionReference }),
  });
}