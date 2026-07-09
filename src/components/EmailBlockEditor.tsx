import React, { useState, useRef } from 'react';
import {
  Plus, Trash2, Eye, Code, Type, Image as ImageIcon, MousePointer, Minus, Square,
  Share2, X, Copy, AlignLeft, AlignCenter, AlignRight, MoveUp, MoveDown,
  Monitor, Smartphone, Settings, ChevronDown, ChevronRight, Layout, Columns,
  Palette, Globe, List, Heading1
} from 'lucide-react';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type ElementType = 'heading' | 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'social' | 'html' | 'list';

export interface EmailElement { id: string; type: ElementType; content: Record<string, any>; }

export interface EmailColumn {
  id: string;
  width: number;       // percentage e.g. 50
  bgColor: string;
  padding: string;
  valign: 'top' | 'middle' | 'bottom';
  elements: EmailElement[];
}

export interface EmailSection {
  id: string;
  bgColor: string;
  bgImage: string;
  padding: string;
  columns: EmailColumn[];
}

export interface GlobalStyles {
  emailBgColor: string;
  contentBgColor: string;
  emailWidth: number;
  fontFamily: string;
  textColor: string;
  linkColor: string;
}

export interface EmailDocument {
  sections: EmailSection[];
  globalStyles: GlobalStyles;
}

export interface EmailBlockEditorProps {
  doc: EmailDocument;
  onChange: (doc: EmailDocument) => void;
}

// ─────────────────────────────────────────────
// CONSTANTS & DEFAULTS
// ─────────────────────────────────────────────

const uid = () => crypto.randomUUID();

export const DEFAULT_GLOBAL_STYLES: GlobalStyles = {
  emailBgColor: '#e8eaed',
  contentBgColor: '#ffffff',
  emailWidth: 600,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  textColor: '#334155',
  linkColor: '#2563eb',
};

export const EMPTY_DOCUMENT: EmailDocument = { sections: [], globalStyles: DEFAULT_GLOBAL_STYLES };

const SECTION_PRESETS: { label: string; widths: number[]; visual: number[] }[] = [
  { label: 'Coluna Única',     widths: [100],          visual: [100] },
  { label: '2 Iguais',         widths: [50, 50],        visual: [50, 50] },
  { label: '1/3 + 2/3',        widths: [33, 67],        visual: [33, 67] },
  { label: '2/3 + 1/3',        widths: [67, 33],        visual: [67, 33] },
  { label: '3 Iguais',         widths: [33, 34, 33],    visual: [33, 34, 33] },
  { label: '4 Iguais',         widths: [25, 25, 25, 25], visual: [25, 25, 25, 25] },
  { label: 'Central (Margens)', widths: [15, 70, 15],    visual: [15, 70, 15] },
];

const ELEMENT_CATALOG: { type: ElementType; label: string; icon: any; category: string }[] = [
  { type: 'heading', label: 'Cabeçalho',    icon: Heading1,      category: 'Conteúdo' },
  { type: 'text',    label: 'Texto',         icon: Type,          category: 'Conteúdo' },
  { type: 'image',   label: 'Imagem',        icon: ImageIcon,     category: 'Conteúdo' },
  { type: 'list',    label: 'Lista',         icon: List,          category: 'Conteúdo' },
  { type: 'button',  label: 'Botão',         icon: MousePointer,  category: 'Ações' },
  { type: 'social',  label: 'Redes Sociais', icon: Share2,        category: 'Ações' },
  { type: 'html',    label: 'HTML Livre',    icon: Code,          category: 'Avançado' },
  { type: 'divider', label: 'Divisor',       icon: Minus,         category: 'Espaçamento' },
  { type: 'spacer',  label: 'Espaçador',     icon: Square,        category: 'Espaçamento' },
];

const ELEMENT_DEFAULTS: Record<ElementType, Record<string, any>> = {
  heading: { text: 'Seu Título Aqui', level: 'h2', color: '#0f172a', align: 'left', fontSize: '28px', fontWeight: '700', padding: '8px 0 4px' },
  text:    { html: '<p>Escreva seu texto aqui. Use <strong>negrito</strong>, <em>itálico</em> e <a href="#">links</a>.</p>', color: '#475569', align: 'left', fontSize: '15px', lineHeight: '1.7', padding: '4px 0' },
  image:   { src: '', alt: 'Imagem', width: '100%', borderRadius: '0px', link: '', align: 'center', padding: '0px' },
  button:  { text: 'Clique Aqui', url: '#', bgColor: '#2563eb', textColor: '#ffffff', borderRadius: '6px', align: 'center', fontSize: '15px', innerPadding: '14px 28px', blockPadding: '16px 0', fullWidth: false },
  divider: { color: '#e2e8f0', thickness: '1px', style: 'solid', padding: '12px 0' },
  spacer:  { height: '40px' },
  social:  {
    facebook: true, facebookUrl: 'https://facebook.com',
    instagram: true, instagramUrl: 'https://instagram.com',
    linkedin: false, linkedinUrl: 'https://linkedin.com',
    youtube: false, youtubeUrl: 'https://youtube.com',
    twitter: false, twitterUrl: 'https://twitter.com',
    whatsapp: false, whatsappUrl: 'https://wa.me/',
    iconSize: '38px', align: 'center', bgColor: 'transparent', padding: '16px 0', gap: '8px',
  },
  html:    { code: '<p style="margin:0;font-size:14px;color:#334155;">Seu HTML aqui</p>', padding: '8px 0' },
  list:    { items: ['Primeiro item', 'Segundo item', 'Terceiro item'], style: 'bullet', color: '#475569', fontSize: '15px', lineHeight: '1.8', padding: '4px 0' },
};

function makeColumn(width: number): EmailColumn {
  return { id: uid(), width, bgColor: 'transparent', padding: '8px', valign: 'top', elements: [] };
}
function makeSection(widths: number[]): EmailSection {
  return { id: uid(), bgColor: '#ffffff', bgImage: '', padding: '24px 40px', columns: widths.map(makeColumn) };
}

// ─────────────────────────────────────────────
// HTML GENERATION (table-based email HTML)
// ─────────────────────────────────────────────

const SOCIAL_NETS = [
  { key: 'facebook',  label: 'f',  color: '#1877f2' },
  { key: 'instagram', label: 'ig', color: '#e1306c' },
  { key: 'linkedin',  label: 'in', color: '#0a66c2' },
  { key: 'youtube',   label: '▶',  color: '#ff0000' },
  { key: 'twitter',   label: '𝕏',  color: '#000000' },
  { key: 'whatsapp',  label: 'W',  color: '#25d366' },
];

