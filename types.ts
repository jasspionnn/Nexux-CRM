
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  SALES = 'SALES',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  teamId?: string;
}

export interface Team {
  id: string;
  name: string;
  goal: number; // Monthly revenue goal
}

export interface Stage {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface Funnel {
  id: string;
  name: string;
  stages: Stage[];
  defaultWonStageId?: string; // Stage to move to when won
  defaultLostStageId?: string; // Stage to move to when lost
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
  dueDate: string; // ISO date string
  completed: boolean;
  type: 'call' | 'email' | 'meeting' | 'todo';
}

// Custom Fields Types
export type CustomFieldType = 'text' | 'select' | 'multiselect';
export type CustomFieldContext = 'lead_detail' | 'lost_reason';

export interface CustomFieldOption {
  id: string;
  label: string;
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: CustomFieldType;
  context: CustomFieldContext; // New property to distinguish standard fields vs lost reason fields
  options?: CustomFieldOption[]; // Only for select/multiselect
  funnelId: string; // The funnel this field belongs to
  visibleStageIds: string[]; // Empty means all stages, otherwise specific stages
}

export interface Lead {
  id: string;
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
  tasks: Task[]; // New field
  tags: string[];
  probability: number; // 0-100
  customValues?: Record<string, any>; // Key: customFieldId, Value: string | string[]
}

export interface DashboardStats {
  totalRevenue: number;
  dealsWon: number;
  conversionRate: number;
  avgDealSize: number;
}
