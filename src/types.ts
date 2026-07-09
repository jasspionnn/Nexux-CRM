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
}