function renderElementHTML(el: EmailElement, ff: string): string {
  const c = el.content;
  switch (el.type) {
    case 'heading': {
      const lvl = c.level || 'h2';
      return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="${c.align}" style="padding:${c.padding};"><${lvl} style="margin:0;font-size:${c.fontSize};font-weight:${c.fontWeight};color:${c.color};font-family:${ff};line-height:1.3;">${c.text}</${lvl}></td></tr></table>`;
    }
    case 'text':
      return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="${c.align}" style="padding:${c.padding};color:${c.color};font-size:${c.fontSize};line-height:${c.lineHeight};font-family:${ff};">${c.html}</td></tr></table>`;
    case 'image': {
      const inner = `<img src="${c.src || 'https://placehold.co/600x300/e2e8f0/94a3b8?text=Imagem'}" alt="${c.alt}" style="display:block;max-width:100%;width:${c.width};border-radius:${c.borderRadius};" />`;
      const wrapped = c.link ? `<a href="${c.link}" style="display:block;">${inner}</a>` : inner;
      return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="${c.align}" style="padding:${c.padding};">${wrapped}</td></tr></table>`;
    }
    case 'button': {
      const style = `background:${c.bgColor};color:${c.textColor};padding:${c.innerPadding};border-radius:${c.borderRadius};font-size:${c.fontSize};font-weight:700;font-family:${ff};text-decoration:none;display:inline-block;`;
      return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="${c.align}" style="padding:${c.blockPadding};"><a href="${c.url}" style="${style}">${c.text}</a></td></tr></table>`;
    }
    case 'divider':
      return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td style="padding:${c.padding};"><hr style="border:none;border-top:${c.thickness} ${c.style} ${c.color};margin:0;" /></td></tr></table>`;
    case 'spacer':
      return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td style="height:${c.height};font-size:1px;line-height:${c.height};">&nbsp;</td></tr></table>`;
    case 'social': {
      const nets = SOCIAL_NETS.filter(n => c[n.key]);
      const cells = nets.map(n => `<td style="padding:0 ${parseInt(c.gap)/2 || 4}px;"><a href="${c[n.key + 'Url'] || '#'}" style="display:inline-block;width:${c.iconSize};height:${c.iconSize};background:${n.color};border-radius:50%;text-align:center;line-height:${c.iconSize};color:#fff;text-decoration:none;font-weight:800;font-size:13px;font-family:${ff};">${n.label}</a></td>`).join('');
      return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${c.bgColor};"><tr><td align="${c.align}" style="padding:${c.padding};"><table cellpadding="0" cellspacing="0" role="presentation"><tr>${cells}</tr></table></td></tr></table>`;
    }
    case 'html':
      return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td style="padding:${c.padding};">${c.code}</td></tr></table>`;
    case 'list': {
      const tag = c.style === 'numbered' ? 'ol' : 'ul';
      const listStyle = c.style === 'numbered' ? 'decimal' : c.style === 'none' ? 'none' : 'disc';
      const items = c.items.map((item: string) => `<li style="margin-bottom:4px;">${item}</li>`).join('');
      return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td style="padding:${c.padding};color:${c.color};font-size:${c.fontSize};line-height:${c.lineHeight};font-family:${ff};"><${tag} style="margin:0;padding-left:20px;list-style-type:${listStyle};">${items}</${tag}></td></tr></table>`;
    }
    default: return '';
  }
}

function renderColumnHTML(col: EmailColumn, ff: string): string {
  const els = col.elements.map(el => renderElementHTML(el, ff)).join('');
  return `<td width="${col.width}%" valign="${col.valign}" style="background:${col.bgColor};padding:${col.padding};">${els}</td>`;
}

function renderSectionHTML(section: EmailSection, gs: GlobalStyles): string {
  const ff = gs.fontFamily;
  const cols = section.columns.map(c => renderColumnHTML(c, ff)).join('');
  const bgStyle = section.bgImage ? `background:${section.bgColor} url('${section.bgImage}') center/cover;` : `background:${section.bgColor};`;
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="${bgStyle}padding:0;"><tr><td><table width="${gs.emailWidth}" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;max-width:100%;"><tr style="padding:0;">${cols}</tr></table></td></tr></table>`;
}

export function generateEmailHTML(doc: EmailDocument): string {
  const { sections, globalStyles: gs } = doc;
  const body = sections.map(s => renderSectionHTML(s, gs)).join('\n');
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Email</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
</head>
<body style="margin:0;padding:0;background:${gs.emailBgColor};font-family:${gs.fontFamily};">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${gs.emailBgColor};padding:24px 0;">
<tr><td align="center">
<table width="${gs.emailWidth}" cellpadding="0" cellspacing="0" role="presentation" style="background:${gs.contentBgColor};max-width:100%;">
<tr><td>
${body}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// ─────────────────────────────────────────────
// ELEMENT VISUAL PREVIEW (canvas, not email HTML)
// ─────────────────────────────────────────────

const ElementPreview: React.FC<{ el: EmailElement }> = ({ el }) => {
  const c = el.content;
  switch (el.type) {
    case 'heading': {
      const sizes: Record<string, string> = { h1: '32px', h2: '26px', h3: '20px', h4: '16px' };
      return <div style={{ fontSize: c.fontSize || sizes[c.level] || '26px', fontWeight: c.fontWeight, color: c.color, textAlign: c.align as any, padding: c.padding, lineHeight: 1.3 }}>{c.text}</div>;
    }
    case 'text':
      return <div style={{ color: c.color, fontSize: c.fontSize, lineHeight: c.lineHeight, textAlign: c.align as any, padding: c.padding }} dangerouslySetInnerHTML={{ __html: c.html }} />;
    case 'image': {
      const src = c.src || 'https://placehold.co/600x280/e2e8f0/94a3b8?text=Imagem';
      return <div style={{ textAlign: c.align as any, padding: c.padding }}><img src={src} alt={c.alt} style={{ width: c.width, borderRadius: c.borderRadius, maxWidth: '100%', display: 'block', ...(c.align === 'center' ? { margin: '0 auto' } : c.align === 'right' ? { marginLeft: 'auto' } : {}) }} /></div>;
    }
    case 'button':
      return <div style={{ textAlign: c.align as any, padding: c.blockPadding }}><a href="#" style={{ display: 'inline-block', background: c.bgColor, color: c.textColor, padding: c.innerPadding, borderRadius: c.borderRadius, fontSize: c.fontSize, fontWeight: 700, textDecoration: 'none' }} onClick={e => e.preventDefault()}>{c.text}</a></div>;
    case 'divider':
      return <div style={{ padding: c.padding }}><hr style={{ border: 'none', borderTop: `${c.thickness} ${c.style} ${c.color}`, margin: 0 }} /></div>;
    case 'spacer':
      return <div style={{ height: c.height, background: 'repeating-linear-gradient(45deg,#f8fafc,#f8fafc 3px,#e2e8f0 3px,#e2e8f0 6px)', opacity: 0.6 }} />;
    case 'social': {
      const visible = SOCIAL_NETS.filter(n => c[n.key]);
      return (
        <div style={{ textAlign: c.align as any, padding: c.padding, background: c.bgColor }}>
          {visible.map(n => (
            <span key={n.key} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: c.iconSize, height: c.iconSize, background: n.color, borderRadius: '50%', color: '#fff', fontWeight: 800, fontSize: 12, margin: `0 ${parseInt(c.gap || '8') / 2}px` }}>{n.label}</span>
          ))}
        </div>
      );
    }
    case 'html':
      return <div style={{ padding: c.padding }} dangerouslySetInnerHTML={{ __html: c.code }} />;
    case 'list': {
      const tag = c.style === 'numbered' ? 'ol' : 'ul';
      const listStyle = c.style === 'numbered' ? 'decimal' : c.style === 'none' ? 'none' : 'disc';
      return React.createElement(tag, { style: { margin: 0, padding: `${c.padding} 0 ${c.padding} 20px`, listStyleType: listStyle, color: c.color, fontSize: c.fontSize, lineHeight: c.lineHeight } },
        c.items.map((item: string, i: number) => <li key={i}>{item}</li>)
      );
    }
    default: return null;
  }
};

