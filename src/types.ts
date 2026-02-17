
export enum UserRole {
  NEXUS_ADMIN = 'NEXUS_ADMIN',
  ACCOUNT_ADMIN = 'ACCOUNT_ADMIN',
  USER = 'USER',
}

export type VisibilityLevel = 'private' | 'team' | 'public';

export interface Account {
  id: string;
  companyName: string;
  ownerName: string;
  email: string;
  status: 'active' | 'suspended';
  plan: 'trial' | 'pro' | 'enterprise';
  expiresAt: string;
  createdAt: string;
  visibilityConfig: {
    level: VisibilityLevel;
    allowUserExport: boolean;
    showTeamGoals: boolean;
  };
}

export interface User {
  id: string;
  accountId?: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  avatar: string;
  teamId?: string;
  status: 'active' | 'pending' | 'inactive';
  joinedAt?: string;
  lastLogin?: string;
}

export interface Webhook {
  id: string;
  accountId: string;
  name: string;
  funnelId: string;
  stageId: string;
  active: boolean;
  createdAt: string;
}

export interface Team {
  id: string;
  accountId: string;
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
  accountId: string;
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
  accountId: string;
  name: string;
  type: CustomFieldType;
  context: CustomFieldContext;
  options?: CustomFieldOption[];
  funnelId: string;
  visibleStageIds: string[];
}

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
  createdAt: string;
  notes: Note[];
  tasks: Task[];
  tags: string[];
  probability: number;
  customValues?: Record<string, any>;
}

export interface KnowledgeSource {
  id: string;
  name: string;
  type: string;
}

export interface BotInstance {
  id: string;
  name: string;
  status: string;
}
