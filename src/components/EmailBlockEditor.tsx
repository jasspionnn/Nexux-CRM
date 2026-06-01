import React, { useState, useRef } from 'react';
import {
  Plus, Trash2, GripVertical, Eye, Code, Type, Image as ImageIcon,
  MousePointer, Minus, Square, Columns, CreditCard, Share2, Mail,
  Layout, X, Copy, AlignLeft, AlignCenter, AlignRight,
  MoveUp, MoveDown, Monitor, Smartphone, Settings, ChevronDown, ChevronRight
} from 'lucide-react';

type BlockType = 'hero' | 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'columns-2' | 'columns-3' | 'product-card' | 'social' | 'footer';

interface EmailBlock {
  id: string;
  type: BlockType;
  content: Record<string, any>;
}

interface EmailBlockEditorProps {
  blocks: EmailBlock[];
  onChange: (blocks: EmailBlock[]) => void;
}

const BLOCK_CATALOG: { type: BlockType; label: string; icon: any; defaultContent: Record<string, any>; category: string }[] = [
  { type: 'hero', label: 'Hero Banner', icon: Layout, category: 'Layout', defaultContent: { bg: '#0f172a', text: '#ffffff', title: 'Título do Banner', subtitle: 'Subtítulo do banner aqui', align: 'center', padding: '48px 24px' } },
  { type: 'columns-2', label: '2 Colunas', icon: Columns, category: 'Layout', defaultContent: { gap: '16px', left: '<p>Coluna esquerda</p>', right: '<p>Coluna direita</p>', padding: '16px 0' } },
  { type: 'columns-3', label: '3 Colunas', icon: Columns, category: 'Layout', defaultContent: { gap: '16px', left: '<p>Esquerda</p>', center: '<p>Centro</p>', right: '<p>Direita</p>', padding: '16px 0' } },
  { type: 'text', label: 'Texto', icon: Type, category: 'Conteúdo', defaultContent: { text: '<p>Seu texto aqui. Você pode usar <strong>negrito</strong>, <em>itálico</em> e outros estilos.</p>', align: 'left', fontSize: '14px', color: '#334155', padding: '16px 24px' } },
  { type: 'image', label: 'Imagem', icon: ImageIcon, category: 'Conteúdo', defaultContent: { src: '', alt: 'Imagem', width: '100%', borderRadius: '0px', padding: '0px', align: 'center' } },
  { type: 'product-card', label: 'Produto', icon: CreditCard, category: 'Conteúdo', defaultContent: { image: '', name: 'Nome do Produto', description: 'Descrição do produto', price: 'R$ 99,90', button: 'Comprar', buttonUrl: '#', bgColor: '#f8fafc', padding: '24px' } },
  { type: 'button', label: 'Botão', icon: MousePointer, category: 'Ações', defaultContent: { text: 'Clique Aqui', url: '#', bgColor: '#0d9488', textColor: '#ffffff', borderRadius: '8px', width: 'auto', align: 'center', padding: '16px 24px', fontSize: '16px' } },
  { type: 'social', label: 'Redes Sociais', icon: Share2, category: 'Ações', defaultContent: { facebook: '#', instagram: '#', linkedin: '#', youtube: '#', bgColor: '#f1f5f9', iconColor: '#475569', padding: '24px' } },
  { type: 'divider', label: 'Divisor', icon: Minus, category: 'Espaçamento', defaultContent: { color: '#e2e8f0', height: '1px', style: 'solid', padding: '8px 24px' } },
  { type: 'spacer', label: 'Espaçador', icon: Square, category: 'Espaçamento', defaultContent: { height: '32px' } },
  { type: 'footer', label: 'Rodapé', icon: Mail, category: 'Rodapé', defaultContent: { company: 'Sua Empresa', address: 'Endereço da empresa, Cidade - UF', bgColor: '#f8fafc', textColor: '#64748b', fontSize: '12px', padding: '24px', showUnsubscribe: true } },
];

