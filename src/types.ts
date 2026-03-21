export enum UserRole {
  NEXUS_ADMIN = 'NEXUS_ADMIN',
  USER = 'USER',
  MANAGER = 'MANAGER'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
