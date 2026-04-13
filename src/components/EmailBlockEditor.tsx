import React, { useState, useRef, useCallback } from 'react';
import { Plus, Trash2, MoveUp, MoveDown, GripVertical, Eye, Code, Type, Image as ImageIcon, MousePointer, Minus, Square, Columns, CreditCard, Share2, Mail, Layout, Palette, Settings, ChevronDown, ChevronRight, X, Copy } from 'lucide-react';

type BlockType = 'hero' | 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'columns-2' | 'columns-3' | 'product-card' | 'social' | 'footer';

interface EmailBlock {
  id: string;
  type: BlockType;
  content: Record<string, any>;
}

const BLOCK_CATALOG: { type: BlockType; label: string; icon: any; defaultContent: Record<string, any>; category: string }[] = [
  // Layout
  { type: 'hero', label: 'Hero Banner', icon: Layout, defaultContent: { bg: '#0f172a', text: '#ffffff', title: 'Título do Banner', subtitle: 'Subtítulo do banner aqui', align: 'center', padding: '48px 24px' }, category: 'Layout' },
  { type: 'columns-2', label: '2 Colunas', icon: Columns, defaultContent: { gap: '16px', left: '<p>Coluna esquerda</p>', right: '<p>Coluna direita</p>', padding: '16px 0' }, category: 'Layout' },
  { type: 'columns-3', label: '3 Colunas', icon: Columns, defaultContent: { gap: '16px', left: '<p>Esquerda</p>', center: '<p>Centro</p>', right: '<p>Direita</p>', padding: '16px 0' }, category: 'Layout' },
  // Content
  { type: 'text', label: 'Texto', icon: Type, defaultContent: { text: '<p>Seu texto aqui. Você pode usar <strong>negrito</strong>, <em>itálico</em> e outros estilos.</p>', align: 'left', fontSize: '14px', color: '#334155', padding: '16px 0' }, category: 'Conteúdo' },
  { type: 'image', label: 'Imagem', icon: ImageIcon, defaultContent: { src: '', alt: 'Imagem', width: '100%', borderRadius: '8px', padding: '16px 0', align: 'center' }, category: 'Conteúdo' },
  { type: 'product-card', label: 'Produto', icon: CreditCard, defaultContent: { image: '', name: 'Nome do Produto', description: 'Descrição do produto', price: 'R$ 99,90', button: 'Comprar', buttonUrl: '#', bgColor: '#f8fafc', padding: '24px' }, category: 'Conteúdo' },
  // Actions
  { type: 'button', label: 'Botão', icon: MousePointer, defaultContent: { text: 'Clique Aqui', url: '#', bgColor: '#0d9488', textColor: '#ffffff', borderRadius: '8px', width: '100%', align: 'center', padding: '16px 0', fontSize: '16px' }, category: 'Ações' },
  { type: 'social', label: 'Redes Sociais', icon: Share2, defaultContent: { facebook: '#', instagram: '#', linkedin: '#', youtube: '#', bgColor: '#f1f5f9', iconColor: '#475569', iconSize: '24px', padding: '24px' }, category: 'Ações' },
  // Spacing
  { type: 'divider', label: 'Divisor', icon: Minus, defaultContent: { color: '#e2e8f0', height: '1px', style: 'solid', padding: '16px 0' }, category: 'Espaçamento' },
  { type: 'spacer', label: 'Espaçador', icon: Square, defaultContent: { height: '32px' }, category: 'Espaçamento' },
  // Footer
  { type: 'footer', label: 'Rodapé', icon: Mail, defaultContent: { company: 'Sua Empresa', address: 'Endereço da empresa, Cidade - UF', bgColor: '#f8fafc', textColor: '#64748b', fontSize: '12px', padding: '24px', showUnsubscribe: true }, category: 'Rodapé' },
];

