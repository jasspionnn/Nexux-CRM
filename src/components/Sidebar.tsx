import React from 'react';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Target,
  BarChart3,
  Settings,
  Layers,
  ClipboardList,
  Sliders,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    title: 'Sales',
    items: [
      {
        label: 'Visão Geral',
        path: '/dashboard',
        icon: LayoutDashboard,
      },
      {
        label: 'Leads',
        path: '/leads',
        icon: Briefcase,
      },
      {
        label: 'Funis',
        path: '/funnels',
        icon: Layers,
      },
      {
        label: 'Metas',
        path: '/goals',
        icon: Target,
      },
    ],
  },
  {
    title: 'Operations',
    items: [
      {
        label: 'Times',
        path: '/teams',
        icon: Users,
      },
      {
        label: 'Atividades',
        path: '/activities',
        icon: ClipboardList,
      },
    ],
  },
  {
    title: 'Insights',
    items: [
      {
        label: 'Relatórios',
        path: '/reports',
        icon: BarChart3,
      },
    ],
  },
  {
    title: 'Admin',
    items: [
      {
        label: 'Configurações',
        path: '/settings',
        icon: Settings,
      },
      {
        label: 'Campos Customizados',
        path: '/custom-fields',
        icon: Sliders,
      },
    ],
  },
];

export const Sidebar = () => {
  return (
    <aside className="w-64 bg-gray-900 text-gray-100 h-screen flex flex-col border-r border-gray-800">

      {/* BRAND */}
      <div className="px-6 py-5 border-b border-gray-800">
        <h2 className="text-lg font-bold tracking-tight">
          Nexus CRM
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Enterprise Platform
        </p>
      </div>

      {/* NAV */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">

        {sections.map(section => (
          <div key={section.title}>
            <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {section.title}
            </p>

            <ul className="space-y-1">
              {section.items.map(item => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `
                      flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition
                      ${
                        isActive
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/60'
                      }
                      `
                    }
                  >
                    <item.icon size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}

      </nav>

      {/* FOOTER / CONTEXT */}
      <div className="px-6 py-4 border-t border-gray-800 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          Conta ativa
        </div>
        <div className="mt-1">
          Plano: Enterprise
        </div>
      </div>

    </aside>
  );
};