// ─────────────────────────────────────────────
// REUSABLE PROPERTY FIELD COMPONENTS
// ─────────────────────────────────────────────

const Fld: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">{label}</label>
    {children}
  </div>
);

const ColorFld: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <Fld label={label}>
    <div className="flex items-center gap-2">
      <label className="cursor-pointer shrink-0">
        <input type="color" value={value || '#ffffff'} onChange={e => onChange(e.target.value)} className="sr-only" />
        <div className="w-9 h-9 rounded-lg border-2 border-slate-200 shadow-sm cursor-pointer" style={{ background: value || '#ffffff' }} />
      </label>
      <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
        className="flex-1 px-2.5 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="#ffffff" />
    </div>
  </Fld>
);

const AlignFld: React.FC<{ label?: string; value: string; onChange: (v: string) => void }> = ({ label = 'Alinhamento', value, onChange }) => (
  <Fld label={label}>
    <div className="flex gap-1">
      {(['left', 'center', 'right'] as const).map(a => {
        const Icon = a === 'left' ? AlignLeft : a === 'center' ? AlignCenter : AlignRight;
        return <button key={a} onClick={() => onChange(a)} className={`flex-1 flex items-center justify-center py-2 rounded-lg border text-sm transition-all ${value === a ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-600'}`}><Icon size={14} /></button>;
      })}
    </div>
  </Fld>
);

const TextFld: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string }> = ({ label, value, onChange, placeholder }) => (
  <Fld label={label}>
    <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
  </Fld>
);

const UrlFld: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <Fld label={label}>
    <div className="flex items-center gap-1.5 px-2.5 py-2 border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-blue-500">
      <Globe size={12} className="text-slate-400 shrink-0" />
      <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder="https://"
        className="flex-1 text-xs focus:outline-none" />
    </div>
  </Fld>
);

const TxtAreaFld: React.FC<{ label: string; value: string; onChange: (v: string) => void; rows?: number; mono?: boolean }> = ({ label, value, onChange, rows = 4, mono }) => (
  <Fld label={label}>
    <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows}
      className={`w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed ${mono ? 'font-mono' : ''}`} />
  </Fld>
);

const SelectFld: React.FC<{ label: string; value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }> = ({ label, value, onChange, options }) => (
  <Fld label={label}>
    <select value={value || ''} onChange={e => onChange(e.target.value)}
      className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </Fld>
);

const ToggleFld: React.FC<{ label: string; value: boolean; onChange: (v: boolean) => void }> = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs font-semibold text-slate-600">{label}</span>
    <button onClick={() => onChange(!value)} className={`relative inline-flex items-center w-10 h-5 rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-slate-200'}`}>
      <span className={`inline-block w-3.5 h-3.5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  </div>
);

const PropSection: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{title}</span>
        {open ? <ChevronDown size={12} className="text-slate-400" /> : <ChevronRight size={12} className="text-slate-400" />}
      </button>
      {open && <div className="px-4 py-3 space-y-3.5">{children}</div>}
    </div>
  );
};

// ─────────────────────────────────────────────
// ELEMENT PROPERTIES PANELS
// ─────────────────────────────────────────────

const HeadingProps: React.FC<{ c: any; upd: (k: string, v: any) => void }> = ({ c, upd }) => (
  <>
    <PropSection title="Conteúdo">
      <TxtAreaFld label="Texto" value={c.text} onChange={v => upd('text', v)} rows={3} />
      <Fld label="Nível">
        <div className="flex gap-1">
          {['h1','h2','h3','h4'].map(lvl => (
            <button key={lvl} onClick={() => upd('level', lvl)}
              className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all ${c.level === lvl ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-500 hover:border-blue-300'}`}>
              {lvl.toUpperCase()}
            </button>
          ))}
        </div>
      </Fld>
    </PropSection>
    <PropSection title="Estilo">
      <AlignFld value={c.align} onChange={v => upd('align', v)} />
      <ColorFld label="Cor" value={c.color} onChange={v => upd('color', v)} />
      <TextFld label="Tamanho da fonte" value={c.fontSize} onChange={v => upd('fontSize', v)} placeholder="28px" />
      <SelectFld label="Peso" value={c.fontWeight} onChange={v => upd('fontWeight', v)} options={[{label:'Normal',value:'400'},{label:'Semi-bold',value:'600'},{label:'Bold',value:'700'},{label:'Extra-bold',value:'800'}]} />
    </PropSection>
    <PropSection title="Espaçamento" defaultOpen={false}>
      <TextFld label="Padding" value={c.padding} onChange={v => upd('padding', v)} placeholder="8px 0" />
    </PropSection>
  </>
);

const TextProps: React.FC<{ c: any; upd: (k: string, v: any) => void }> = ({ c, upd }) => (
  <>
    <PropSection title="Conteúdo">
      <TxtAreaFld label="HTML do texto" value={c.html} onChange={v => upd('html', v)} rows={5} mono />
    </PropSection>
    <PropSection title="Estilo">
      <AlignFld value={c.align} onChange={v => upd('align', v)} />
      <ColorFld label="Cor" value={c.color} onChange={v => upd('color', v)} />
      <TextFld label="Tamanho da fonte" value={c.fontSize} onChange={v => upd('fontSize', v)} placeholder="15px" />
      <TextFld label="Espaçamento entre linhas" value={c.lineHeight} onChange={v => upd('lineHeight', v)} placeholder="1.7" />
    </PropSection>
    <PropSection title="Espaçamento" defaultOpen={false}>
      <TextFld label="Padding" value={c.padding} onChange={v => upd('padding', v)} placeholder="4px 0" />
    </PropSection>
  </>
);

const ImageProps: React.FC<{ c: any; upd: (k: string, v: any) => void }> = ({ c, upd }) => (
  <>
    <PropSection title="Conteúdo">
      <UrlFld label="URL da Imagem" value={c.src} onChange={v => upd('src', v)} />
      <TextFld label="Texto alternativo" value={c.alt} onChange={v => upd('alt', v)} placeholder="Descrição da imagem" />
      <UrlFld label="Link (ao clicar)" value={c.link} onChange={v => upd('link', v)} />
    </PropSection>
    <PropSection title="Estilo">
      <AlignFld value={c.align} onChange={v => upd('align', v)} />
      <TextFld label="Largura" value={c.width} onChange={v => upd('width', v)} placeholder="100%" />
      <TextFld label="Arredondamento" value={c.borderRadius} onChange={v => upd('borderRadius', v)} placeholder="0px" />
    </PropSection>
    <PropSection title="Espaçamento" defaultOpen={false}>
      <TextFld label="Padding" value={c.padding} onChange={v => upd('padding', v)} placeholder="0px" />
    </PropSection>
  </>
);