const renderBlockHTML = (block: EmailBlock): string => {
  const c = block.content;
  switch (block.type) {
    case 'hero':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.bg};padding:${c.padding};"><tr><td align="${c.align}" style="color:${c.text};"><h1 style="margin:0 0 8px;font-size:28px;font-weight:800;">${c.title}</h1>${c.subtitle ? `<p style="margin:0;font-size:16px;opacity:0.8;">${c.subtitle}</p>` : ''}</td></tr></table>`;
    case 'text':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:${c.padding};"><tr><td align="${c.align}" style="color:${c.color};font-size:${c.fontSize};line-height:1.6;">${c.text}</td></tr></table>`;
    case 'image':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:${c.padding};"><tr><td align="${c.align}"><img src="${c.src || 'https://placehold.co/600x300/e2e8f0/94a3b8?text=Sua+Imagem'}" alt="${c.alt}" style="width:${c.width};border-radius:${c.borderRadius};display:block;max-width:100%;" /></td></tr></table>`;
    case 'button':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:${c.padding};"><tr><td align="${c.align}"><a href="${c.url}" style="display:inline-block;background:${c.bgColor};color:${c.textColor};padding:14px 32px;text-decoration:none;border-radius:${c.borderRadius};font-size:${c.fontSize};font-weight:700;">${c.text}</a></td></tr></table>`;
    case 'divider':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:${c.padding};"><tr><td><hr style="border:none;border-top:${c.height} ${c.style} ${c.color};" /></td></tr></table>`;
    case 'spacer':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:${c.height};font-size:1px;line-height:${c.height};">&nbsp;</td></tr></table>`;
    case 'columns-2':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:${c.padding};"><tr><td width="50%" valign="top" style="padding-right:${parseInt(c.gap)/2}px;">${c.left}</td><td width="50%" valign="top" style="padding-left:${parseInt(c.gap)/2}px;">${c.right}</td></tr></table>`;
    case 'columns-3':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:${c.padding};"><tr><td width="33%" valign="top" style="padding-right:${parseInt(c.gap)/3}px;">${c.left}</td><td width="34%" valign="top" style="padding:0 ${parseInt(c.gap)/3}px;">${c.center}</td><td width="33%" valign="top" style="padding-left:${parseInt(c.gap)/3}px;">${c.right}</td></tr></table>`;
    case 'product-card':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:${c.padding};"><tr><td style="background:${c.bgColor};border-radius:12px;overflow:hidden;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td><img src="${c.image || 'https://placehold.co/400x200/e2e8f0/94a3b8?text=Produto'}" style="width:100%;display:block;" /></td></tr><tr><td style="padding:16px;"><h3 style="margin:0 0 4px;font-size:16px;font-weight:700;">${c.name}</h3><p style="margin:0 0 12px;font-size:13px;color:#64748b;">${c.description}</p><p style="margin:0 0 12px;font-size:20px;font-weight:800;color:#0d9488;">${c.price}</p><a href="${c.buttonUrl}" style="display:block;text-align:center;background:#0d9488;color:#fff;padding:10px;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">${c.button}</a></td></tr></table></td></tr></table>`;
    case 'social':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.bgColor};padding:${c.padding};"><tr><td align="center"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="padding:0 8px;"><a href="${c.facebook}" style="color:${c.iconColor};text-decoration:none;font-size:${c.iconSize};">Facebook</a></td><td style="padding:0 8px;"><a href="${c.instagram}" style="color:${c.iconColor};text-decoration:none;font-size:${c.iconSize};">Instagram</a></td><td style="padding:0 8px;"><a href="${c.linkedin}" style="color:${c.iconColor};text-decoration:none;font-size:${c.iconSize};">LinkedIn</a></td><td style="padding:0 8px;"><a href="${c.youtube}" style="color:${c.iconColor};text-decoration:none;font-size:${c.iconSize};">YouTube</a></td></tr></table></td></tr></table>`;
    case 'footer':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.bgColor};padding:${c.padding};"><tr><td align="center" style="color:${c.textColor};font-size:${c.fontSize};line-height:1.6;"><p style="margin:0 0 4px;font-weight:700;">${c.company}</p><p style="margin:0 0 4px;">${c.address}</p>${c.showUnsubscribe ? '<p style="margin:0;"><a href="#" style="color:#94a3b8;text-decoration:underline;">Cancelar inscrição</a></p>' : ''}</td></tr></table>`;
    default:
      return '';
  }
};

