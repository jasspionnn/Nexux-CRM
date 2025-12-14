
export enum UserRole {
  NEXUS_ADMIN = 'NEXUS_ADMIN',   // Super Admin (Gere as contas)
  ACCOUNT_ADMIN = 'ACCOUNT_ADMIN', // Conta Mãe (Dono da empresa)
  USER = 'USER',                 // Vendedor (Usuário final)
}

export interface Account {
  id: string;
  companyName: string;
  ownerName: string;
  email: string; // Login email for the account admin
  status: 'active' | 'suspended';
  plan: 'trial' | 'pro' | 'enterprise';
  expiresAt: string; // ISO Date
  createdAt: string;
  // Payment Integration Fields
  stripeCustomerId?: string;
  subscriptionStatus?: 'active' | 'past_due' | 'canceled' | 'trialing';
}

export interface User {
  id: string;
  accountId?: string; // Optional for Nexus Admin, Required for others
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  avatar: string;
  teamId?: string;
  status: 'active' | 'pending' | 'inactive';
  joinedAt?: string;
}

export interface Team {
  id: string;
  accountId: string; // Linked to account
  name: string;
  goal: number;
}

export interface Stage {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface Funnel {
  id: string;
  accountId: string; // Linked to account
  name: string;
  stages: Stage[];
  defaultWonStageId?: string;
  defaultLostStageId?: string;
}

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

export type CustomFieldType = 'text' | 'select' | 'multiselect';
export type CustomFieldContext = 'lead_detail' | 'lost_reason';

export interface CustomFieldOption {
  id: string;
  label: string;
}

export interface CustomFieldDefinition {
  id: string;
  accountId: string; // Linked to account
  name: string;
  type: CustomFieldType;
  context: CustomFieldContext;
  options?: CustomFieldOption[];
  funnelId: string;
  visibleStageIds: string[];
}

export interface Lead {
  id: string;
  accountId: string; // Linked to account
  title: string;
  company: string;
  value: number;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  funnelId: string;
  stageId: string;
  assignedUserId: string;
  createdAt: string;
  notes: Note[];
  tasks: Task[];
  tags: string[];
  probability: number;
  customValues?: Record<string, any>;
}

export interface DashboardStats {
  totalRevenue: number;
  dealsWon: number;
  conversionRate: number;
  avgDealSize: number;
}