const ButtonProps: React.FC<{ c: any; upd: (k: string, v: any) => void }> = ({ c, upd }) => (
  <>
    <PropSection title="Conteúdo">
      <TextFld label="Texto do botão" value={c.text} onChange={v => upd('text', v)} />
      <UrlFld label="URL de destino" value={c.url} onChange={v => upd('url', v)} />
    </PropSection>
    <PropSection title="Estilo">
      <AlignFld label="Posição" value={c.align} onChange={v => upd('align', v)} />
      <ColorFld label="Cor de fundo" value={c.bgColor} onChange={v => upd('bgColor', v)} />
      <ColorFld label="Cor do texto" value={c.textColor} onChange={v => upd('textColor', v)} />
      <TextFld label="Tamanho da fonte" value={c.fontSize} onChange={v => upd('fontSize', v)} placeholder="15px" />
      <TextFld label="Arredondamento" value={c.borderRadius} onChange={v => upd('borderRadius', v)} placeholder="6px" />
      <ToggleFld label="Largura total" value={c.fullWidth === true} onChange={v => upd('fullWidth', v)} />
    </PropSection>
    <PropSection title="Espaçamento" defaultOpen={false}>
      <TextFld label="Padding interno (botão)" value={c.innerPadding} onChange={v => upd('innerPadding', v)} placeholder="14px 28px" />
      <TextFld label="Padding externo (bloco)" value={c.blockPadding} onChange={v => upd('blockPadding', v)} placeholder="16px 0" />
    </PropSection>
  </>
);

const DividerProps: React.FC<{ c: any; upd: (k: string, v: any) => void }> = ({ c, upd }) => (
  <>
    <PropSection title="Estilo">
      <ColorFld label="Cor" value={c.color} onChange={v => upd('color', v)} />
      <TextFld label="Espessura" value={c.thickness} onChange={v => upd('thickness', v)} placeholder="1px" />
      <SelectFld label="Estilo" value={c.style} onChange={v => upd('style', v)} options={[{label:'Sólido',value:'solid'},{label:'Tracejado',value:'dashed'},{label:'Pontilhado',value:'dotted'}]} />
    </PropSection>
    <PropSection title="Espaçamento" defaultOpen={false}>
      <TextFld label="Padding" value={c.padding} onChange={v => upd('padding', v)} placeholder="12px 0" />
    </PropSection>
  </>
);

const SpacerProps: React.FC<{ c: any; upd: (k: string, v: any) => void }> = ({ c, upd }) => (
  <PropSection title="Espaçamento">
    <TextFld label="Altura" value={c.height} onChange={v => upd('height', v)} placeholder="40px" />
  </PropSection>
);

const SocialProps: React.FC<{ c: any; upd: (k: string, v: any) => void }> = ({ c, upd }) => (
  <>
    <PropSection title="Redes Sociais">
      {SOCIAL_NETS.map(n => (
        <div key={n.key} className="space-y-1.5">
          <ToggleFld label={n.key.charAt(0).toUpperCase() + n.key.slice(1)} value={!!c[n.key]} onChange={v => upd(n.key, v)} />
          {c[n.key] && <UrlFld label="" value={c[n.key + 'Url']} onChange={v => upd(n.key + 'Url', v)} />}
        </div>
      ))}
    </PropSection>
    <PropSection title="Estilo">
      <AlignFld value={c.align} onChange={v => upd('align', v)} />
      <TextFld label="Tamanho dos ícones" value={c.iconSize} onChange={v => upd('iconSize', v)} placeholder="38px" />
      <TextFld label="Espaço entre ícones" value={c.gap} onChange={v => upd('gap', v)} placeholder="8px" />
      <ColorFld label="Cor de fundo" value={c.bgColor} onChange={v => upd('bgColor', v)} />
    </PropSection>
    <PropSection title="Espaçamento" defaultOpen={false}>
      <TextFld label="Padding" value={c.padding} onChange={v => upd('padding', v)} placeholder="16px 0" />
    </PropSection>
  </>
);

const HtmlProps: React.FC<{ c: any; upd: (k: string, v: any) => void }> = ({ c, upd }) => (
  <>
    <PropSection title="Código HTML">
      <TxtAreaFld label="HTML" value={c.code} onChange={v => upd('code', v)} rows={8} mono />
    </PropSection>
    <PropSection title="Espaçamento" defaultOpen={false}>
      <TextFld label="Padding" value={c.padding} onChange={v => upd('padding', v)} placeholder="8px 0" />
    </PropSection>
  </>
);

const ListProps: React.FC<{ c: any; upd: (k: string, v: any) => void }> = ({ c, upd }) => (
  <>
    <PropSection title="Conteúdo">
      <Fld label="Itens (um por linha)">
        <textarea
          value={(c.items || []).join('\n')}
          onChange={e => upd('items', e.target.value.split('\n'))}
          rows={5}
          className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </Fld>
      <SelectFld label="Tipo" value={c.style} onChange={v => upd('style', v)} options={[{label:'Marcadores',value:'bullet'},{label:'Numerada',value:'numbered'},{label:'Sem marcador',value:'none'}]} />
    </PropSection>
    <PropSection title="Estilo">
      <ColorFld label="Cor" value={c.color} onChange={v => upd('color', v)} />
      <TextFld label="Tamanho da fonte" value={c.fontSize} onChange={v => upd('fontSize', v)} placeholder="15px" />
      <TextFld label="Espaçamento entre linhas" value={c.lineHeight} onChange={v => upd('lineHeight', v)} placeholder="1.8" />
    </PropSection>
    <PropSection title="Espaçamento" defaultOpen={false}>
      <TextFld label="Padding" value={c.padding} onChange={v => upd('padding', v)} placeholder="4px 0" />
    </PropSection>
  </>
);

const ELEMENT_PROPS_MAP: Record<ElementType, React.FC<{ c: any; upd: (k: string, v: any) => void }>> = {
  heading: HeadingProps,
  text:    TextProps,
  image:   ImageProps,
  button:  ButtonProps,
  divider: DividerProps,
  spacer:  SpacerProps,
  social:  SocialProps,
  html:    HtmlProps,
  list:    ListProps,
};

// ─────────────────────────────────────────────
// SECTION / COLUMN / GLOBAL PROPERTIES
// ─────────────────────────────────────────────

