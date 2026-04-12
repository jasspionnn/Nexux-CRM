import React, { useState, useEffect, useRef } from 'react';
import { LayoutGrid, BarChart2, Inbox, CheckSquare, Sparkles, Search, Bell, Settings as SettingsIcon, LogOut, Megaphone, Users, Target, Bot, Eye, Link, Mail, BarChart3, ChevronRight, ChevronDown } from 'lucide-react';
import { useCRM } from '../context/CRMContext';

const MKT_CATEGORIES: Record<string, { sub: string; label: string; icon: React.ElementType }[]> = {
  atracao: [
    { sub: 'tracking', label: 'Tracking', icon: Eye },
    { sub: 'bio-links', label: 'Link na Bio', icon: Link },
  ],
  relacionamento: [
    { sub: 'leads-db', label: 'Base de Leads', icon: Users },
    { sub: 'email-mkt', label: 'Email Mkt', icon: Mail },
  ],
  conversao: [
    { sub: 'segmentation', label: 'Segmentação', icon: Target },
    { sub: 'automations', label: 'Automações', icon: Bot },
  ],
};

export const Header = ({ currentView, onChangeView, appMode, setAppMode }: any) => {
  const { currentUser, logout } = useCRM();
  const [activeSub, setActiveSub] = useState('');
  const [mktCategory, setMktCategory] = useState<string | null>(null);
  const [openCat, setOpenCat] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = () => {
      const m = window.location.hash.match(/#\/marketing\/(\w+)/);
      const sub = m ? m[1] : '';
      setActiveSub(sub);
      if (appMode === 'marketing') {
        const found = Object.entries(MKT_CATEGORIES).find(([, items]) =>
          items.some(i => i.sub === sub)
        );
        setMktCategory(found ? found[0] : null);
      }
    };
    h();
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, [appMode]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpenCat(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const crmItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutGrid },
    { id: 'kanban', label: 'Negociações', icon: BarChart2 },
    { id: 'leads-db', label: 'Contatos', icon: Inbox },
    { id: 'tasks', label: 'Tarefas', icon: CheckSquare },
    { id: 'ai-bot', label: 'AIFlux', icon: Sparkles, color: 'text-indigo-600' },
  ];

  const handleMarketing = () => {
    setAppMode('marketing');
    setMktCategory('atracao');
    window.location.hash = '#/marketing/tracking';
  };

  const handleSales = () => {
    setAppMode('crm');
    setMktCategory(null);
    setOpenCat(null);
    window.location.hash = '#/kanban';
  };

  const handleCatClick = (cat: string) => {
    setOpenCat(openCat === cat ? null : cat);
    const items = MKT_CATEGORIES[cat];
    if (items && items.length > 0 && mktCategory !== cat) {
      setMktCategory(cat);
      window.location.hash = '#/marketing/' + items[0].sub;
    }
  };

  const handleSub = (sub: string) => {
    window.location.hash = '#/marketing/' + sub;
    setOpenCat(null);
  };

  const handleDash = () => {
    window.location.hash = '#/marketing';
  };

  const catLabel