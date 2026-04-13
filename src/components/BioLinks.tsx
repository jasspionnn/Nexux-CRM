import React, { useState, useEffect } from 'react';
import { Link, Plus, Trash2, Eye, Copy, Save, Palette, Type, Layout, ExternalLink, Smartphone, Monitor } from 'lucide-react';
import { useCRM } from '../context/CRMContext';

interface BioLink {
  id: string;
  label: string;
  url: string;
  icon: string;
}

interface BioPage {
  id?: string;
  slug: string;
  title: string;
  description: string;
  avatar_url: string;
  bg_color: string;
  text_color: string;
  button_color: string;
  button_text_color: string;
  button_radius: number;
  links: BioLink[];
  is_active: number;
  click_count?: number;
}

const ICON_OPTIONS = ['🔗', '📱', '📧', '🌐', '💼', '🎯', '📸', '🎵', '🎬', '📺', '💬', '🛒', '⭐', '🚀', ''];

const DEFAULT_BIO: BioPage = {
  slug: '',
  title: 'Meus Links',
  description: 'Confira meus links importantes',
  avatar_url: '',
  bg_color: '#0f172a',
  text_color: '#f8fafc',
  button_color: '#0d9488',
  button_text_color: '#ffffff',
  button_radius: 12,
  links: [
    { id: crypto.randomUUID(), label: 'Meu Site', url: 'https://meusite.com', icon: '🌐' },
    { id: crypto.randomUUID(), label: 'WhatsApp', url: 'https://wa.me/5511999999999', icon: '💬' },
    { id: crypto.randomUUID(), label: 'Instagram', url: 'https://instagram.com/meuperfil', icon: '📸' },
  ],
  is_active: 1,
};