const SectionPropsPanel: React.FC<{
  section: EmailSection;
  onUpdate: (upd: Partial<EmailSection>) => void;
  onChangeLayout: (widths: number[]) => void;
}> = ({ section, onUpdate, onChangeLayout }) => (
  <div className="flex-1 overflow-y-auto">
    <PropSection title="Layout de Colunas">
      <div className="grid grid-cols-2 gap-2">
        {SECTION_PRESETS.map(p => (
          <button key={p.label} onClick={() => onChangeLayout(p.widths)}
            className="flex flex-col items-center gap-1.5 p-2.5 border border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded-lg transition-all group">
            <div className="flex gap-0.5 w-full">
              {p.visual.map((w, i) => (
                <div key={i} className="h-4 bg-slate-200 group-hover:bg-blue-200 rounded-sm transition-colors" style={{ flex: w }} />
              ))}
            </div>
            <span className="text-[10px] text-slate-500 group-hover:text-blue-600 font-medium">{p.label}</span>
          </button>
        ))}
      </div>
    </PropSection>
    <PropSection title="Fundo">
      <ColorFld label="Cor de fundo" value={section.bgColor} onChange={v => onUpdate({ bgColor: v })} />
      <UrlFld label="Imagem de fundo (URL)" value={section.bgImage} onChange={v => onUpdate({ bgImage: v })} />
    </PropSection>
    <PropSection title="Espaçamento" defaultOpen={false}>
      <TextFld label="Padding" value={section.padding} onChange={v => onUpdate({ padding: v })} placeholder="24px 40px" />
    </PropSection>
  </div>
);

