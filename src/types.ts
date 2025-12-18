/* ======================================================
   NEXUS CRM — ENTERPRISE TYPES
   Single Account (prepared for future multi-account)
====================================================== */

/* =========================
   CORE ENUMS
========================= */

export enum UserRole {
  NEXUS_ADMIN = 'NEXUS_ADMIN',        // Super Admin Nexus
  ACCOUNT_ADMIN = 'ACCOUNT_ADMIN',    // Dono da empresa
  MANAGER = 'MANAGER',                // Gestor de time
  USER = 'USER',                      // Vendedor
}

export enum EntityStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
}

export enum DealOutcome {
  WON = 'WON',
  LOST = 'LOST',
  OPEN = 'OPEN',
}

/* =========================
   ACCOUNT (SINGLE ACCOUNT MODE)
========================= */

export interface Account {
  id: string;
  companyName: string;
  ownerName: string;
  email: string;
  status: EntityStatus;
  plan: 'trial' | 'pro' | 'enterprise';
  expiresAt: string; // ISO
  createdAt: string;

  // Billing (future-proof)
  stripeCustomerId?: string;
  subscriptionStatus?: 'active' | 'past_due' | 'canceled' | 'trialing';
}

/* =========================
   USER & HIERARCHY
========================= */

export interface User {
  id: string;
  accountId?: string; // optional for Nexus Admin
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  teamId?: string;
  status: EntityStatus;
  joinedAt?: string;
}

/* =========================
   TEAM
========================= */

export interface Team {
  id: string;
  accountId: string;
  name: string;
  goal: number;
}

/* =========================
   FUNNEL & STAGES
========================= */

export interface Stage {
  id: string;
  name: string;
  color: string;
  order: number;
  outcome?: DealOutcome; // WON | LOST | OPEN
}

export interface Funnel {
  id: string;
  accountId: string;
  name: string;
  stages: Stage[];
  defaultWonStageId?: string;
  defaultLostStageId?: string;
}

/* =========================
   NOTES & TASKS
========================= */

export interface Note {
  id: string;
  content: string;
  createdAt: string;
  authorName: string;
}

export interface Task {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
  type: 'call' | 'email' | 'meeting' | 'todo';
}

/* =========================
   CUSTOM FIELDS (ENTERPRISE)
========================= */

export type CustomFieldType = 'text' | 'select' | 'multiselect';
export type CustomFieldContext = 'lead_detail' | 'lost_reason';

export interface CustomFieldOption {
  id: string;
  label: string;
}

export interface CustomFieldDefinition {
  id: string;
  accountId: string;
  name: string;
  type: CustomFieldType;
  context: CustomFieldContext;
  options?: CustomFieldOption[];
  funnelId: string;
  visibleStageIds: string[];
}

/* =========================
   LEAD (CORE CRM ENTITY)
========================= */

export interface Lead {
  id: string;
  accountId: string;

  title: string;
  company: string;
  value: number;

  contactName: string;
  contactEmail: string;
  contactPhone: string;

  funnelId: string;
  stageId: string;
  assignedUserId: string;

  probability: number; // 0–100
  outcome?: DealOutcome;

  tags: string[];
  notes: Note[];
  tasks: Task[];

  customValues?: Record<string, any>;

  createdAt: string;
}

/* =========================
   DASHBOARD & ANALYTICS
========================= */

export interface DashboardKPIs {
  totalRevenue: number;
  pipelineValue: number;
  dealsWon: number;
  dealsLost: number;
  openDeals: number;
  winRate: number;
  avgDealSize: number;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface FunnelStageMetric {
  stageId: string;
  stageName: string;
  count: number;
  value: number;
  conversionFromPrevious?: number;
}

/* =========================
   GLOBAL FILTERS (ENTERPRISE)
========================= */

export interface GlobalFilters {
  dateRange: {
    from: string | null;
    to: string | null;
  };
  funnelId?: string;
  teamId?: string;
  userId?: string;
  tags?: string[];
  minValue?: number;
  maxValue?: number;
  outcome?: DealOutcome;
}
