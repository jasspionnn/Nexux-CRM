
import { Funnel, Lead, Team, User, UserRole } from "./types";

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Ricardo Silva', email: 'ricardo@nexus.com', role: UserRole.ADMIN, avatar: 'https://picsum.photos/id/1005/50/50' },
  { id: 'u2', name: 'Ana Souza', email: 'ana@nexus.com', role: UserRole.MANAGER, teamId: 't1', avatar: 'https://picsum.photos/id/1011/50/50' },
  { id: 'u3', name: 'Carlos Lima', email: 'carlos@nexus.com', role: UserRole.SALES, teamId: 't1', avatar: 'https://picsum.photos/id/1012/50/50' },
];

export const MOCK_TEAMS: Team[] = [
  { id: 't1', name: 'Alpha Sales', goal: 500000 },
  { id: 't2', name: 'Enterprise', goal: 1200000 },
];

export const INITIAL_FUNNELS: Funnel[] = [
  {
    id: 'f1',
    name: 'Vendas Inbound',
    stages: [
      { id: 's1', name: 'Novo Lead', color: 'bg-gray-100 border-gray-300', order: 0 },
      { id: 's2', name: 'Qualificação', color: 'bg-blue-50 border-blue-200', order: 1 },
      { id: 's3', name: 'Proposta Enviada', color: 'bg-yellow-50 border-yellow-200', order: 2 },
      { id: 's4', name: 'Negociação', color: 'bg-orange-50 border-orange-200', order: 3 },
      { id: 's5', name: 'Fechado Ganho', color: 'bg-green-50 border-green-200', order: 4 },
    ]
  },
  {
    id: 'f2',
    name: 'Parcerias',
    stages: [
      { id: 'p1', name: 'Prospecção', color: 'bg-gray-100 border-gray-300', order: 0 },
      { id: 'p2', name: 'Reunião Agendada', color: 'bg-indigo-50 border-indigo-200', order: 1 },
      { id: 'p3', name: 'Contrato', color: 'bg-purple-50 border-purple-200', order: 2 },
    ]
  }
];

export const MOCK_LEADS: Lead[] = [
  {
    id: 'l1',
    title: 'Implantação ERP',
    company: 'TechSolutions Ltda',
    value: 15000,
    contactName: 'João Tech',
    contactEmail: 'joao@techsolutions.com',
    contactPhone: '11 99999-9999',
    funnelId: 'f1',
    stageId: 's2',
    assignedUserId: 'u2',
    createdAt: new Date().toISOString(),
    tags: ['Quente', 'Software'],
    probability: 40,
    notes: [{ id: 'n1', content: 'Interessado no módulo financeiro.', createdAt: new Date().toISOString(), authorName: 'Ana Souza' }],
    tasks: [
      { id: 't1', title: 'Agendar call de demonstração', dueDate: new Date(Date.now() + 86400000).toISOString(), completed: false, type: 'call' }
    ]
  },
  {
    id: 'l2',
    title: 'Consultoria Marketing',
    company: 'Varejo Rápido',
    value: 5000,
    contactName: 'Maria Varejo',
    contactEmail: 'maria@varejo.com',
    contactPhone: '11 88888-8888',
    funnelId: 'f1',
    stageId: 's1',
    assignedUserId: 'u3',
    createdAt: new Date().toISOString(),
    tags: ['Inbound'],
    probability: 10,
    notes: [],
    tasks: []
  },
  {
    id: 'l3',
    title: 'Licença Anual Enterprise',
    company: 'Banco Futuro',
    value: 120000,
    contactName: 'Roberto Finance',
    contactEmail: 'roberto@bancofuturo.com',
    contactPhone: '11 77777-7777',
    funnelId: 'f1',
    stageId: 's4',
    assignedUserId: 'u2',
    createdAt: new Date().toISOString(),
    tags: ['Enterprise', 'Urgente'],
    probability: 80,
    notes: [],
    tasks: []
  },
  {
    id: 'l4',
    title: 'Parceria de Revenda',
    company: 'Consultoria XYZ',
    value: 0,
    contactName: 'Sandra XYZ',
    contactEmail: 'sandra@xyz.com',
    contactPhone: '21 99999-1111',
    funnelId: 'f2',
    stageId: 'p2',
    assignedUserId: 'u1',
    createdAt: new Date().toISOString(),
    tags: ['Parceiro'],
    probability: 50,
    notes: [],
    tasks: []
  }
];