export const BioLinks = () => {
  const { currentUser } = useCRM();
  const [isLoading, setIsLoading] = useState(true);
  const [bioPages, setBioPages] = useState<BioPage[]>([]);
  const [editing, setEditing] = useState<BioPage | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('mobile');
  const [activeTab, setActiveTab] = useState<'content' | 'design'>('content');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const accountId = currentUser?.account_id || 'acc_demo';

  useEffect(() => { fetchPages(); }, []);

  const fetchPages = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/bio-links?account_id=${accountId}`);
      if (res.ok) setBioPages(await res.json());
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const handleCreate = () => {
    const newBio = { ...DEFAULT_BIO, slug: `bio-${Date.now().toString(36)}`, id: undefined };
    setEditing(newBio as BioPage);
  };

  const handleEdit = (page: BioPage) => {
    setEditing({ ...page });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const isUpdate = !!editing.id;
      const url = isUpdate ? `/api/bio-links/${editing.id}` : '/api/bio-links';
      const res = await fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editing, account_id: accountId }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('Bio save error:', data);
        alert(`Erro ao salvar: ${data.error || 'Erro desconhecido'}`);
      } else {
        setEditing(null);
        fetchPages();
      }
    } catch (e: any) {
      console.error('Bio save error:', e);
      alert(`Erro ao salvar: ${e.message}`);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta página de links?')) return;
    try {
      await fetch(`/api/bio-links/${id}`, { method: 'DELETE' });
      fetchPages();
    } catch (e) { console.error(e); }
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/bio/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateLink = (index: number, field: keyof BioLink, value: string) => {
    if (!editing) return;
    const links = [...editing.links];
    links[index] = { ...links[index], [field]: value };
    setEditing({ ...editing, links });
  };

  const addLink = () => {
    if (!editing) return;
    setEditing({
      ...editing,
      links: [...editing.links, { id: crypto.randomUUID(), label: '', url: '', icon: '🔗' }],
    });
  };

  const removeLink = (index: number) => {
    if (!editing) return;
    setEditing({ ...editing, links: editing.links.filter((_, i) => i !== index) });
  };

  if (isLoading) return <div className="flex items-center justify-center h-full"><div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" /></div>;

  // Editing mode
  if (editing) {
    return (
      <div className="h-full bg-slate-50/50 flex">
        {/* Editor Panel */}
        <div className="w-1/2 lg:w-[45%] border-r border-slate-200 bg-white flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                {editing.id ? 'Editar Página' : 'Nova Página'}
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-0.5">Configure seus links e design</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-sm disabled:opacity-50">
                <Save size={16} />Salvar
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 shrink-0">
            <button onClick={() => setActiveTab('content')} className={`flex-1 px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'content' ? 'border-slate-900 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <Link size={16} />Conteúdo
            </button>
            <button onClick={() => setActiveTab('design')} className={`flex-1 px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'design' ? 'border-slate-900 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <Palette size={16} />Design
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'content' ? (
              <div className="space-y-5">
                {/* Basic Info */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">URL Slug</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400 font-mono">/bio/</span>
                    <input
                      type="text"
                      value={editing.slug}
                      onChange={e => setEditing({ ...editing, slug: e.target.value })}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="meu-nome"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Título</label>
                  <input type="text" value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Descrição</label>
                  <textarea value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">URL do Avatar (opcional)</label>
                  <input type="text" value={editing.avatar_url} onChange={e => setEditing({ ...editing, avatar_url: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://..." />
                </div>

                {/* Links */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Links ({editing.links.length})</label>
                    <button onClick={addLink} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700">
                      <Plus size={14} />Adicionar
                    </button>
                  </div>
                  <div className="space-y-3">
                    {editing.links.map((link, i) => (
                      <div key={link.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <div className="flex items-center gap-2">
                          <select
                            value={link.icon}
                            onChange={e => updateLink(i, 'icon', e.target.value)}
                            className="w-10 h-9 text-center text-lg bg-white border border-slate-200 rounded-lg focus:outline-none"
                          >
                            {ICON_OPTIONS.map(ic => <option key={ic} value={ic}>{ic || '—'}</option>)}
                          </select>
                          <input
                            type="text"
                            value={link.label}
                            onChange={e => updateLink(i, 'label', e.target.value)}
                            placeholder="Título do link"
                            className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button onClick={() => removeLink(i)} className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={link.url}
                          onChange={e => updateLink(i, 'url', e.target.value)}
                          placeholder="https://..."
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Colors */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Palette size={14} className="text-slate-400" />
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cores</label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Fundo</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={editing.bg_color} onChange={e => setEditing({ ...editing, bg_color: e.target.value })} className="w-9 h-9 rounded cursor-pointer border-0" />
                        <input type="text" value={editing.bg_color} onChange={e => setEditing({ ...editing, bg_color: e.target.value })} className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-xs font-mono focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Texto</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={editing.text_color} onChange={e => setEditing({ ...editing, text_color: e.target.value })} className="w-9 h-9 rounded cursor-pointer border-0" />
                        <input type="text" value={editing.text_color} onChange={e => setEditing({ ...editing, text_color: e.target.value })} className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-xs font-mono focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Botão</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={editing.button_color} onChange={e => setEditing({ ...editing, button_color: e.target.value })} className="w-9 h-9 rounded cursor-pointer border-0" />
                        <input type="text" value={editing.button_color} onChange={e => setEditing({ ...editing, button_color: e.target.value })} className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-xs font-mono focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Texto do Botão</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={editing.button_text_color} onChange={e => setEditing({ ...editing, button_text_color: e.target.value })} className="w-9 h-9 rounded cursor-pointer border-0" />
                        <input type="text" value={editing.button_text_color} onChange={e => setEditing({ ...editing, button_text_color: e.target.value })} className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-xs font-mono focus:outline-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Button Radius */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Layout size={14} className="text-slate-400" />
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Arredondamento do Botão</label>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={editing.button_radius}
                    onChange={e => setEditing({ ...editing, button_radius: parseInt(e.target.value) })}
                    className="w-full accent-slate-900"
                  />
                  <div className="text-center text-xs text-slate-400 font-mono mt-1">{editing.button_radius}px</div>
                </div>

                {/* Presets */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Temas Prontos</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { name: 'Dark', bg: '#0f172a', text: '#f8fafc', btn: '#0d9488', btnText: '#ffffff' },
                      { name: 'Light', bg: '#f8fafc', text: '#0f172a', btn: '#0d9488', btnText: '#ffffff' },
                      { name: 'Roxo', bg: '#1e1b4b', text: '#e0e7ff', btn: '#7c3aed', btnText: '#ffffff' },
                      { name: 'Rosa', bg: '#831843', text: '#fce7f3', btn: '#ec4899', btnText: '#ffffff' },
                      { name: 'Azul', bg: '#0c4a6e', text: '#e0f2fe', btn: '#0ea5e9', btnText: '#ffffff' },
                      { name: 'Verde', bg: '#052e16', text: '#dcfce7', btn: '#22c55e', btnText: '#ffffff' },
                    ].map(preset => (
                      <button
                        key={preset.name}
                        onClick={() => setEditing({ ...editing, bg_color: preset.bg, text_color: preset.text, button_color: preset.btn, button_text_color: preset.btnText })}
                        className="p-2 border border-slate-200 rounded-lg hover:border-blue-500 text-left"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.bg }} />
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.btn }} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-600">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-8">
          {/* Preview Mode Toggle */}
          <div className="flex items-center gap-2 mb-6">
            <button onClick={() => setPreviewMode('mobile')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${previewMode === 'mobile' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              <Smartphone size={14} />Mobile
            </button>
            <button onClick={() => setPreviewMode('desktop')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${previewMode === 'desktop' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              <Monitor size={14} />Desktop
            </button>
          </div>

          {/* Phone Frame */}
          <div className={`bg-white rounded-[2.5rem] shadow-2xl overflow-hidden transition-all duration-300 ${previewMode === 'mobile' ? 'w-[320px] h-[640px]' : 'w-[480px] h-[640px]'}`}>
            <div className="h-full overflow-y-auto" style={{ backgroundColor: editing.bg_color }}>
              {/* Profile Section */}
              <div className="px-6 pt-12 pb-6 text-center">
                {editing.avatar_url ? (
                  <img src={editing.avatar_url} alt="" className="w-20 h-20 rounded-full mx-auto mb-4 object-cover border-2" style={{ borderColor: editing.button_color }} />
                ) : (
                  <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-black" style={{ backgroundColor: editing.button_color, color: editing.button_text_color }}>
                    {editing.title.charAt(0).toUpperCase()}
                  </div>
                )}
                <h3 className="text-lg font-black" style={{ color: editing.text_color }}>{editing.title}</h3>
                {editing.description && <p className="text-sm mt-1 opacity-80" style={{ color: editing.text_color }}>{editing.description}</p>}
              </div>

              {/* Links */}
              <div className="px-4 pb-8 space-y-3">
                {editing.links.filter(l => l.label && l.url).map(link => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 font-bold text-sm transition-transform hover:scale-[1.02] block"
                    style={{
                      backgroundColor: editing.button_color,
                      color: editing.button_text_color,
                      borderRadius: editing.button_radius,
                    }}
                  >
                    {link.icon && <span className="text-lg">{link.icon}</span>}
                    {link.label}
                  </a>
                ))}
              </div>

              {/* Footer */}
              <div className="px-4 pb-8 text-center">
                <p className="text-[10px] opacity-40" style={{ color: editing.text_color }}>Feito com Nexux CRM</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List mode
  return (
    <div className="h-full bg-slate-50/50 p-6 lg:p-10 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3"><Link className="text-blue-600" size={32} />Link na Bio</h1>
            <p className="text-slate-500 font-medium mt-1">Crie páginas de links personalizáveis para compartilhar nas redes sociais.</p>
          </div>
          <button onClick={handleCreate} className="flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold">
            <Plus size={18} />Nova Página
          </button>
        </div>

        {bioPages.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-12 text-center">
            <Link className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-400 font-bold text-lg">Nenhuma página criada ainda</p>
            <p className="text-sm text-slate-400 mt-2">Crie sua primeira página de links para compartilhar nas redes sociais.</p>
            <button onClick={handleCreate} className="mt-6 flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold mx-auto">
              <Plus size={18} />Criar Minha Primeira Página
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bioPages.map(page => (
              <div key={page.id} className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow">
                {/* Preview Header */}
                <div className="h-28 flex items-center justify-center" style={{ backgroundColor: page.bg_color }}>
                  <div className="text-center">
                    {page.avatar_url ? (
                      <img src={page.avatar_url} alt="" className="w-14 h-14 rounded-full mx-auto object-cover border-2" style={{ borderColor: page.button_color }} />
                    ) : (
                      <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center text-xl font-black" style={{ backgroundColor: page.button_color, color: page.button_text_color }}>
                        {page.title.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-black text-slate-900">{page.title}</h3>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded ${page.is_active ? 'text-blue-600 bg-blue-50' : 'text-slate-400 bg-slate-50'}`}>
                      {page.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mb-3">{page.description}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mb-4">
                    <span className="flex items-center gap-1"><Link size={12} />{page.links?.length || 0} links</span>
                    <span className="flex items-center gap-1"><Eye size={12} />{page.click_count || 0} cliques</span>
                    <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded">/bio/{page.slug}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => copyLink(page.slug)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors">
                      {copied ? <><Eye size={14} />Copiado!</> : <><Copy size={14} />Copiar Link</>}
                    </button>
                    <button onClick={() => handleEdit(page)} className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors">
                      Editar
                    </button>
                    <button onClick={() => handleDelete(page.id!)} className="p-2 text-slate-300 hover:text-red-500 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                    <a href={`/bio/${page.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-300 hover:text-blue-600 rounded-lg transition-colors">
                      <ExternalLink size={16} />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