const ColumnPropsPanel: React.FC<{
  column: EmailColumn;
  onUpdate: (upd: Partial<EmailColumn>) => void;
}> = ({ column, onUpdate }) => (
  <div className="flex-1 overflow-y-auto">
    <PropSection title="Fundo">
      <ColorFld label="Cor de fundo" value={column.bgColor} onChange={v => onUpdate({ bgColor: v })} />
    </PropSection>
    <PropSection title="Espaçamento" defaultOpen={false}>
      <TextFld label="Padding interno" value={column.padding} onChange={v => onUpdate({ padding: v })} placeholder="8px" />
    </PropSection>
    <PropSection title="Alinhamento vertical" defaultOpen={false}>
      <div className="flex gap-1">
        {(['top','middle','bottom'] as const).map(v => (
          <button key={v} onClick={() => onUpdate({ valign: v })}
            className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all ${column.valign === v ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-500 hover:border-blue-300'}`}>
            {v === 'top' ? 'Topo' : v === 'middle' ? 'Meio' : 'Base'}
          </button>
        ))}
      </div>
    </PropSection>
  </div>
);

const GlobalStylesPanel: React.FC<{ gs: GlobalStyles; onChange: (gs: GlobalStyles) => void }> = ({ gs, onChange }) => {
  const upd = (k: keyof GlobalStyles, v: any) => onChange({ ...gs, [k]: v });
  return (
    <div className="flex-1 overflow-y-auto">
      <PropSection title="Fundo do Email">
        <ColorFld label="Cor de fundo externa" value={gs.emailBgColor} onChange={v => upd('emailBgColor', v)} />
        <ColorFld label="Cor de fundo do conteúdo" value={gs.contentBgColor} onChange={v => upd('contentBgColor', v)} />
      </PropSection>
      <PropSection title="Tipografia">
        <SelectFld label="Família de fonte" value={gs.fontFamily} onChange={v => upd('fontFamily', v)} options={[
          { label: 'Sistema (padrão)', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
          { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
          { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
          { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
          { label: 'Trebuchet MS', value: '"Trebuchet MS", Arial, sans-serif' },
        ]} />
        <ColorFld label="Cor padrão do texto" value={gs.textColor} onChange={v => upd('textColor', v)} />
        <ColorFld label="Cor dos links" value={gs.linkColor} onChange={v => upd('linkColor', v)} />
      </PropSection>
      <PropSection title="Layout" defaultOpen={false}>
        <Fld label={`Largura do email: ${gs.emailWidth}px`}>
          <input type="range" min={400} max={800} step={20} value={gs.emailWidth} onChange={e => upd('emailWidth', Number(e.target.value))}
            className="w-full accent-blue-600" />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>400px</span><span>600px</span><span>800px</span></div>
        </Fld>
      </PropSection>
    </div>
  );
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

type SelLevel = 'section' | 'column' | 'element';
interface Sel { level: SelLevel; sectionId: string; columnId?: string; elementId?: string; }

export const EmailBlockEditor: React.FC<EmailBlockEditorProps> = ({ doc, onChange }) => {
  const { sections, globalStyles: gs } = doc;
  const [sel, setSel] = useState<Sel | null>(null);
  const [hovSec, setHovSec] = useState<string | null>(null);
  const [hovCol, setHovCol] = useState<string | null>(null);
  const [hovEl, setHovEl] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<{ sectionId: string; columnId: string } | null>(null);
  const [leftTab, setLeftTab] = useState<'elements' | 'sections'>('elements');
  const [showPreview, setShowPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [showHTML, setShowHTML] = useState(false);

  const upd = (fn: (d: EmailDocument) => EmailDocument) => onChange(fn(doc));
  const updSections = (fn: (ss: EmailSection[]) => EmailSection[]) => upd(d => ({ ...d, sections: fn(d.sections) }));
  const updGS = (newGs: GlobalStyles) => upd(d => ({ ...d, globalStyles: newGs }));

  // ── Section operations ──
  const addSection = (widths: number[], afterId?: string) => {
    const s = makeSection(widths);
    updSections(ss => {
      if (!afterId) return [...ss, s];
      const i = ss.findIndex(x => x.id === afterId);
      const n = [...ss]; n.splice(i + 1, 0, s); return n;
    });
    setSel({ level: 'section', sectionId: s.id });
  };

  const updateSection = (id: string, upd: Partial<EmailSection>) =>
    updSections(ss => ss.map(s => s.id === id ? { ...s, ...upd } : s));

  const deleteSection = (id: string) => {
    updSections(ss => ss.filter(s => s.id !== id));
    if (sel?.sectionId === id) setSel(null);
  };

  const duplicateSection = (id: string) => {
    const s = sections.find(x => x.id === id)!;
    const clone: EmailSection = { ...s, id: uid(), columns: s.columns.map(c => ({ ...c, id: uid(), elements: c.elements.map(e => ({ ...e, id: uid() })) })) };
    updSections(ss => { const i = ss.findIndex(x => x.id === id); const n = [...ss]; n.splice(i + 1, 0, clone); return n; });
    setSel({ level: 'section', sectionId: clone.id });
  };

  const moveSection = (id: string, dir: 'up' | 'down') => {
    updSections(ss => {
      const i = ss.findIndex(x => x.id === id);
      if ((dir === 'up' && i === 0) || (dir === 'down' && i === ss.length - 1)) return ss;
      const n = [...ss]; const j = dir === 'up' ? i - 1 : i + 1; [n[i], n[j]] = [n[j], n[i]]; return n;
    });
  };

  const changeLayout = (sectionId: string, widths: number[]) => {
    updSections(ss => ss.map(s => {
      if (s.id !== sectionId) return s;
      const newCols = widths.map((w, i) => s.columns[i] ? { ...s.columns[i], width: w } : makeColumn(w));
      return { ...s, columns: newCols };
    }));
  };

  // ── Column operations ──
  const updateColumn = (secId: string, colId: string, upd: Partial<EmailColumn>) =>
    updSections(ss => ss.map(s => s.id === secId ? { ...s, columns: s.columns.map(c => c.id === colId ? { ...c, ...upd } : c) } : s));

  // ── Element operations ──
  const addElement = (secId: string, colId: string, type: ElementType) => {
    const el: EmailElement = { id: uid(), type, content: { ...ELEMENT_DEFAULTS[type] } };
    updSections(ss => ss.map(s => s.id === secId ? {
      ...s, columns: s.columns.map(c => c.id === colId ? { ...c, elements: [...c.elements, el] } : c)
    } : s));
    setSel({ level: 'element', sectionId: secId, columnId: colId, elementId: el.id });
  };

  const updateElement = (secId: string, colId: string, elId: string, content: Record<string, any>) =>
    updSections(ss => ss.map(s => s.id === secId ? {
      ...s, columns: s.columns.map(c => c.id === colId ? {
        ...c, elements: c.elements.map(e => e.id === elId ? { ...e, content } : e)
      } : c)
    } : s));

  const deleteElement = (secId: string, colId: string, elId: string) => {
    updSections(ss => ss.map(s => s.id === secId ? {
      ...s, columns: s.columns.map(c => c.id === colId ? { ...c, elements: c.elements.filter(e => e.id !== elId) } : c)
    } : s));
    if (sel?.elementId === elId) setSel({ level: 'column', sectionId: secId, columnId: colId });
  };

  const duplicateElement = (secId: string, colId: string, elId: string) => {
    updSections(ss => ss.map(s => s.id === secId ? {
      ...s, columns: s.columns.map(c => {
        if (c.id !== colId) return c;
        const i = c.elements.findIndex(e => e.id === elId);
        const clone = { ...c.elements[i], id: uid(), content: { ...c.elements[i].content } };
        const els = [...c.elements]; els.splice(i + 1, 0, clone);
        return { ...c, elements: els };
      })
    } : s));
  };

  const moveElement = (secId: string, colId: string, elId: string, dir: 'up' | 'down') => {
    updSections(ss => ss.map(s => s.id === secId ? {
      ...s, columns: s.columns.map(c => {
        if (c.id !== colId) return c;
        const els = [...c.elements];
        const i = els.findIndex(e => e.id === elId);
        if ((dir === 'up' && i === 0) || (dir === 'down' && i === els.length - 1)) return c;
        const j = dir === 'up' ? i - 1 : i + 1; [els[i], els[j]] = [els[j], els[i]];
        return { ...c, elements: els };
      })
    } : s));
  };

  // ── Selected item resolution ──
  const selSection = sel ? sections.find(s => s.id === sel.sectionId) : null;
  const selColumn = selSection && sel?.columnId ? selSection.columns.find(c => c.id === sel.columnId) : null;
  const selElement = selColumn && sel?.elementId ? selColumn.elements.find(e => e.id === sel.elementId) : null;

  // ── Preview ──
  if (showPreview) {
    const html = generateEmailHTML(doc);
    return (
      <div className="h-full flex flex-col" style={{ background: '#e8eaed' }}>
        <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-slate-900">Preview</h3>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              {(['desktop','mobile'] as const).map(d => (
                <button key={d} onClick={() => setPreviewDevice(d)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${previewDevice === d ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                  {d === 'desktop' ? <Monitor size={13} /> : <Smartphone size={13} />}
                  {d === 'desktop' ? 'Desktop' : 'Mobile'}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setShowPreview(false)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors">
            <X size={13} />Fechar Preview
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-10 px-4 flex justify-center items-start">
          <div className={`bg-white shadow-2xl transition-all ${previewDevice === 'mobile' ? 'w-[390px]' : `w-full max-w-[${gs.emailWidth}px]`}`}
            dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
    );
  }

  if (showHTML) {
    const html = generateEmailHTML(doc);
    return (
      <div className="h-full flex flex-col">
        <div className="bg-slate-900 border-b border-slate-700 px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Code size={16} className="text-green-400" />
            <h3 className="text-sm font-bold text-white">HTML do Email</h3>
            <span className="text-xs text-slate-400">{html.length.toLocaleString()} caracteres</span>
          </div>
          <div className="flex gap-2">
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
        <textarea readOnly value={html} className="flex-1 p-5 font-mono text-xs bg-slate-950 text-green-400 resize-none focus:outline-none leading-relaxed" />
      </div>
    );
  }

  // ── Main 3-panel layout ──
  return (
    <div className="h-full flex" style={{ background: '#e8eaed' }}>

      {/* ── LEFT PANEL ── */}
      <div className="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden shadow-sm">
        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 shrink-0">
          <button onClick={() => setLeftTab('elements')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-colors border-b-2 ${leftTab === 'elements' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <Layout size={14} />Elementos
          </button>
          <button onClick={() => setLeftTab('sections')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-colors border-b-2 ${leftTab === 'sections' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <Columns size={14} />Seções
          </button>
        </div>

        {leftTab === 'elements' ? (
          <div className="flex-1 overflow-y-auto py-2">
            {(() => {
              const cats = [...new Set(ELEMENT_CATALOG.map(e => e.category))];
              return cats.map(cat => (
                <div key={cat} className="mb-1">
                  <div className="px-4 py-1.5"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cat}</span></div>
                  <div className="px-2 space-y-0.5 pb-1">
                    {ELEMENT_CATALOG.filter(e => e.category === cat).map(item => {
                      const Icon = item.icon;
                      const isActive = sel?.level === 'column' || sel?.level === 'element';
                      return (
                        <div key={item.type}
                          draggable
                          onDragStart={e => { e.dataTransfer.setData('elementType', item.type); e.dataTransfer.effectAllowed = 'copy'; }}
                          onClick={() => {
                            if (sel?.columnId) addElement(sel.sectionId, sel.columnId, item.type);
                          }}
                          className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all cursor-grab active:cursor-grabbing select-none ${isActive ? 'hover:bg-blue-50 hover:border-blue-100' : 'hover:bg-slate-50'} border border-transparent`}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isActive ? 'bg-blue-50 group-hover:bg-blue-100' : 'bg-slate-100 group-hover:bg-slate-200'}`}>
                            <Icon size={14} className={isActive ? 'text-blue-600' : 'text-slate-500'} />
                          </div>
                          <span className="text-xs font-medium text-slate-700 flex-1">{item.label}</span>
                          <Plus size={11} className="text-slate-300 group-hover:text-blue-400 transition-colors shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
            {!(sel?.level === 'column' || sel?.level === 'element') && (
              <p className="px-4 py-3 text-[10px] text-slate-400 leading-relaxed">Selecione uma coluna no canvas para adicionar elementos, ou arraste um elemento diretamente.</p>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-3">
            <p className="text-[10px] text-slate-400 mb-3 px-1">Clique para adicionar uma seção ao email</p>
            <div className="space-y-2">
              {SECTION_PRESETS.map(p => (
                <button key={p.label} onClick={() => addSection(p.widths, sel?.sectionId)}
                  className="w-full group flex items-center gap-3 px-3 py-2.5 border border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl transition-all text-left">
                  <div className="flex gap-0.5 shrink-0" style={{ width: 48 }}>
                    {p.visual.map((w, i) => (
                      <div key={i} className="h-6 bg-slate-200 group-hover:bg-blue-200 rounded-sm transition-colors" style={{ flex: w }} />
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-slate-600 group-hover:text-blue-700 flex-1">{p.label}</span>
                  <Plus size={12} className="text-slate-300 group-hover:text-blue-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── CENTER CANVAS ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Canvas toolbar */}
        <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">{sections.length} seção{sections.length !== 1 ? 'ões' : ''}</span>
            {sel && (
              <span className="text-[11px] text-blue-700 font-semibold bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                {sel.level === 'section' ? 'Seção' : sel.level === 'column' ? 'Coluna' : selElement ? (ELEMENT_CATALOG.find(e => e.type === selElement.type)?.label || 'Elemento') : 'Elemento'} selecionado
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowPreview(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-all">
              <Eye size={13} />Preview
            </button>
            <button onClick={() => setShowHTML(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-all">
              <Code size={13} />HTML
            </button>
          </div>
        </div>

        {/* Canvas scroll area */}
        <div className="flex-1 overflow-y-auto py-6 px-4" style={{ background: gs.emailBgColor }}
          onClick={() => setSel(null)}>

          {/* Email container */}
          <div className="mx-auto shadow-2xl" style={{ maxWidth: gs.emailWidth, background: gs.contentBgColor }} onClick={e => e.stopPropagation()}>

            {sections.length === 0 && (
              <div className="py-24 text-center border-2 border-dashed border-slate-300 rounded-sm">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Layout size={24} className="text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-500 mb-1">Email vazio</p>
                <p className="text-xs text-slate-400 mb-4">Clique em "Seções" na barra lateral para adicionar seu primeiro layout</p>
                <div className="flex justify-center gap-2">
                  {SECTION_PRESETS.slice(0, 3).map(p => (
                    <button key={p.label} onClick={() => { setLeftTab('sections'); addSection(p.widths); }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors">{p.label}</button>
                  ))}
                </div>
              </div>
            )}

            {sections.map((section, si) => {
              const secSel = sel?.level === 'section' && sel.sectionId === section.id;
              const secHov = hovSec === section.id;
              const showSecBar = secSel || secHov;

              return (
                <div key={section.id} className="relative group/sec"
                  onMouseEnter={() => setHovSec(section.id)}
                  onMouseLeave={() => setHovSec(null)}>

                  {/* Section click target */}
                  <div
                    onClick={e => { e.stopPropagation(); setSel({ level: 'section', sectionId: section.id }); }}
                    className={`relative ${secSel ? 'outline outline-2 outline-blue-500' : secHov ? 'outline outline-1 outline-blue-300' : ''}`}
                    style={{ background: section.bgImage ? `${section.bgColor} url('${section.bgImage}') center/cover` : section.bgColor, padding: section.padding }}
                  >
                    {/* Section toolbar */}
                    {showSecBar && (
                      <div className="absolute top-0 right-0 z-50 flex items-center gap-0.5 bg-slate-800 rounded-bl-xl px-2 py-1.5 shadow-xl" onClick={e => e.stopPropagation()}>
                        <span className="text-[10px] text-slate-400 font-bold mr-1">Seção</span>
                        <div className="w-px h-3 bg-slate-600 mx-0.5" />
                        <button onClick={() => moveSection(section.id, 'up')} disabled={si === 0} className="p-1 text-slate-400 hover:text-white disabled:opacity-25 rounded transition-colors"><MoveUp size={11} /></button>
                        <button onClick={() => moveSection(section.id, 'down')} disabled={si === sections.length - 1} className="p-1 text-slate-400 hover:text-white disabled:opacity-25 rounded transition-colors"><MoveDown size={11} /></button>
                        <div className="w-px h-3 bg-slate-600 mx-0.5" />
                        <button onClick={() => duplicateSection(section.id)} className="p-1 text-slate-400 hover:text-white rounded transition-colors"><Copy size={11} /></button>
                        <button onClick={() => deleteSection(section.id)} className="p-1 text-red-400 hover:text-red-300 rounded transition-colors"><Trash2 size={11} /></button>
                      </div>
                    )}

                    {/* Columns row */}
                    <div className="flex" style={{ gap: 0 }}>
                      {section.columns.map((col, ci) => {
                        const colSel = sel?.level === 'column' && sel.columnId === col.id;
                        const colHov = hovCol === col.id;
                        const isDropTarget = dragTarget?.columnId === col.id;

                        return (
                          <div key={col.id}
                            style={{ width: `${col.width}%`, background: col.bgColor, padding: col.padding, verticalAlign: col.valign, minHeight: 80 }}
                            className={`relative transition-all ${colSel ? 'outline outline-2 outline-teal-500' : colHov ? 'outline outline-1 outline-teal-300' : ''} ${isDropTarget ? 'bg-blue-50 outline outline-2 outline-dashed outline-blue-400' : ''}`}
                            onMouseEnter={e => { e.stopPropagation(); setHovCol(col.id); }}
                            onMouseLeave={() => setHovCol(null)}
                            onClick={e => { e.stopPropagation(); setSel({ level: 'column', sectionId: section.id, columnId: col.id }); }}
                            onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragTarget({ sectionId: section.id, columnId: col.id }); }}
                            onDragLeave={e => { e.stopPropagation(); setDragTarget(null); }}
                            onDrop={e => { e.preventDefault(); e.stopPropagation(); const t = e.dataTransfer.getData('elementType'); if (t) addElement(section.id, col.id, t as ElementType); setDragTarget(null); }}
                          >
                            {/* Column label */}
                            {(colSel || colHov) && (
                              <div className="absolute top-0 left-0 z-40 bg-teal-600 rounded-br-lg px-2 py-0.5" onClick={e => e.stopPropagation()}>
                                <span className="text-[9px] text-white font-bold">Coluna {ci + 1} ({col.width}%)</span>
                              </div>
                            )}

                            {/* Elements */}
                            {col.elements.length === 0 && (
                              <div className={`flex items-center justify-center text-center py-8 rounded-lg border-2 border-dashed transition-colors ${isDropTarget ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}`}>
                                <div>
                                  <Plus size={18} className={`mx-auto mb-1 ${isDropTarget ? 'text-blue-400' : 'text-slate-300'}`} />
                                  <p className="text-[10px] text-slate-400">{isDropTarget ? 'Solte aqui' : 'Arraste ou clique um elemento'}</p>
                                </div>
                              </div>
                            )}

                            {col.elements.map((el, ei) => {
                              const elSel = sel?.level === 'element' && sel.elementId === el.id;
                              const elHov = hovEl === el.id;
                              const showElBar = elSel || elHov;
                              const catalog = ELEMENT_CATALOG.find(x => x.type === el.type);

                              return (
                                <div key={el.id}
                                  className={`relative group/el transition-all ${elSel ? 'outline outline-2 outline-orange-500' : elHov ? 'outline outline-1 outline-orange-300' : ''}`}
                                  onMouseEnter={e => { e.stopPropagation(); setHovEl(el.id); }}
                                  onMouseLeave={e => { e.stopPropagation(); setHovEl(null); }}
                                  onClick={e => { e.stopPropagation(); setSel({ level: 'element', sectionId: section.id, columnId: col.id, elementId: el.id }); }}
                                >
                                  {/* Element toolbar */}
                                  {showElBar && (
                                    <div className="absolute top-0 right-0 z-50 flex items-center gap-0.5 bg-orange-500 rounded-bl-lg px-1.5 py-1 shadow-lg" onClick={e => e.stopPropagation()}>
                                      <span className="text-[9px] text-orange-100 font-bold mr-1">{catalog?.label}</span>
                                      <div className="w-px h-3 bg-orange-300 mx-0.5" />
                                      <button onClick={() => moveElement(section.id, col.id, el.id, 'up')} disabled={ei === 0} className="p-0.5 text-orange-100 hover:text-white disabled:opacity-25"><MoveUp size={10} /></button>
                                      <button onClick={() => moveElement(section.id, col.id, el.id, 'down')} disabled={ei === col.elements.length - 1} className="p-0.5 text-orange-100 hover:text-white disabled:opacity-25"><MoveDown size={10} /></button>
                                      <div className="w-px h-3 bg-orange-300 mx-0.5" />
                                      <button onClick={() => duplicateElement(section.id, col.id, el.id)} className="p-0.5 text-orange-100 hover:text-white"><Copy size={10} /></button>
                                      <button onClick={() => deleteElement(section.id, col.id, el.id)} className="p-0.5 text-red-200 hover:text-white"><Trash2 size={10} /></button>
                                    </div>
                                  )}

                                  {/* Element content */}
                                  <div className="pointer-events-none select-none">
                                    <ElementPreview el={el} />
                                  </div>
                                </div>
                              );
                            })}

                            {/* Add element button (bottom of column) */}
                            {(colSel || colHov) && (
                              <button
                                onClick={e => { e.stopPropagation(); setLeftTab('elements'); setSel({ level: 'column', sectionId: section.id, columnId: col.id }); }}
                                className="w-full mt-2 py-2 border border-dashed border-teal-300 hover:border-teal-500 hover:bg-teal-50 rounded-lg text-[10px] text-teal-500 font-semibold flex items-center justify-center gap-1 transition-all"
                              >
                                <Plus size={11} />Adicionar elemento
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Insert section after strip */}
                  <div className="h-1 hover:h-10 transition-all duration-150 group/ins flex items-center justify-center relative cursor-pointer"
                    onClick={e => { e.stopPropagation(); addSection([100], section.id); }}>
                    <div className="opacity-0 group-hover/ins:opacity-100 transition-opacity flex items-center gap-1.5 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">
                      <Plus size={9} />Nova seção aqui
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add first section at bottom */}
            {sections.length > 0 && (
              <div className="py-3 flex items-center justify-center">
                <button onClick={() => addSection([100])}
                  className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-400 text-slate-600 hover:text-blue-700 rounded-xl text-xs font-semibold transition-all shadow-sm">
                  <Plus size={13} />Adicionar seção
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="w-72 shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden shadow-sm">

        {sel === null ? (
          /* Global styles panel */
          <>
            <div className="px-4 py-3 border-b border-slate-200 shrink-0 bg-slate-50">
              <div className="flex items-center gap-2">
                <Palette size={15} className="text-slate-500" />
                <div>
                  <p className="text-xs font-bold text-slate-900">Estilos Globais</p>
                  <p className="text-[10px] text-slate-400">Configurações gerais do email</p>
                </div>
              </div>
            </div>
            <GlobalStylesPanel gs={gs} onChange={updGS} />
          </>
        ) : sel.level === 'section' && selSection ? (
          /* Section properties */
          <>
            <div className="px-4 py-3 border-b border-slate-200 shrink-0 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layout size={15} className="text-slate-700" />
                <div>
                  <p className="text-xs font-bold text-slate-900">Seção</p>
                  <p className="text-[10px] text-slate-400">{selSection.columns.length} coluna{selSection.columns.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <button onClick={() => setSel(null)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full"><X size={13} /></button>
            </div>
            <SectionPropsPanel section={selSection} onUpdate={u => updateSection(selSection.id, u)} onChangeLayout={w => changeLayout(selSection.id, w)} />
            <div className="px-4 py-3 border-t border-slate-200 flex gap-2 shrink-0 bg-slate-50">
              <button onClick={() => duplicateSection(selSection.id)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-white text-slate-600 rounded-lg text-xs font-semibold transition-all"><Copy size={12} />Duplicar</button>
              <button onClick={() => deleteSection(selSection.id)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-red-100 hover:bg-red-50 text-red-500 rounded-lg text-xs font-semibold transition-all"><Trash2 size={12} />Excluir</button>
            </div>
          </>
        ) : sel.level === 'column' && selColumn ? (
          /* Column properties */
          <>
            <div className="px-4 py-3 border-b border-slate-200 shrink-0 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Columns size={15} className="text-teal-600" />
                <div>
                  <p className="text-xs font-bold text-slate-900">Coluna ({selColumn.width}%)</p>
                  <p className="text-[10px] text-slate-400">{selColumn.elements.length} elemento{selColumn.elements.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <button onClick={() => setSel({ level: 'section', sectionId: sel.sectionId })} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full"><X size={13} /></button>
            </div>
            <ColumnPropsPanel column={selColumn} onUpdate={u => updateColumn(sel.sectionId, selColumn.id, u)} />
          </>
        ) : sel.level === 'element' && selElement ? (
          /* Element properties */
          <>
            <div className="px-4 py-3 border-b border-slate-200 shrink-0 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(() => { const cat = ELEMENT_CATALOG.find(e => e.type === selElement.type); const Icon = cat?.icon || Settings; return <Icon size={15} className="text-orange-500" />; })()}
                <div>
                  <p className="text-xs font-bold text-slate-900">{ELEMENT_CATALOG.find(e => e.type === selElement.type)?.label}</p>
                  <p className="text-[10px] text-slate-400">Propriedades do elemento</p>
                </div>
              </div>
              <button onClick={() => sel?.columnId && setSel({ level: 'column', sectionId: sel.sectionId, columnId: sel.columnId })} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full"><X size={13} /></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {(() => {
                const Props = ELEMENT_PROPS_MAP[selElement.type];
                const upd = (k: string, v: any) => sel?.columnId && updateElement(sel.sectionId, sel.columnId, selElement.id, { ...selElement.content, [k]: v });
                return <Props c={selElement.content} upd={upd} />;
              })()}
            </div>
            <div className="px-4 py-3 border-t border-slate-200 flex gap-2 shrink-0 bg-slate-50">
              <button onClick={() => sel?.columnId && duplicateElement(sel.sectionId, sel.columnId, selElement.id)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-white text-slate-600 rounded-lg text-xs font-semibold transition-all"><Copy size={12} />Duplicar</button>
              <button onClick={() => sel?.columnId && deleteElement(sel.sectionId, sel.columnId, selElement.id)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-red-100 hover:bg-red-50 text-red-500 rounded-lg text-xs font-semibold transition-all"><Trash2 size={12} />Excluir</button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-3"><Settings size={20} className="text-slate-300" /></div>
            <p className="text-sm font-semibold text-slate-400">Nada selecionado</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">Clique em uma seção, coluna ou elemento para editar</p>
          </div>
        )}
      </div>
    </div>
  );
};
