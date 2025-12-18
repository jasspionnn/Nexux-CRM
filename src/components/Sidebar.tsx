
import React from 'react';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Target,
  BarChart3,
  LineChart,
  Layers,
  Settings,
  Shield,
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onChangeView: (view: string) => void;
}

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="mb-6">
    <h4 className="px-4 mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
      {title}
    </h4>
    <div className="space-y-1">{children}</div>
  </div>
);

const Item = ({
  view,
  currentView,
  onChangeView,
  icon: Icon,
  label,
}: {
  view: string;
  currentView: string;
  onChangeView: (view: string) => void;
  icon: any;
  label: string;
}) => (
  <button
    onClick={() => onChangeView(view)}
    className={`
      w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition
      ${
        currentView === view
          ? 'bg-blue-600 text-white shadow-sm'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }
    `}
  >
    <Icon size={18} />
    <span>{label}</span>
  </button>
);

export const Sidebar = ({ currentView, onChangeView }: SidebarProps) => {
  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-200 flex flex-col px-2 py-6">

      {/* LOGO / BRAND */}
      <div className="px-4 mb-8">
        <div className="text-lg font-black text-gray-900 tracking-tight">
          Nexus
        </div>
        <div className="text-[10px] text-gray-500 font-semibold uppercase">
          Enterprise CRM
        </div>
      </div>

      {/* CORE */}
      <Section title="Core">
        <Item view="dashboard" currentView={currentView} onChangeView={onChangeView} icon={LayoutDashboard} label="Visão Geral" />
      </Section>

      {/* SALES */}
      <Section title="Sales Execution">
        <Item view="leads-db" currentView={currentView} onChangeView={onChangeView} icon={Users} label="Leads" />
        <Item view="kanban" currentView={currentView} onChangeView={onChangeView} icon={Briefcase} label="Pipeline" />
        <Item view="tasks" currentView={currentView} onChangeView={onChangeView} icon={Target} label="Tarefas" />
      </Section>

      {/* ANALYTICS */}
      <Section title="Performance & Analytics">
        <Item view="analytics" currentView={currentView} onChangeView={onChangeView} icon={BarChart3} label="Analytics" />
        <Item view="reports" currentView={currentView} onChangeView={onChangeView} icon={LineChart} label="Relatórios" />
        <Item view="forecast" currentView={currentView} onChangeView={onChangeView} icon={Layers} label="Forecast" />
      </Section>

      {/* ADMIN */}
      <Section title="Administração">
        <Item view="settings" currentView={currentView} onChangeView={onChangeView} icon={Settings} label="Configurações" />
        <Item view="permissions" currentView={currentView} onChangeView={onChangeView} icon={Shield} label="Permissões" />
      </Section>

      {/* FOOTER */}
      <div className="mt-auto px-4 pt-6 border-t border-gray-100 text-[10px] text-gray-400">
        Nexus CRM • Enterprise Edition
      </div>
    </aside>
  );
};