const renderBlockHTML = (block: EmailBlock): string => {
  const c = block.content;
  switch (block.type) {
    case 'hero':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.bg};padding:${c.padding};"><tr><td align="${c.align}" style="color:${c.text};font-family:-apple-system,BlinkMacSystemFont,sans-serif;"><h1 style="margin:0 0 8px;font-size:28px;font-weight:800;">${c.title}</h1>${c.subtitle ? `<p style="margin:0;font-size:16px;opacity:0.85;">${c.subtitle}</p>` : ''}</td></tr></table>`;
    case 'text':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:${c.padding};"><tr><td align="${c.align}" style="color:${c.color};font-size:${c.fontSize};line-height:1.7;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">${c.text}</td></tr></table>`;
    case 'image':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:${c.padding};"><tr><td align="${c.align}"><img src="${c.src || 'https://placehold.co/600x300/e2e8f0/94a3b8?text=Sua+Imagem'}" alt="${c.alt}" style="width:${c.width};border-radius:${c.borderRadius};display:block;max-width:100%;" /></td></tr></table>`;
    case 'button':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:${c.padding};"><tr><td align="${c.align}"><a href="${c.url}" style="display:inline-block;background:${c.bgColor};color:${c.textColor};padding:14px 32px;text-decoration:none;border-radius:${c.borderRadius};font-size:${c.fontSize};font-weight:700;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">${c.text}</a></td></tr></table>`;
    case 'divider':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:${c.padding};"><tr><td><hr style="border:none;border-top:${c.height} ${c.style} ${c.color};margin:0;" /></td></tr></table>`;
    case 'spacer':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:${c.height};font-size:1px;line-height:${c.height};">&nbsp;</td></tr></table>`;
    case 'columns-2':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:${c.padding};"><tr><td width="50%" valign="top" style="padding-right:${parseInt(c.gap) / 2}px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;color:#334155;">${c.left}</td><td width="50%" valign="top" style="padding-left:${parseInt(c.gap) / 2}px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;color:#334155;">${c.right}</td></tr></table>`;
    case 'columns-3':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:${c.padding};"><tr><td width="33%" valign="top" style="padding-right:${parseInt(c.gap) / 3}px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;color:#334155;">${c.left}</td><td width="34%" valign="top" style="padding:0 ${parseInt(c.gap) / 3}px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;color:#334155;">${c.center}</td><td width="33%" valign="top" style="padding-left:${parseInt(c.gap) / 3}px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;color:#334155;">${c.right}</td></tr></table>`;
    case 'product-card':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:${c.padding};"><tr><td style="background:${c.bgColor};border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td><img src="${c.image || 'https://placehold.co/600x250/e2e8f0/94a3b8?text=Produto'}" style="width:100%;display:block;border-radius:12px 12px 0 0;" /></td></tr><tr><td style="padding:20px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;"><h3 style="margin:0 0 6px;font-size:18px;font-weight:700;color:#0f172a;">${c.name}</h3><p style="margin:0 0 12px;font-size:14px;color:#64748b;line-height:1.5;">${c.description}</p><p style="margin:0 0 16px;font-size:24px;font-weight:800;color:#0d9488;">${c.price}</p><a href="${c.buttonUrl}" style="display:block;text-align:center;background:#0d9488;color:#fff;padding:12px;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">${c.button}</a></td></tr></table></td></tr></table>`;
    case 'social':
      const nets = [
        { key: 'facebook', label: 'f', color: '#1877f2' },
        { key: 'instagram', label: 'ig', color: '#e1306c' },
        { key: 'linkedin', label: 'in', color: '#0a66c2' },
        { key: 'youtube', label: 'yt', color: '#ff0000' },
      ];
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.bgColor};padding:${c.padding};"><tr><td align="center"><table role="presentation" cellpadding="0" cellspacing="0"><tr>${nets.map(n => `<td style="padding:0 6px;"><a href="${c[n.key]}" style="display:inline-block;width:40px;height:40px;background:${n.color};border-radius:50%;text-align:center;line-height:40px;color:#fff;text-decoration:none;font-weight:800;font-size:13px;font-family:-apple-system,sans-serif;">${n.label}</a></td>`).join('')}</tr></table></td></tr></table>`;
    case 'footer':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.bgColor};padding:${c.padding};border-top:1px solid #e2e8f0;"><tr><td align="center" style="color:${c.textColor};font-size:${c.fontSize};line-height:1.7;font-family:-apple-system,BlinkMacSystemFont,sans-serif;"><p style="margin:0 0 4px;font-weight:700;">${c.company}</p><p style="margin:0 0 4px;">${c.address}</p>${c.showUnsubscribe ? `<p style="margin:8px 0 0;"><a href="#" style="color:#94a3b8;text-decoration:underline;font-size:11px;">Cancelar inscrição</a></p>` : ''}</td></tr></table>`;
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
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:100%;">
        <tr><td>${bodyContent}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
};