const generateFullEmailHTML = (blocks: EmailBlock[]): string => {
  const bodyContent = blocks.map(renderBlockHTML).join('\n');
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Email</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);max-width:100%;">
        <tr><td>
          ${bodyContent}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
};

const BLOCK_CONFIGS: Record<BlockType, { label: string; fields: { key: string; label: string; type: 'text' | 'textarea' | 'color' | 'select' | 'url' | 'number'; options?: { label: string; value: string }[] }[] }> = {
  hero: { label: 'Hero Banner', fields: [
    { key: 'bg', label: 'Cor de Fundo', type: 'color' },
    { key: 'text', label: 'Cor do Texto', type: 'color' },
    { key: 'title', label: 'Título', type: 'text' },
    { key: 'subtitle', label: 'Subtítulo', type: 'text' },
    { key: 'align', label: 'Alinhamento', type: 'select', options: [{ label: 'Esquerda', value: 'left' }, { label: 'Centro', value: 'center' }, { label: 'Direita', value: 'right' }] },
    { key: 'padding', label: 'Padding', type: 'text' },
  ]},
  text: { label: 'Texto', fields: [
    { key: 'text', label: 'Conteúdo (HTML)', type: 'textarea' },
    { key: 'fontSize', label: 'Tamanho', type: 'text' },
    { key: 'color', label: 'Cor', type: 'color' },
    { key: 'align', label: 'Alinhamento', type: 'select', options: [{ label: 'Esquerda', value: 'left' }, { label: 'Centro', value: 'center' }, { label: 'Direita', value: 'right' }] },
    { key: 'padding', label: 'Padding', type: 'text' },
  ]},
  image: { label: 'Imagem', fields: [
    { key: 'src', label: 'URL da Imagem', type: 'url' },
    { key: 'alt', label: 'Alt Text', type: 'text' },
    { key: 'width', label: 'Largura', type: 'text' },
    { key: 'borderRadius', label: 'Border Radius', type: 'text' },
    { key: 'align', label: 'Alinhamento', type: 'select', options: [{ label: 'Esquerda', value: 'left' }, { label: 'Centro', value: 'center' }, { label: 'Direita', value: 'right' }] },
    { key: 'padding', label: 'Padding', type: 'text' },
  ]},
  button: { label: 'Botão', fields: [
    { key: 'text', label: 'Texto', type: 'text' },
    { key: 'url', label: 'URL', type: 'url' },
    { key: 'bgColor', label: 'Cor de Fundo', type: 'color' },
    { key: 'textColor', label: 'Cor do Texto', type: 'color' },
    { key: 'fontSize', label: 'Tamanho', type: 'text' },
    { key: 'borderRadius', label: 'Border Radius', type: 'text' },
    { key: 'width', label: 'Largura', type: 'text' },
    { key: 'align', label: 'Alinhamento', type: 'select', options: [{ label: 'Esquerda', value: 'left' }, { label: 'Centro', value: 'center' }, { label: 'Direita', value: 'right' }] },
    { key: 'padding', label: 'Padding', type: 'text' },
  ]},
  divider: { label: 'Divisor', fields: [
    { key: 'color', label: 'Cor', type: 'color' },
    { key: 'height', label: 'Espessura', type: 'text' },
    { key: 'style', label: 'Estilo', type: 'select', options: [{ label: 'Sólido', value: 'solid' }, { label: 'Tracejado', value: 'dashed' }, { label: 'Pontilhado', value: 'dotted' }] },
    { key: 'padding', label: 'Padding', type: 'text' },
  ]},
  spacer: { label: 'Espaçador', fields: [
    { key: 'height', label: 'Altura', type: 'text' },
  ]},
  'columns-2': { label: '2 Colunas', fields: [
    { key: 'left', label: 'Conteúdo Esquerda (HTML)', type: 'textarea' },
    { key: 'right', label: 'Conteúdo Direita (HTML)', type: 'textarea' },
    { key: 'gap', label: 'Gap', type: 'text' },
    { key: 'padding', label: 'Padding', type: 'text' },
  ]},
  'columns-3': { label: '3 Colunas', fields: [
    { key: 'left', label: 'Esquerda (HTML)', type: 'textarea' },
    { key: 'center', label: 'Centro (HTML)', type: 'textarea' },
    { key: 'right', label: 'Direita (HTML)', type: 'textarea' },
    { key: 'gap', label: 'Gap', type: 'text' },
    { key: 'padding', label: 'Padding', type: 'text' },
  ]},
  'product-card': { label: 'Produto', fields: [
    { key: 'image', label: 'URL da Imagem', type: 'url' },
    { key: 'name', label: 'Nome', type: 'text' },
    { key: 'description', label: 'Descrição', type: 'textarea' },
    { key: 'price', label: 'Preço', type: 'text' },
    { key: 'button', label: 'Texto do Botão', type: 'text' },
    { key: 'buttonUrl', label: 'URL do Botão', type: 'url' },
    { key: 'bgColor', label: 'Cor de Fundo', type: 'color' },
    { key: 'padding', label: 'Padding', type: 'text' },
  ]},
  social: { label: 'Redes Sociais', fields: [
    { key: 'facebook', label: 'Facebook URL', type: 'url' },
    { key: 'instagram', label: 'Instagram URL', type: 'url' },
    { key: 'linkedin', label: 'LinkedIn URL', type: 'url' },
    { key: 'youtube', label: 'YouTube URL', type: 'url' },
    { key: 'bgColor', label: 'Cor de Fundo', type: 'color' },
    { key: 'iconColor', label: 'Cor do Ícone', type: 'color' },
    { key: 'iconSize', label: 'Tamanho do Ícone', type: 'text' },
    { key: 'padding', label: 'Padding', type: 'text' },
  ]},
  footer: { label: 'Rodapé', fields: [
    { key: 'company', label: 'Empresa', type: 'text' },
    { key: 'address', label: 'Endereço', type: 'textarea' },
    { key: 'bgColor', label: 'Cor de Fundo', type: 'color' },
    { key: 'textColor', label: 'Cor do Texto', type: 'color' },
    { key: 'fontSize', label: 'Tamanho', type: 'text' },
    { key: 'padding', label: 'Padding', type: 'text' },
    { key: 'showUnsubscribe', label: 'Mostrar Cancelar Inscrição', type: 'select', options: [{ label: 'Sim', value: 'true' }, { label: 'Não', value: 'false' }] },
  ]},
};

