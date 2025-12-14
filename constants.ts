
import { Account, Funnel, Lead, Team, User, UserRole } from "./types";

// 1. ACCOUNTS (Tenants)
export const MOCK_ACCOUNTS: Account[] = [
  {
    id: 'acc_1',
    companyName: 'TechSolutions Corp',
    ownerName: 'Ricardo Silva',
    email: 'ricardo@techsolutions.com',
    status: 'active',
    plan: 'enterprise',
    expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    id: 'acc_2',
    companyName: 'Varejo Rápido Ltda',
    ownerName: 'Ana Souza',
    email: 'ana@varejo.com',
    status: 'suspended', // Example of suspended account
    plan: 'pro',
    expiresAt: new Date().toISOString(), // Expired
    createdAt: new Date().toISOString()
  }
];

// 2. USERS
export const MOCK_USERS: User[] = [
  // --- SUPER ADMIN ---
  { 
    id: 'nexus-admin', 
    name: 'Super Admin Nexus', 
    email: 'adminnexus@nexus.com', 
    password: '123', 
    role: UserRole.NEXUS_ADMIN, 
    avatar: 'https://ui-avatars.com/api/?name=Nexus+Admin&background=000&color=fff',
    status: 'active',
  },
  
  // --- ACCOUNT 1 (TechSolutions) ---
  { 
    id: 'u1', 
    accountId: 'acc_1',
    name: 'Ricardo Silva', 
    email: 'ricardo@techsolutions.com', 
    password: '123',
    role: UserRole.ACCOUNT_ADMIN, // Conta Mãe
    avatar: 'https://ui-avatars.com/api/?name=Ricardo+Silva&background=0D8ABC&color=fff',
    status: 'active',
    joinedAt: new Date().toISOString()
  },
  { 
    id: 'u2', 
    accountId: 'acc_1',
    name: 'Carlos Vendedor', 
    email: 'carlos@techsolutions.com', 
    role: UserRole.USER, // Vendedor
    teamId: 't1', 
    avatar: 'https://ui-avatars.com/api/?name=Carlos+V&background=random',
    status: 'active',
    joinedAt: new Date().toISOString()
  },

  // --- ACCOUNT 2 (Varejo Rápido) ---
  { 
    id: 'u3', 
    accountId: 'acc_2',
    name: 'Ana Souza', 
    email: 'ana@varejo.com', 
    password: '123',
    role: UserRole.ACCOUNT_ADMIN, // Conta Mãe
    avatar: 'https://ui-avatars.com/api/?name=Ana+Souza&background=purple&color=fff',
    status: 'active',
    joinedAt: new Date().toISOString()
  },
];

// 3. TEAMS (Linked to Account)
export const MOCK_TEAMS: Team[] = [
  { id: 't1', accountId: 'acc_1', name: 'Vendas Internas', goal: 500000 },
  { id: 't2', accountId: 'acc_2', name: 'Comercial', goal: 10000 },
];

// 4. FUNNELS (Linked to Account)
export const INITIAL_FUNNELS: Funnel[] = [
  // Funnel for Account 1
  {
    id: 'f1',
    accountId: 'acc_1',
    name: 'Vendas Enterprise',
    stages: [
      { id: 's1', name: 'Novo Lead', color: 'bg-gray-100 border-gray-300', order: 0 },
      { id: 's2', name: 'Qualificação', color: 'bg-blue-50 border-blue-200', order: 1 },
      { id: 's3', name: 'Fechamento', color: 'bg-green-50 border-green-200', order: 2 },
    ]
  },
  // Funnel for Account 2
  {
    id: 'f2',
    accountId: 'acc_2',
    name: 'Vendas Balcão',
    stages: [
      { id: 's2_1', name: 'Interesse', color: 'bg-gray-100 border-gray-300', order: 0 },
      { id: 's2_2', name: 'Pago', color: 'bg-green-50 border-green-200', order: 1 },
    ]
  }
];

// 5. LEADS (Linked to Account)
export const MOCK_LEADS: Lead[] = [
  {
    id: 'l1',
    accountId: 'acc_1',
    title: 'Projeto Cloud',
    company: 'Big Bank SA',
    value: 150000,
    contactName: 'Diretor TI',
    contactEmail: 'ti@bigbank.com',
    contactPhone: '11 99999-9999',
    funnelId: 'f1',
    stageId: 's2',
    assignedUserId: 'u2', // Carlos
    createdAt: new Date().toISOString(),
    tags: ['Cloud'],
    probability: 60,
    notes: [],
    tasks: []
  },
  {
    id: 'l2',
    accountId: 'acc_2',
    title: 'Compra de Estoque',
    company: 'Loja da Esquina',
    value: 5000,
    contactName: 'Sr. José',
    contactEmail: 'jose@loja.com',
    contactPhone: '11 88888-8888',
    funnelId: 'f2',
    stageId: 's2_1',
    assignedUserId: 'u3', // Ana
    createdAt: new Date().toISOString(),
    tags: [],
    probability: 20,
    notes: [],
    tasks: []
  }
];