type FieldType = 'text' | 'textarea' | 'color' | 'select' | 'url' | 'alignment' | 'toggle';

interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: { label: string; value: string }[];
  section?: string;
}

const BLOCK_CONFIGS: Record<BlockType, { label: string; fields: FieldDef[] }> = {
  hero: {
    label: 'Hero Banner', fields: [
      { key: 'title', label: 'Título', type: 'text', section: 'Conteúdo' },
      { key: 'subtitle', label: 'Subtítulo', type: 'text', section: 'Conteúdo' },
      { key: 'align', label: 'Alinhamento', type: 'alignment', section: 'Estilo' },
      { key: 'bg', label: 'Cor de Fundo', type: 'color', section: 'Estilo' },
      { key: 'text', label: 'Cor do Texto', type: 'color', section: 'Estilo' },
      { key: 'padding', label: 'Padding', type: 'text', section: 'Espaçamento' },
    ]
  },
  text: {
    label: 'Texto', fields: [
      { key: 'text', label: 'Conteúdo (HTML aceito)', type: 'textarea', section: 'Conteúdo' },
      { key: 'align', label: 'Alinhamento', type: 'alignment', section: 'Estilo' },
      { key: 'fontSize', label: 'Tamanho da Fonte', type: 'text', section: 'Estilo' },
      { key: 'color', label: 'Cor', type: 'color', section: 'Estilo' },
      { key: 'padding', label: 'Padding', type: 'text', section: 'Espaçamento' },
    ]
  },
  image: {
    label: 'Imagem', fields: [
      { key: 'src', label: 'URL da Imagem', type: 'url', section: 'Conteúdo' },
      { key: 'alt', label: 'Texto Alternativo', type: 'text', section: 'Conteúdo' },
      { key: 'align', label: 'Alinhamento', type: 'alignment', section: 'Estilo' },
      { key: 'width', label: 'Largura', type: 'text', section: 'Estilo' },
      { key: 'borderRadius', label: 'Arredondamento', type: 'text', section: 'Estilo' },
      { key: 'padding', label: 'Padding', type: 'text', section: 'Espaçamento' },
    ]
  },
  button: {
    label: 'Botão', fields: [
      { key: 'text', label: 'Texto do Botão', type: 'text', section: 'Conteúdo' },
      { key: 'url', label: 'Link (URL)', type: 'url', section: 'Conteúdo' },
      { key: 'align', label: 'Alinhamento', type: 'alignment', section: 'Estilo' },
      { key: 'bgColor', label: 'Cor de Fundo', type: 'color', section: 'Estilo' },
      { key: 'textColor', label: 'Cor do Texto', type: 'color', section: 'Estilo' },
      { key: 'fontSize', label: 'Tamanho', type: 'text', section: 'Estilo' },
      { key: 'borderRadius', label: 'Arredondamento', type: 'text', section: 'Estilo' },
      { key: 'padding', label: 'Padding', type: 'text', section: 'Espaçamento' },
    ]
  },
  divider: {
    label: 'Divisor', fields: [
      { key: 'color', label: 'Cor da Linha', type: 'color', section: 'Estilo' },
      { key: 'height', label: 'Espessura', type: 'text', section: 'Estilo' },
      { key: 'style', label: 'Estilo', type: 'select', options: [{ label: 'Sólido', value: 'solid' }, { label: 'Tracejado', value: 'dashed' }, { label: 'Pontilhado', value: 'dotted' }], section: 'Estilo' },
      { key: 'padding', label: 'Padding', type: 'text', section: 'Espaçamento' },
    ]
  },
  spacer: {
    label: 'Espaçador', fields: [
      { key: 'height', label: 'Altura', type: 'text', section: 'Espaçamento' },
    ]
  },
  'columns-2': {
    label: '2 Colunas', fields: [
      { key: 'left', label: 'Conteúdo Esquerda', type: 'textarea', section: 'Conteúdo' },
      { key: 'right', label: 'Conteúdo Direita', type: 'textarea', section: 'Conteúdo' },
      { key: 'gap', label: 'Espaço entre colunas', type: 'text', section: 'Espaçamento' },
      { key: 'padding', label: 'Padding externo', type: 'text', section: 'Espaçamento' },
    ]
  },
  'columns-3': {
    label: '3 Colunas', fields: [
      { key: 'left', label: 'Coluna 1', type: 'textarea', section: 'Conteúdo' },
      { key: 'center', label: 'Coluna 2', type: 'textarea', section: 'Conteúdo' },
      { key: 'right', label: 'Coluna 3', type: 'textarea', section: 'Conteúdo' },
      { key: 'gap', label: 'Espaço entre colunas', type: 'text', section: 'Espaçamento' },
      { key: 'padding', label: 'Padding externo', type: 'text', section: 'Espaçamento' },
    ]
  },
  'product-card': {
    label: 'Produto', fields: [
      { key: 'name', label: 'Nome do Produto', type: 'text', section: 'Conteúdo' },
      { key: 'description', label: 'Descrição', type: 'textarea', section: 'Conteúdo' },
      { key: 'price', label: 'Preço', type: 'text', section: 'Conteúdo' },
      { key: 'button', label: 'Texto do Botão', type: 'text', section: 'Conteúdo' },
      { key: 'buttonUrl', label: 'Link do Botão', type: 'url', section: 'Conteúdo' },
      { key: 'image', label: 'URL da Imagem', type: 'url', section: 'Conteúdo' },
      { key: 'bgColor', label: 'Cor de Fundo', type: 'color', section: 'Estilo' },
      { key: 'padding', label: 'Padding', type: 'text', section: 'Espaçamento' },
    ]
  },
  social: {
    label: 'Redes Sociais', fields: [
      { key: 'facebook', label: 'URL Facebook', type: 'url', section: 'Links' },
      { key: 'instagram', label: 'URL Instagram', type: 'url', section: 'Links' },
      { key: 'linkedin', label: 'URL LinkedIn', type: 'url', section: 'Links' },
      { key: 'youtube', label: 'URL YouTube', type: 'url', section: 'Links' },
      { key: 'bgColor', label: 'Cor de Fundo', type: 'color', section: 'Estilo' },
      { key: 'iconColor', label: 'Cor dos Ícones', type: 'color', section: 'Estilo' },
      { key: 'padding', label: 'Padding', type: 'text', section: 'Espaçamento' },
    ]
  },
  footer: {
    label: 'Rodapé', fields: [
      { key: 'company', label: 'Nome da Empresa', type: 'text', section: 'Conteúdo' },
      { key: 'address', label: 'Endereço', type: 'textarea', section: 'Conteúdo' },
      { key: 'showUnsubscribe', label: 'Link cancelar inscrição', type: 'toggle', section: 'Conteúdo' },
      { key: 'bgColor', label: 'Cor de Fundo', type: 'color', section: 'Estilo' },
      { key: 'textColor', label: 'Cor do Texto', type: 'color', section: 'Estilo' },
      { key: 'fontSize', label: 'Tamanho', type: 'text', section: 'Estilo' },
      { key: 'padding', label: 'Padding', type: 'text', section: 'Espaçamento' },
    ]
  },
};

