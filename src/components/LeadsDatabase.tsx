import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Filter, Download, Plus, X, Building2, Mail, Phone, Briefcase, ChevronDown, Check, User, CheckCircle2, Edit2, ExternalLink } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { createPortal } from 'react-dom';

interface ContactGroup {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  leads: any[];
  totalValue: number;
}

export const LeadsDatabase = ({ onNavigate }: any) => {
  const { currentUser } = useCRM();
  const [leads, setLeads] = useState<any[]>([]);
  const [funnels, setFunnels] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<ContactGroup | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter states
  const [filterFunnel, setFilterFunnel] = useState<string>('');
  const [filterUser, setFilterUser] = useState<string>('');
  const [filterStage, setFilterStage] = useState<string>('');

  // Dropdown states
  const [showFunnelDropdown, setShowFunnelDropdown] = useState(false);
  const funnelDropdownButtonRef = useRef<HTMLButtonElement>(null);
  const [funnelDropdownPosition, setFunnelDropdownPosition] = useState<{ top: number; left: number } | null>(null);

  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownButtonRef = useRef<HTMLButtonElement>(null);
  const [userDropdownPosition, setUserDropdownPosition] = useState<{ top: number; left: number } | null>(null);

  const [showStageDropdown, setShowStageDropdown] = useState(false);
  const stageDropdownButtonRef = useRef<HTMLButtonElement>(null);
  const [stageDropdownPosition, setStageDropdownPosition] = useState<{ top: number; left: number } | null>(null);

  const [showFilters, setShowFilters] = useState(false);

  // Edit contact modal
  const [showEditContact, setShowEditContact] = useState(false);
  const [editContactForm, setEditContactForm] = useState({ name: '', phone: '', company: '' });
  const [savingContact, setSavingContact] = useState(false);

  // Add deal modal (from contact panel)
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [addDealForm, setAddDealForm] = useState({ title: '', funnel_id: '', stage_id: '' });
  const [addingDeal, setAddingDeal] = useState(false);

  useEffect(() => {
    if (showFunnelDropdown && funnelDropdownButtonRef.current) {
      const rect = funnelDropdownButtonRef.current.getBoundingClientRect();
      setFunnelDropdownPosition({ top: rect.bottom + 8, left: rect.left });
    }
    if (showUserDropdown && userDropdownButtonRef.current) {
      const rect = userDropdownButtonRef.current.getBoundingClientRect();
      setUserDropdownPosition({ top: rect.bottom + 8, left: rect.left });
    }
    if (showStageDropdown && stageDropdownButtonRef.current) {
      const rect = stageDropdownButtonRef.current.getBoundingClientRect();
      setStageDropdownPosition({ top: rect.bottom + 8, left: rect.left });
    }
  }, [showFunnelDropdown, showUserDropdown, showStageDropdown]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const aid = currentUser?.account_id || '';
      const [leadsRes, funnelsRes, usersRes] = await Promise.all([
        fetch(`/api/leads?account_id=${aid}`),
        fetch(`/api/funnels?account_id=${aid}`),
        fetch(`/api/users?account_id=${aid}`)
      ]);
      const leadsData = await leadsRes.json();
      const funnelsData = await funnelsRes.json();
      const usersData = await usersRes.json();

      if (Array.isArray(leadsData)) {
        setLeads(leadsData);
      } else {
        console.error('Leads data is not an array:', leadsData);
      }

      if (Array.isArray(funnelsData)) {
        setFunnels(funnelsData);
      } else {
        console.error('Funnels data is not an array:', funnelsData);
      }

      if (Array.isArray(usersData)) {
        setUsers(usersData);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStageName = (funnelId: string, stageId: string) => {
    const funnel = funnels.find(f => f.id === funnelId);
    if (!funnel) return 'Desconhecido';
    const stage = funnel.stages?.find((s: any) => s.id === stageId);
    return stage ? stage.name : 'Desconhecido';
  };

  const getFunnelName = (funnelId: string) => {
    const funnel = funnels.find(f => f.id === funnelId);
    return funnel ? funnel.name : 'Funil Desconhecido';
  };

  const handleCreateLead = async () => {
    const accountId = currentUser?.account_id;
    if (!accountId) {
      alert('Erro: usuário sem conta associada. Faça logout e login novamente.');
      return;
    }
    if (funnels.length === 0) {
      alert('Crie um funil de vendas primeiro nas configurações.');
      return;
    }
    const funnel = funnels[0];
    if (!funnel.stages || funnel.stages.length === 0) {
      alert('O funil não possui etapas. Adicione etapas nas configurações.');
      return;
    }

    try {
      const res = await fetch(`/api/leads?account_id=${accountId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Novo Contato',
          company: '',
          value: 0,
          funnel_id: funnel.id,
          stage_id: funnel.stages[0].id,
          assigned_user_id: currentUser?.id,
          account_id: accountId,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Erro ao criar contato: ${err.error || res.status}`);
        return;
      }
      const createdLead = await res.json();
      if (createdLead.id) onNavigate('lead-detail', createdLead.id);
    } catch (error) {
      console.error(error);
    }
  };

  const openEditContact = (contact: ContactGroup) => {
    setEditContactForm({ name: contact.name, phone: contact.phone, company: contact.company });
    setShowEditContact(true);
  };

  const handleSaveContact = async () => {
    if (!selectedContact) return;
    setSavingContact(true);
    const aid = currentUser?.account_id || '';
    // Update all leads that belong to this contact (same email or phone)
    const contactLeads = selectedContact.leads;
    try {
      await Promise.all(contactLeads.map(lead =>
        fetch(`/api/leads/${lead.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contact_name: editContactForm.name,
            contact_phone: editContactForm.phone,
            company: editContactForm.company,
          }),
        })
      ));
      // Update local state
      setLeads(prev => prev.map(l =>
        contactLeads.some(cl => cl.id === l.id)
          ? { ...l, contact_name: editContactForm.name, contact_phone: editContactForm.phone, company: editContactForm.company }
          : l
      ));
      setSelectedContact({
        ...selectedContact,
        name: editContactForm.name,
        phone: editContactForm.phone,
        company: editContactForm.company,
        leads: contactLeads.map(l => ({ ...l, contact_name: editContactForm.name, contact_phone: editContactForm.phone, company: editContactForm.company })),
      });
      setShowEditContact(false);
    } catch (e) { console.error(e); }
    setSavingContact(false);
  };

  const openAddDeal = () => {
    const firstFunnel = funnels[0];
    setAddDealForm({
      title: `Negociação - ${selectedContact?.name || 'Contato'}`,
      funnel_id: firstFunnel?.id || '',
      stage_id: firstFunnel?.stages?.[0]?.id || '',
    });
    setShowAddDeal(true);
  };

  const handleAddDeal = async () => {
    if (!selectedContact || !addDealForm.title || !addDealForm.funnel_id) return;
    setAddingDeal(true);
    const aid = currentUser?.account_id || '';
    const selectedFunnel = funnels.find(f => f.id === addDealForm.funnel_id);
    const stageId = addDealForm.stage_id || selectedFunnel?.stages?.[0]?.id || '';
    try {
      const res = await fetch(`/api/leads?account_id=${aid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: addDealForm.title,
          funnel_id: addDealForm.funnel_id,
          stage_id: stageId,
          contact_name: selectedContact.name,
          contact_email: selectedContact.email,
          contact_phone: selectedContact.phone,
          company: selectedContact.company,
          account_id: aid,
        }),
      });
      if (res.ok) {
        const newLead = await res.json();
        setShowAddDeal(false);
        setSelectedContact(null);
        onNavigate('lead-detail', newLead.id);
      }
    } catch (e) { console.error(e); }
    setAddingDeal(false);
  };

  // Group leads into contacts
  const filteredContacts = useMemo(() => {
    const contactsMap = new Map<string, ContactGroup>();

    // Apply filters before grouping
    let filteredLeads = leads;
    
    if (filterFunnel) {
      filteredLeads = filteredLeads.filter(lead => lead.funnel_id === filterFunnel);
    }
    
    if (filterUser) {
      filteredLeads = filteredLeads.filter(lead => String(lead.assigned_user_id) === String(filterUser));
    }
    
    if (filterStage) {
      filteredLeads = filteredLeads.filter(lead => lead.stage_id === filterStage);
    }

    filteredLeads.forEach(lead => {
      const contactId = lead.contact_email || lead.contact_phone || lead.contact_name || lead.company || `unknown_${lead.id}`;

      if (!contactsMap.has(contactId)) {
        contactsMap.set(contactId, {
          id: contactId,
          name: lead.contact_name || '',
          email: lead.contact_email || '',
          phone: lead.contact_phone || '',
          company: lead.company || '',
          leads: [],
          totalValue: 0
        });
      }

      const group = contactsMap.get(contactId)!;
      group.leads.push(lead);
      group.totalValue += (lead.value || 0);

      if (!group.name && lead.contact_name) group.name = lead.contact_name;
      if (!group.email && lead.contact_email) group.email = lead.contact_email;
      if (!group.phone && lead.contact_phone) group.phone = lead.contact_phone;
      if (!group.company && lead.company) group.company = lead.company;
    });

    const contacts = Array.from(contactsMap.values()).filter(contact => {
      const search = searchTerm.toLowerCase();
      return (
        contact.name.toLowerCase().includes(search) ||
        contact.email.toLowerCase().includes(search) ||
        contact.company.toLowerCase().includes(search)
      );
    });

    return contacts;
  }, [leads, searchTerm, filterFunnel, filterUser, filterStage]);

  const groupLeadsByFunnel = (contactLeads: any[]) => {
    const grouped: Record<string, any[]> = {};
    contactLeads.forEach(lead => {
      if (!grouped[lead.funnel_id]) {
        grouped[lead.funnel_id] = [];
      }
      grouped[lead.funnel_id].push(lead);
    });
    return grouped;
  };

  const resetFilters = () => {
    setFilterFunnel('');
    setFilterUser('');
    setFilterStage('');
  };

  const hasActiveFilters = filterFunnel || filterUser || filterStage;

  const getAllStages = () => {
    const stagesSet = new Set<string>();
    funnels.forEach(funnel => {
      funnel.stages?.forEach((stage: any) => {
        stagesSet.add(JSON.stringify({ id: stage.id, name: stage.name, funnel_id: funnel.id }));
      });
    });
    return Array.from(stagesSet).map(s => JSON.parse(s));
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="h-full flex flex-col bg-white relative">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Base de Contatos</h1>
          <p className="text-sm text-slate-500">Visualize e gerencie todos os contatos e suas negociações</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="text-slate-500 hover:text-slate-700 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Download size={18} />
          </button>
          <button 
            onClick={handleCreateLead}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            Novo Contato
          </button>
        </div>
      </div>

      <div className="p-6 border-b border-gray-200 bg-slate-50 flex items-center gap-4 shrink-0 flex-wrap">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome, empresa ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 outline-none hover:border-slate-300 transition-all"
          />
        </div>

        {/* Invisible backdrop */}
        {(showFunnelDropdown || showUserDropdown || showStageDropdown) && (
          <div
            className="fixed inset-0 z-[50]"
            onClick={() => {
              setShowFunnelDropdown(false);
              setShowUserDropdown(false);
              setShowStageDropdown(false);
            }}
          />
        )}

        {/* Funnel Dropdown */}
        <div className="min-w-[180px] relative" style={{ zIndex: showFunnelDropdown ? 61 : 'auto' }}>
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10">
            <Filter size={14} />
          </div>
          <button
            ref={funnelDropdownButtonRef}
            type="button"
            onClick={() => setShowFunnelDropdown(prev => !prev)}
            className={`w-full flex items-center justify-between pl-9 pr-3 py-2.5 bg-white border rounded-xl text-[11px] font-bold text-slate-700 hover:border-slate-300 transition-all cursor-pointer ${
              filterFunnel ? 'border-indigo-400 text-indigo-700 bg-indigo-50' : 'border-slate-200'
            }`}
          >
            <span className="truncate">
              {filterFunnel ? (funnels.find(f => f.id === filterFunnel)?.name || 'Funil') : 'Todos os funis'}
            </span>
            <ChevronDown size={14} className={`text-slate-300 transition-transform ${showFunnelDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showFunnelDropdown && funnelDropdownPosition && createPortal(
            <div
              className="w-64 bg-white border border-slate-100 rounded-2xl shadow-2xl p-2"
              style={{ position: 'fixed', top: `${funnelDropdownPosition.top}px`, left: `${funnelDropdownPosition.left}px`, zIndex: 1000 }}
            >
              <div className="max-h-60 overflow-y-auto space-y-1 no-scrollbar">
                <div
                  onClick={() => { setFilterFunnel(''); setShowFunnelDropdown(false); }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
                    !filterFunnel ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                    !filterFunnel ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                  }`}>
                    {!filterFunnel && <Check size={10} className="text-white" />}
                  </div>
                  <span className="text-[11px] font-bold">Todos os funis</span>
                </div>
                {funnels.map(funnel => (
                  <div
                    key={funnel.id}
                    onClick={() => { setFilterFunnel(funnel.id); setShowFunnelDropdown(false); }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
                      filterFunnel === funnel.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                      filterFunnel === funnel.id ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                    }`}>
                      {filterFunnel === funnel.id && <Check size={10} className="text-white" />}
                    </div>
                    <span className="text-[11px] font-bold">{funnel.name}</span>
                  </div>
                ))}
              </div>
            </div>,
            document.body
          )}
        </div>

        {/* User Dropdown */}
        <div className="min-w-[180px] relative" style={{ zIndex: showUserDropdown ? 61 : 'auto' }}>
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10">
            <User size={14} />
          </div>
          <button
            ref={userDropdownButtonRef}
            type="button"
            onClick={() => setShowUserDropdown(prev => !prev)}
            className={`w-full flex items-center justify-between pl-9 pr-3 py-2.5 bg-white border rounded-xl text-[11px] font-bold text-slate-700 hover:border-slate-300 transition-all cursor-pointer ${
              filterUser ? 'border-blue-400 text-blue-700 bg-blue-50' : 'border-slate-200'
            }`}
          >
            <span className="truncate">
              {filterUser ? (users.find(u => String(u.id) === String(filterUser))?.name || 'Usuário') : 'Todos os usuários'}
            </span>
            <ChevronDown size={14} className={`text-slate-300 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showUserDropdown && userDropdownPosition && createPortal(
            <div
              className="w-64 bg-white border border-slate-100 rounded-2xl shadow-2xl p-2"
              style={{ position: 'fixed', top: `${userDropdownPosition.top}px`, left: `${userDropdownPosition.left}px`, zIndex: 1000 }}
            >
              <div className="max-h-60 overflow-y-auto space-y-1 no-scrollbar">
                <div
                  onClick={() => { setFilterUser(''); setShowUserDropdown(false); }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
                    !filterUser ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                    !filterUser ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                  }`}>
                    {!filterUser && <Check size={10} className="text-white" />}
                  </div>
                  <span className="text-[11px] font-bold">Todos os usuários</span>
                </div>
                {users.map(user => (
                  <div
                    key={user.id}
                    onClick={() => { setFilterUser(user.id); setShowUserDropdown(false); }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
                      filterUser === user.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                      filterUser === user.id ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                    }`}>
                      {filterUser === user.id && <Check size={10} className="text-white" />}
                    </div>
                    <span className="text-[11px] font-bold">{user.name}</span>
                  </div>
                ))}
              </div>
            </div>,
            document.body
          )}
        </div>

        {/* Stage Dropdown */}
        <div className="min-w-[180px] relative" style={{ zIndex: showStageDropdown ? 61 : 'auto' }}>
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10">
            <CheckCircle2 size={14} />
          </div>
          <button
            ref={stageDropdownButtonRef}
            type="button"
            onClick={() => setShowStageDropdown(prev => !prev)}
            className={`w-full flex items-center justify-between pl-9 pr-3 py-2.5 bg-white border rounded-xl text-[11px] font-bold text-slate-700 hover:border-slate-300 transition-all cursor-pointer ${
              filterStage ? 'border-green-400 text-green-700 bg-green-50' : 'border-slate-200'
            }`}
          >
            <span className="truncate">
              {filterStage ? (getAllStages().find((s: any) => s.id === filterStage)?.name || 'Etapa') : 'Todas as etapas'}
            </span>
            <ChevronDown size={14} className={`text-slate-300 transition-transform ${showStageDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showStageDropdown && stageDropdownPosition && createPortal(
            <div
              className="w-64 bg-white border border-slate-100 rounded-2xl shadow-2xl p-2"
              style={{ position: 'fixed', top: `${stageDropdownPosition.top}px`, left: `${stageDropdownPosition.left}px`, zIndex: 1000 }}
            >
              <div className="max-h-60 overflow-y-auto space-y-1 no-scrollbar">
                <div
                  onClick={() => { setFilterStage(''); setShowStageDropdown(false); }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
                    !filterStage ? 'bg-green-50 text-green-700' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                    !filterStage ? 'bg-green-600 border-green-600' : 'border-slate-300'
                  }`}>
                    {!filterStage && <Check size={10} className="text-white" />}
                  </div>
                  <span className="text-[11px] font-bold">Todas as etapas</span>
                </div>
                {getAllStages().map((stage: any) => (
                  <div
                    key={stage.id}
                    onClick={() => { setFilterStage(stage.id); setShowStageDropdown(false); }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
                      filterStage === stage.id ? 'bg-green-50 text-green-700' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                      filterStage === stage.id ? 'bg-green-600 border-green-600' : 'border-slate-300'
                    }`}>
                      {filterStage === stage.id && <Check size={10} className="text-white" />}
                    </div>
                    <span className="text-[11px] font-bold">{stage.name}</span>
                    <span className="text-[9px] text-slate-400 ml-auto">({getFunnelName(stage.funnel_id)})</span>
                  </div>
                ))}
              </div>
            </div>,
            document.body
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl font-bold text-[11px] text-red-700 hover:bg-red-100 transition-all"
          >
            <X size={14} />
            Limpar filtros
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-10 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contato</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Empresa</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Negociações</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredContacts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                  {hasActiveFilters || searchTerm ? 'Nenhum contato encontrado com os filtros aplicados.' : 'Nenhum contato encontrado.'}
                </td>
              </tr>
            ) : (
              filteredContacts.map(contact => (
                <tr key={contact.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setSelectedContact(contact)}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-slate-900">{contact.name || 'Sem Nome'}</div>
                    <div className="text-sm text-slate-500 flex items-center gap-3 mt-1">
                      {contact.email && <span className="flex items-center gap-1"><Mail size={12} /> {contact.email}</span>}
                      {contact.phone && <span className="flex items-center gap-1"><Phone size={12} /> {contact.phone}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                    {contact.company ? (
                      <span className="flex items-center gap-1"><Building2 size={14} className="text-slate-400" /> {contact.company}</span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {contact.leads.length} {contact.leads.length === 1 ? 'negociação' : 'negociações'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-700">
                    R$ {contact.totalValue.toLocaleString('pt-BR')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Contact Details Modal */}
      {selectedContact && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Contact header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-white">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {(selectedContact.name || selectedContact.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{selectedContact.name || 'Contato Sem Nome'}</h2>
                    {selectedContact.company && <p className="text-sm text-slate-500">{selectedContact.company}</p>}
                  </div>
                </div>
                <button onClick={() => setSelectedContact(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                {selectedContact.email && (
                  <span className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                    <Mail size={13} className="text-slate-400" />{selectedContact.email}
                  </span>
                )}
                {selectedContact.phone && (
                  <span className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                    <Phone size={13} className="text-slate-400" />{selectedContact.phone}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEditContact(selectedContact)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 rounded-lg text-xs font-bold transition-all"
                >
                  <Edit2 size={13} />Editar Contato
                </button>
                <button
                  onClick={openAddDeal}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  <Plus size={13} />Nova Negociação
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wider">
                  <Briefcase size={15} className="text-indigo-600" />
                  Negociações ({selectedContact.leads.length})
                </h3>
                <span className="text-sm font-bold text-indigo-600">
                  R$ {selectedContact.totalValue.toLocaleString('pt-BR')}
                </span>
              </div>

              {Object.entries(groupLeadsByFunnel(selectedContact.leads)).map(([funnelId, funnelLeads]) => (
                <div key={funnelId} className="mb-8 last:mb-0">
                  <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100">
                    {getFunnelName(funnelId)}
                  </h4>
                  <div className="space-y-3">
                    {funnelLeads.map(lead => (
                      <div 
                        key={lead.id} 
                        onClick={() => {
                          setSelectedContact(null);
                          onNavigate('lead-detail', lead.id);
                        }}
                        className="p-4 border border-gray-200 rounded-xl flex justify-between items-center hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all group bg-white"
                      >
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{lead.title}</div>
                          <div className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                            Estágio: <span className="font-medium text-slate-700">{getStageName(lead.funnel_id, lead.stage_id)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-800">
                            R$ {(lead.value || 0).toLocaleString('pt-BR')}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            {lead.created_at ? new Date(lead.created_at).toLocaleDateString('pt-BR') : 'Hoje'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Contact Modal ── */}
      {showEditContact && selectedContact && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Editar Contato</h2>
                <p className="text-xs text-slate-400 mt-0.5">Atualiza em todas as negociações deste contato</p>
              </div>
              <button onClick={() => setShowEditContact(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nome</label>
                <input type="text" value={editContactForm.name} onChange={e => setEditContactForm({ ...editContactForm, name: e.target.value })}
                  placeholder="Nome do contato" autoFocus
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Telefone / WhatsApp</label>
                <input type="text" value={editContactForm.phone} onChange={e => setEditContactForm({ ...editContactForm, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Empresa</label>
                <input type="text" value={editContactForm.company} onChange={e => setEditContactForm({ ...editContactForm, company: e.target.value })}
                  placeholder="Nome da empresa"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                O e-mail não pode ser alterado aqui pois é o identificador do contato.
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
              <button onClick={() => setShowEditContact(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl font-medium text-sm">Cancelar</button>
              <button onClick={handleSaveContact} disabled={savingContact}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center gap-2">
                {savingContact ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Deal Modal ── */}
      {showAddDeal && selectedContact && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Nova Negociação</h2>
                <p className="text-xs text-slate-400 mt-0.5">Para {selectedContact.name || selectedContact.email}</p>
              </div>
              <button onClick={() => setShowAddDeal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Contact preview */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {(selectedContact.name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{selectedContact.name || 'Sem nome'}</p>
                  <div className="flex gap-3">
                    {selectedContact.phone && <span className="text-xs text-slate-400">{selectedContact.phone}</span>}
                    {selectedContact.email && <span className="text-xs text-slate-400">{selectedContact.email}</span>}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Título da negociação</label>
                <input type="text" value={addDealForm.title} onChange={e => setAddDealForm({ ...addDealForm, title: e.target.value })}
                  placeholder="Ex: Proposta de serviços" autoFocus
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Funil</label>
                <select value={addDealForm.funnel_id}
                  onChange={e => {
                    const f = funnels.find(fn => fn.id === e.target.value);
                    setAddDealForm({ ...addDealForm, funnel_id: e.target.value, stage_id: f?.stages?.[0]?.id || '' });
                  }}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">Selecionar funil...</option>
                  {funnels.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              {addDealForm.funnel_id && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Etapa inicial</label>
                  <select value={addDealForm.stage_id} onChange={e => setAddDealForm({ ...addDealForm, stage_id: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                    {(funnels.find(f => f.id === addDealForm.funnel_id)?.stages || []).map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
              <button onClick={() => setShowAddDeal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl font-medium text-sm">Cancelar</button>
              <button onClick={handleAddDeal} disabled={addingDeal || !addDealForm.title || !addDealForm.funnel_id}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center gap-2">
                {addingDeal ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={14} />}
                Criar Negociação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
