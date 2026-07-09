export enum UserRole {
  NEXUS_ADMIN = 'NEXUS_ADMIN',
  ACCOUNT_ADMIN = 'ACCOUNT_ADMIN',
  USER = 'USER',
  MANAGER = 'MANAGER'
}

export interface User {
  id: string;
  account_id?: string;
  name: string;
  email: string;
  role: UserRole;
  status?: string;
  team_id?: string | null;
  avatar?: string | null;
}

export interface Account {
  id: string;
  company_name: string;
  owner_name: string | null;
  email: string;
  status: string;
  plan: string;
  expires_at: string | null;
  created_at: string;
}

export interface Stage {
  id: string;
  funnel_id: string;
  name: string;
  color: string | null;
  colorOpacity?: string;
  borderOpacity?: string;
  order: number;
}

export interface Funnel {
  id: string;
  account_id: string;
  name: string;
  default_won_stage_id: string | null;
  default_lost_stage_id: string | null;
  stages?: Stage[];
}

export interface Lead {
  id: string;
  account_id: string;
  title: string;
  company: string | null;
  value: number;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  funnel_id: string;
  stage_id: string;
  assigned_user_id: string | null;
  probability: number;
  tags: string | null;
  custom_values: string | null;
  score_profile: number;
  score_interest: number;
  score_grade: string;
  source: string;
  created_at: string;
  last_contact_at: string | null;
  next_task_at: string | null;
  closed_at: string | null;
  closing_forecast_at: string | null;
}

export interface Task {
  id: string;
  lead_id: string;
  title: string;
  due_date: string | null;
  completed: 0 | 1;
  type: string | null;
  lead_title?: string;
}

export interface Note {
  id: string;
  lead_id: string;
  content: string;
  author_name: string;
  created_at: string;
}

export interface Team {
  id: string;
  account_id: string;
  name: string;
  goal: number | null;
  permissions?: string;
}

export interface CustomField {
  id: string;
  account_id: string;
  name: string;
  type: string;
  context: string | null;
  funnel_id: string | null;
  options: string | null;
  visible_stage_ids: string | null;
}

export interface Webhook {
  id: string;
  account_id: string;
  name: string;
  url: string;
  events: string;
  active: boolean;
  funnel_id: string | null;
  stage_id: string | null;
}

export interface BioLinkItem {
  label: string;
  url: string;
  icon?: string;
}

export interface BioLink {
  id: string;
  account_id: string;
  slug: string;
  title: string;
  description: string | null;
  avatar_url: string | null;
  bg_color: string;
  text_color: string;
  button_color: string;
  button_text_color: string;
  button_radius: number;
  links: BioLinkItem[];
  is_active: 0 | 1;
  click_count: number;
  created_at: string;
  updated_at: string;
}

export interface PerformanceItem {
  id: string;
  type: string;
  name: string;
  description: string | null;
  thumb_url: string | null;
  cta_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}