export const EmailBlockEditor: React.FC<EmailBlockEditorProps> = ({ blocks, onChange }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showHTML, setShowHTML] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const dragIdxRef = useRef<number | null>(null);

  const groupByCategory = () => {
    const groups: Map<string, typeof BLOCK_CATALOG> = new Map();
    for (const item of BLOCK_CATALOG) {
      if (!groups.has(item.category)) groups.set(item.category, []);
      groups.get(item.category)!.push(item);
    }
    return Array.from(groups.entries());
  };

  const groupFieldsBySection = (fields: FieldDef[]) => {
    const groups: Map<string, FieldDef[]> = new Map();
    for (const field of fields) {
      const s = field.section || 'Geral';
      if (!groups.has(s)) groups.set(s, []);
      groups.get(s)!.push(field);
    }
    return Array.from(groups.entries());
  };

  const addBlock = (type: BlockType) => {
    const catalog = BLOCK_CATALOG.find(b => b.type === type)!;
    const newBlock: EmailBlock = { id: crypto.randomUUID(), type, content: { ...catalog.defaultContent } };
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
    onChange(blocks.filter(b => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const moveBlock = (id: string, dir: 'up' | 'down') => {
    const idx = blocks.findIndex(b => b.id === id);
    if ((dir === 'up' && idx === 0) || (dir === 'down' && idx === blocks.length - 1)) return;
    const nb = [...blocks];
    const si = dir === 'up' ? idx - 1 : idx + 1;
    [nb[idx], nb[si]] = [nb[si], nb[idx]];
    onChange(nb);
  };

  const duplicateBlock = (id: string) => {
    const block = blocks.find(b => b.id === id)!;
    const copy = { ...block, id: crypto.randomUUID(), content: { ...block.content } };
    onChange(insertAfter(blocks, id, copy));
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
    const nb = [...blocks];
    const [moved] = nb.splice(dragIdxRef.current, 1);
    nb.splice(targetIdx, 0, moved);
    onChange(nb);
    dragIdxRef.current = null;
  };

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const selectedBlock = blocks.find(b => b.id === selectedId);
  const selectedConfig = selectedBlock ? BLOCK_CONFIGS[selectedBlock.type] : null;

  const renderField = (field: FieldDef, block: EmailBlock) => {
    const value = block.content[field.key];
    const update = (val: any) => updateBlock(block.id, { [field.key]: val });

    if (field.type === 'alignment') {
      return (
        <div className="flex gap-1">
          {(['left', 'center', 'right'] as const).map(align => {
            const Icon = align === 'left' ? AlignLeft : align === 'center' ? AlignCenter : AlignRight;
            return (
              <button key={align} onClick={() => update(align)}
                className={`flex-1 flex items-center justify-center py-2 rounded-lg border transition-all text-sm ${value === align ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50'}`}>
                <Icon size={15} />
              </button>
            );
          })}
        </div>
      );
    }

    if (field.type === 'toggle') {
      const isOn = value === true || value === 'true';
      return (
        <div className="flex items-center gap-3">
          <button onClick={() => update(!isOn)}
            className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors focus:outline-none ${isOn ? 'bg-blue-600' : 'bg-slate-200'}`}>
            <span className={`inline-block w-4 h-4 bg-white rounded-full shadow-md transition-transform ${isOn ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <span className="text-xs text-slate-500">{isOn ? 'Ativado' : 'Desativado'}</span>
        </div>
      );
    }

    if (field.type === 'color') {
      return (
        <div className="flex items-center gap-2">
          <label className="relative cursor-pointer shrink-0">
            <input type="color" value={value || '#000000'} onChange={e => update(e.target.value)} className="sr-only" />
            <div className="w-10 h-10 rounded-lg border-2 border-slate-200 shadow-sm cursor-pointer hover:border-slate-300 transition-colors" style={{ background: value || '#000000' }} />
          </label>
          <input type="text" value={value || ''} onChange={e => update(e.target.value)}
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="#000000" />
        </div>
      );
    }

    if (field.type === 'textarea') {
      return (
        <textarea value={value || ''} onChange={e => update(e.target.value)} rows={4}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none leading-relaxed" />
      );
    }

    if (field.type === 'select') {
      return (
        <select value={String(value || '')} onChange={e => update(e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
          {field.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      );
    }

    return (
      <input type="text" value={value || ''} onChange={e => update(e.target.value)}
        placeholder={field.type === 'url' ? 'https://' : ''}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
    );
  };

  // ── Preview mode ──────────────────────────────────────────────────
  if (showPreview) {
    return (
      <div className="h-full flex flex-col bg-slate-200">
        <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-slate-900">Preview</h3>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button onClick={() => setPreviewMode('desktop')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${previewMode === 'desktop' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                <Monitor size={13} />Desktop
              </button>
              <button onClick={() => setPreviewMode('mobile')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${previewMode === 'mobile' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                <Smartphone size={13} />Mobile
              </button>
            </div>
          </div>
          <button onClick={() => setShowPreview(false)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors">
            <X size={13} />Fechar Preview
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-10 px-4 flex justify-center items-start">
          <div
            className={`bg-white shadow-2xl transition-all duration-300 ${previewMode === 'mobile' ? 'w-[390px]' : 'w-full max-w-[600px]'}`}
            dangerouslySetInnerHTML={{ __html: generateFullEmailHTML(blocks) }}
          />
        </div>
      </div>
    );
  }

  // ── HTML mode ──────────────────────────────────────────────────────
  if (showHTML) {
    const html = generateFullEmailHTML(blocks);
    return (
      <div className="h-full flex flex-col">
        <div className="bg-slate-900 border-b border-slate-700 px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Code size={16} className="text-green-400" />
            <h3 className="text-sm font-bold text-white">Código HTML</h3>
            <span className="text-xs text-slate-500">{html.length.toLocaleString()} caracteres</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigator.clipboard?.writeText(html)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-bold transition-colors">
              <Copy size={13} />Copiar
            </button>
            <button onClick={() => setShowHTML(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition-colors">
              <X size={13} />Fechar
            </button>
          </div>
        </div>
        <textarea readOnly value={html}
          className="flex-1 p-5 font-mono text-xs bg-slate-950 text-green-400 resize-none focus:outline-none leading-relaxed" />
      </div>
    );
  }

  // ── Main editor ────────────────────────────────────────────────────
  return (
    <div className="h-full flex" style={{ background: '#f0f2f5' }}>

      {/* LEFT SIDEBAR — Block Catalog */}
      <div className="w-60 shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 shrink-0">
          <p className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Blocos</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Clique para adicionar ao email</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {groupByCategory().map(([category, items]) => (
            <div key={category} className="mb-1">
              <div className="px-4 py-1.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{category}</span>
              </div>
              <div className="px-2 space-y-0.5 mb-2">
                {items.map(item => {
                  const Icon = item.icon;
                  return (
                    <button key={item.type} onClick={() => addBlock(item.type)}
                      className="w-full group flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-blue-50 transition-all text-left">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center shrink-0 transition-colors">
                        <Icon size={14} className="text-slate-500 group-hover:text-blue-600 transition-colors" />
                      </div>
                      <span className="text-xs font-medium text-slate-700 group-hover:text-blue-700 flex-1 transition-colors">{item.label}</span>
                      <Plus size={11} className="text-slate-300 group-hover:text-blue-400 transition-colors shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CENTER — Canvas */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Canvas toolbar */}
        <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium">{blocks.length} {blocks.length === 1 ? 'bloco' : 'blocos'}</span>
            {selectedId && selectedBlock && (
              <span className="text-[11px] text-blue-700 font-semibold bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                {BLOCK_CONFIGS[selectedBlock.type].label} selecionado
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowPreview(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-all">
              <Eye size={14} />Preview
            </button>
            <button onClick={() => setShowHTML(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-all">
              <Code size={14} />HTML
            </button>
          </div>
        </div>

        {/* Email canvas */}
        <div
          className="flex-1 overflow-y-auto py-8 px-4"
          style={{ background: '#e8eaed' }}
          onClick={() => setSelectedId(null)}
        >
          <div className="max-w-[600px] mx-auto" onClick={e => e.stopPropagation()}>
            <div className="bg-white shadow-2xl" style={{ minHeight: 200 }}>
              {blocks.length === 0 && (
                <div className="py-24 px-8 text-center border-2 border-dashed border-slate-200">
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Layout size={24} className="text-slate-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-500 mb-1">Email vazio</p>
                  <p className="text-xs text-slate-400">Clique em um bloco à esquerda para começar</p>
                </div>
              )}

              {blocks.map((block, idx) => {
                const isSelected = selectedId === block.id;
                const isHovered = hoveredId === block.id;
                const showActions = isSelected || isHovered;
                const catalog = BLOCK_CATALOG.find(b => b.type === block.type);

                return (
                  <div key={block.id}
                    className="relative"
                    onMouseEnter={() => setHoveredId(block.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    draggable
                    onDragStart={e => handleDragStart(e, idx)}
                    onDragOver={handleDragOver}
                    onDrop={e => handleDrop(e, idx)}
                  >
                    {/* Block click wrapper */}
                    <div
                      onClick={e => { e.stopPropagation(); setSelectedId(block.id); }}
                      className={`relative cursor-pointer transition-all duration-100 ${isSelected ? 'ring-2 ring-blue-500 ring-inset' : isHovered ? 'ring-1 ring-blue-300 ring-inset' : ''}`}
                    >
                      {/* Floating action bar */}
                      {showActions && (
                        <div className="absolute top-0 right-0 z-50 flex items-center gap-0.5 bg-blue-600 rounded-bl-lg px-2 py-1 shadow-lg">
                          {catalog && (
                            <>
                              <span className="text-[10px] text-blue-100 font-bold mr-1.5">{catalog.label}</span>
                              <div className="w-px h-3 bg-blue-400 mx-1" />
                            </>
                          )}
                          <button onClick={e => { e.stopPropagation(); moveBlock(block.id, 'up'); }}
                            disabled={idx === 0}
                            className="p-1 text-blue-200 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed rounded transition-colors"
                            title="Mover para cima">
                            <MoveUp size={11} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); moveBlock(block.id, 'down'); }}
                            disabled={idx === blocks.length - 1}
                            className="p-1 text-blue-200 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed rounded transition-colors"
                            title="Mover para baixo">
                            <MoveDown size={11} />
                          </button>
                          <div className="w-px h-3 bg-blue-400 mx-1" />
                          <button onClick={e => { e.stopPropagation(); duplicateBlock(block.id); }}
                            className="p-1 text-blue-200 hover:text-white rounded transition-colors"
                            title="Duplicar">
                            <Copy size={11} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); removeBlock(block.id); }}
                            className="p-1 text-red-300 hover:text-red-100 rounded transition-colors"
                            title="Excluir">
                            <Trash2 size={11} />
                          </button>
                          <div className="w-px h-3 bg-blue-400 mx-1" />
                          <div className="p-1 text-blue-200 cursor-grab active:cursor-grabbing">
                            <GripVertical size={11} />
                          </div>
                        </div>
                      )}

                      {/* Rendered block HTML — pointer-events-none so clicks reach wrapper */}
                      <div
                        className="pointer-events-none select-none"
                        dangerouslySetInnerHTML={{ __html: renderBlockHTML(block) }}
                      />
                    </div>

                    {/* Insert-after strip */}
                    <div
                      className="h-1 hover:h-8 transition-all duration-150 flex items-center justify-center group cursor-pointer relative"
                      style={{ background: 'transparent' }}
                      onClick={e => { e.stopPropagation(); setSelectedId(block.id); }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.06)' }}>
                        <div className="flex items-center gap-1.5 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md">
                          <Plus size={9} />Inserir bloco aqui
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR — Properties */}
      <div className="w-72 shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
        {selectedBlock && selectedConfig ? (
          <>
            {/* Panel header */}
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50">
              <div className="flex items-center gap-2">
                {(() => {
                  const cat = BLOCK_CATALOG.find(b => b.type === selectedBlock.type);
                  const Icon = cat?.icon || Settings;
                  return <Icon size={16} className="text-blue-600 shrink-0" />;
                })()}
                <div>
                  <p className="text-xs font-bold text-slate-900">{selectedConfig.label}</p>
                  <p className="text-[10px] text-slate-400">Propriedades do bloco</p>
                </div>
              </div>
              <button onClick={() => setSelectedId(null)}
                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                <X size={14} />
              </button>
            </div>

            {/* Fields */}
            <div className="flex-1 overflow-y-auto">
              {groupFieldsBySection(selectedConfig.fields).map(([section, fields]) => {
                const isCollapsed = collapsedSections.has(section);
                return (
                  <div key={section} className="border-b border-slate-100 last:border-0">
                    <button
                      onClick={() => toggleSection(section)}
                      className="w-full px-4 py-2.5 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{section}</span>
                      {isCollapsed ? <ChevronRight size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
                    </button>
                    {!isCollapsed && (
                      <div className="px-4 py-3 space-y-4">
                        {fields.map(field => (
                          <div key={field.key}>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">{field.label}</label>
                            {renderField(field, selectedBlock)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Panel footer actions */}
            <div className="px-4 py-3 border-t border-slate-200 flex gap-2 shrink-0 bg-slate-50">
              <button onClick={() => duplicateBlock(selectedBlock.id)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 hover:border-slate-300 hover:bg-white text-slate-600 rounded-lg text-xs font-semibold transition-all">
                <Copy size={12} />Duplicar
              </button>
              <button onClick={() => removeBlock(selectedBlock.id)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-red-100 hover:border-red-200 hover:bg-red-50 text-red-500 rounded-lg text-xs font-semibold transition-all">
                <Trash2 size={12} />Excluir
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
              <Settings size={20} className="text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-400">Nenhum bloco selecionado</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">Clique em um bloco no canvas para editar suas propriedades</p>
          </div>
        )}
      </div>
    </div>
  );
};