interface EmailBlockEditorProps {
  blocks: EmailBlock[];
  onChange: (blocks: EmailBlock[]) => void;
}

export const EmailBlockEditor: React.FC<EmailBlockEditorProps> = ({ blocks, onChange }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showHTML, setShowHTML] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const dragIdxRef = useRef<number | null>(null);

  const addBlock = (type: BlockType) => {
    const catalog = BLOCK_CATALOG.find(b => b.type === type)!;
    const newBlock: EmailBlock = {
      id: crypto.randomUUID(),
      type,
      content: { ...catalog.defaultContent },
    };
    const newBlocks = selectedId ? insertAfter(blocks, selectedId, newBlock) : [...blocks, newBlock];
    onChange(newBlocks);
    setSelectedId(newBlock.id);
  };

  const insertAfter = (arr: EmailBlock[], afterId: string, item: EmailBlock): EmailBlock[] => {
    const idx = arr.findIndex(b => b.id === afterId);
    if (idx === -1) return [...arr, item];
    const copy = [...arr];
    copy.splice(idx + 1, 0, item);
    return copy;
  };

  const updateBlock = (id: string, updates: Record<string, any>) => {
    onChange(blocks.map(b => b.id === id ? { ...b, content: { ...b.content, ...updates } } : b));
  };

  const removeBlock = (id: string) => {
    const newBlocks = blocks.filter(b => b.id !== id);
    onChange(newBlocks);
    if (selectedId === id) setSelectedId(null);
  };

  const moveBlock = (id: string, dir: 'up' | 'down') => {
    const idx = blocks.findIndex(b => b.id === id);
    if ((dir === 'up' && idx === 0) || (dir === 'down' && idx === blocks.length - 1)) return;
    const newBlocks = [...blocks];
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    [newBlocks[idx], newBlocks[swapIdx]] = [newBlocks[swapIdx], newBlocks[idx]];
    onChange(newBlocks);
  };

  const duplicateBlock = (id: string) => {
    const block = blocks.find(b => b.id === id)!;
    const copy = { ...block, id: crypto.randomUUID(), content: { ...block.content } };
    const newBlocks = insertAfter(blocks, id, copy);
    onChange(newBlocks);
    setSelectedId(copy.id);
  };

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    dragIdxRef.current = idx;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (dragIdxRef.current === null || dragIdxRef.current === targetIdx) return;
    const newBlocks = [...blocks];
    const [moved] = newBlocks.splice(dragIdxRef.current, 1);
    newBlocks.splice(targetIdx, 0, moved);
    onChange(newBlocks);
    dragIdxRef.current = null;
  };

  const selectedBlock = blocks.find(b => b.id === selectedId);
  const selectedConfig = selectedBlock ? BLOCK_CONFIGS[selectedBlock.type] : null;

  // Preview mode
  if (showPreview) {
    return (
      <div className="h-full flex flex-col bg-slate-50">
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0">
          <h3 className="text-sm font-bold text-slate-900">Preview do Email</h3>
          <button onClick={() => setShowPreview(false)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold">Voltar ao Editor</button>
        </div>
        <div className="flex-1 overflow-y-auto bg-slate-100 p-6 flex justify-center">
          <div className="w-full max-w-[600px] bg-white rounded-none shadow-xl overflow-hidden" dangerouslySetInnerHTML={{ __html: generateFullEmailHTML(blocks) }} />
        </div>
      </div>
    );
  }

  // HTML mode
  if (showHTML) {
    return (
      <div className="h-full flex flex-col bg-slate-50">
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0">
          <h3 className="text-sm font-bold text-slate-900">HTML do Email</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => { navigator.clipboard?.writeText(generateFullEmailHTML(blocks)); }} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"><Copy size={12} />Copiar</button>
            <button onClick={() => setShowHTML(false)} className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold">Voltar</button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <textarea readOnly value={generateFullEmailHTML(blocks)} className="w-full h-full p-4 font-mono text-xs bg-slate-900 text-green-400 resize-none focus:outline-none" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-slate-50">
      {/* Left Sidebar - Block Catalog */}
      <div className={`${sidebarOpen ? 'w-56' : 'w-12'} shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden transition-all`}>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2.5 border-b border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50">
          {sidebarOpen ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </button>
        {sidebarOpen && (
          <div className="flex-1 overflow-y-auto p-3">
            {Object.entries(groupByCategory()).map(([category, items]) => (
              <div key={category} className="mb-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{category}</h4>
                <div className="space-y-1">
                  {items.map(item => {
                    const Icon = item.icon;
                    return (
                      <button key={item.type} onClick={() => addBlock(item.type)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left">
                        <Icon size={14} className="text-slate-500" />
                        <span className="text-xs font-bold text-slate-700">{item.label}</span>
                        <Plus size={12} className="text-slate-300 ml-auto" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Center Canvas */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">{blocks.length} bloco{blocks.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowPreview(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"><Eye size={14} />Preview</button>
            <button onClick={() => setShowHTML(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"><Code size={14} />HTML</button>
          </div>
        </div>

        {/* Blocks Canvas */}
        <div className="flex-1 overflow-y-auto pt-6 pb-4 px-4 bg-slate-100">
          <div className="max-w-[600px] mx-auto space-y-1">
            {blocks.length === 0 && (
              <div className="bg-white border-2 border-dashed border-slate-300 rounded-none p-12 text-center">
                <Layout className="mx-auto text-slate-300 mb-3" size={40} />
                <p className="text-slate-400 font-bold">Email vazio</p>
                <p className="text-sm text-slate-400 mt-1">Clique nos blocos à esquerda para começar</p>
              </div>
            )}
            {blocks.map((block, idx) => {
              const catalog = BLOCK_CATALOG.find(b => b.type === block.type)!;
              const Icon = catalog.icon;
              const isSelected = selectedId === block.id;
              return (
                <div
                  key={block.id}
                  draggable
                  onDragStart={e => handleDragStart(e, idx)}
                  onDragOver={handleDragOver}
                  onDrop={e => handleDrop(e, idx)}
                  onClick={() => setSelectedId(block.id)}
                  className={`bg-white rounded-none cursor-pointer transition-all group relative ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'shadow-sm hover:shadow-md border border-slate-200'}`}
                >
                  {/* Block Actions Bar */}
                  <div className={`absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-2 py-1 bg-slate-900 shadow-xl shadow-black/20 opacity-0 group-hover:opacity-100 transition-opacity z-50 ${isSelected ? 'opacity-100' : ''}`} style={{ borderRadius: 9999 }}>
                    <div className="text-slate-400 cursor-grab active:cursor-grabbing" draggable><GripVertical size={10} /></div>
                    <button onClick={e => { e.stopPropagation(); moveBlock(block.id, 'up'); }} className="p-0.5 text-slate-400 hover:text-white"><MoveUp size={10} /></button>
                    <button onClick={e => { e.stopPropagation(); moveBlock(block.id, 'down'); }} className="p-0.5 text-slate-400 hover:text-white"><MoveDown size={10} /></button>
                    <button onClick={e => { e.stopPropagation(); duplicateBlock(block.id); }} className="p-0.5 text-slate-400 hover:text-white"><Copy size={10} /></button>
                    <button onClick={e => { e.stopPropagation(); removeBlock(block.id); }} className="p-0.5 text-red-400 hover:text-red-300"><Trash2 size={10} /></button>
                  </div>

                  {/* Block Type Badge */}
                  <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                    <Icon size={12} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{catalog.label}</span>
                  </div>

                  {/* Block Preview */}
                  <div className="p-3 pointer-events-none select-none" style={{ maxHeight: 120, overflow: 'hidden' }}>
                    <BlockPreview block={block} />
                  </div>
                </div>
              );
            })}

            {/* Add block at end */}
            {blocks.length > 0 && (
              <button onClick={() => { setSelectedId(blocks[blocks.length - 1].id); }} className="w-full py-4 border-2 border-dashed border-slate-300 rounded-none text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/30 transition-all text-sm font-bold flex items-center justify-center gap-2">
                <Plus size={16} />Adicionar bloco
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Properties */}
      {selectedBlock && selectedConfig && (
        <div className="w-72 shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings size={14} className="text-slate-400" />
              <h3 className="text-xs font-black text-slate-900 uppercase">{selectedConfig.label}</h3>
            </div>
            <button onClick={() => setSelectedId(null)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedConfig.fields.map(field => (
              <div key={field.key}>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{field.label}</label>
                {field.type === 'color' ? (
                  <div className="flex items-center gap-2">
                    <input type="color" value={selectedBlock.content[field.key] || '#000000'} onChange={e => updateBlock(selectedBlock.id, { [field.key]: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0" />
                    <input type="text" value={selectedBlock.content[field.key] || ''} onChange={e => updateBlock(selectedBlock.id, { [field.key]: e.target.value })} className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ) : field.type === 'textarea' ? (
                  <textarea value={selectedBlock.content[field.key] || ''} onChange={e => updateBlock(selectedBlock.id, { [field.key]: e.target.value })} rows={4} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                ) : field.type === 'select' ? (
                  <select value={String(selectedBlock.content[field.key] || '')} onChange={e => updateBlock(selectedBlock.id, { [field.key]: e.target.value })} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    {field.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                ) : field.type === 'url' ? (
                  <input type="text" value={selectedBlock.content[field.key] || ''} onChange={e => updateBlock(selectedBlock.id, { [field.key]: e.target.value })} placeholder="https://..." className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                ) : (
                  <input type="text" value={selectedBlock.content[field.key] || ''} onChange={e => updateBlock(selectedBlock.id, { [field.key]: e.target.value })} className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  function groupByCategory() {
    const groups: Record<string, typeof BLOCK_CATALOG> = {};
    for (const item of BLOCK_CATALOG) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }
};

// Inline block preview for the canvas
const BlockPreview: React.FC<{ block: EmailBlock }> = ({ block }) => {
  const c = block.content;
  switch (block.type) {
    case 'hero':
      return (
        <div style={{ background: c.bg, color: c.text, textAlign: c.align, padding: '16px 8px', borderRadius: 6 }}>
          <p style={{ fontWeight: 800, fontSize: 14, margin: '0 0 2px' }}>{c.title}</p>
          {c.subtitle && <p style={{ fontSize: 10, margin: 0, opacity: 0.7 }}>{c.subtitle}</p>}
        </div>
      );
    case 'text':
      return <div style={{ textAlign: c.align, fontSize: 12, color: c.color, lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: c.text.substring(0, 120) }} />;
    case 'image':
      return <div style={{ textAlign: c.align }}><div style={{ width: '100%', height: 60, background: '#e2e8f0', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#94a3b8' }}>{c.src ? <img src={c.src} alt={c.alt} style={{ maxWidth: '100%', maxHeight: 60, borderRadius: c.borderRadius }} /> : 'Imagem'}</div></div>;
    case 'button':
      return <div style={{ textAlign: c.align }}><span style={{ display: 'inline-block', background: c.bgColor, color: c.textColor, padding: '6px 20px', borderRadius: c.borderRadius, fontSize: 12, fontWeight: 700 }}>{c.text}</span></div>;
    case 'divider':
      return <div style={{ borderTop: `${c.height} ${c.style} ${c.color}` }} />;
    case 'spacer':
      return <div style={{ height: c.height, background: '#f8fafc', border: '1px dashed #e2e8f0' }} />;
    case 'columns-2':
      return (
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, background: '#f1f5f9', padding: 8, borderRadius: 4, fontSize: 10, color: '#64748b' }}>Esquerda</div>
          <div style={{ flex: 1, background: '#f1f5f9', padding: 8, borderRadius: 4, fontSize: 10, color: '#64748b' }}>Direita</div>
        </div>
      );
    case 'columns-3':
      return (
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, background: '#f1f5f9', padding: 6, borderRadius: 4, fontSize: 9, color: '#64748b', textAlign: 'center' }}>1</div>
          <div style={{ flex: 1, background: '#f1f5f9', padding: 6, borderRadius: 4, fontSize: 9, color: '#64748b', textAlign: 'center' }}>2</div>
          <div style={{ flex: 1, background: '#f1f5f9', padding: 6, borderRadius: 4, fontSize: 9, color: '#64748b', textAlign: 'center' }}>3</div>
        </div>
      );
    case 'product-card':
      return (
        <div style={{ background: c.bgColor, borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ height: 50, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#94a3b8' }}>{c.image ? <img src={c.image} style={{ width: '100%', height: 50, objectFit: 'cover' }} /> : 'Produto'}</div>
          <div style={{ padding: 8 }}>
            <p style={{ fontWeight: 700, fontSize: 11, margin: '0 0 2px' }}>{c.name}</p>
            <p style={{ fontWeight: 800, fontSize: 13, color: '#0d9488', margin: '0 0 4px' }}>{c.price}</p>
            <span style={{ display: 'block', textAlign: 'center', background: '#0d9488', color: '#fff', padding: '4px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>{c.button}</span>
          </div>
        </div>
      );
    case 'social':
      return (
        <div style={{ background: c.bgColor, padding: 12, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 10, color: c.iconColor }}>
            <span>Facebook</span><span>Instagram</span><span>LinkedIn</span><span>YouTube</span>
          </div>
        </div>
      );
    case 'footer':
      return (
        <div style={{ background: c.bgColor, color: c.textColor, padding: 12, textAlign: 'center', fontSize: 10 }}>
          <p style={{ fontWeight: 700, margin: '0 0 2px' }}>{c.company}</p>
          <p style={{ margin: '0 0 2px' }}>{c.address}</p>
          {c.showUnsubscribe && <p style={{ margin: 0, textDecoration: 'underline', color: '#94a3b8' }}>Cancelar inscrição</p>}
        </div>
      );
    default:
      return null;
  }
};
