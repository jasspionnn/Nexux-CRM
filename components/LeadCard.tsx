import React, { useState } from 'react';
import { Lead, User } from '../types.ts';
import { DollarSign, User as UserIcon, MoreHorizontal, Sparkles } from 'lucide-react';
import { generateLeadStrategy } from '../services/geminiService.ts';
import { useCRM } from '../context/CRMContext.tsx';

interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
  user?: User;
  funnelName: string;
  stageName: string;
}

export const LeadCard: React.FC<LeadCardProps> = ({ lead, onClick, user, funnelName, stageName }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const { updateLead } = useCRM();

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('leadId', lead.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleAiInsight = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setAiLoading(true);
    try {
      const insight = await generateLeadStrategy(lead, funnelName, stageName);
      
      const newNote = {
        id: `ai-${Date.now()}`,
        content: `🤖 Insight IA: ${insight}`,
        createdAt: new Date().toISOString(),
        authorName: 'Nexus AI'
      };
      
      updateLead(lead.id, { 
        notes: [newNote, ...lead.notes] 
      });
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing 
        hover:shadow-md transition-all duration-200 relative group
      `}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 truncate max-w-[120px]">
          {lead.company}
        </span>
        {isHovered && (
          <button className="text-gray-400 hover:text-gray-600">
            <MoreHorizontal size={16} />
          </button>
        )}
      </div>
      
      <h4 className="text-sm font-medium text-gray-800 mb-3 leading-tight">{lead.title}</h4>
      
      <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
        <div className="flex items-center gap-1">
          <DollarSign size={12} />
          <span>{lead.value.toLocaleString()}</span>
        </div>
        {user && (
           <div className="flex items-center gap-1" title={`Responsável: ${user.name}`}>
             <img src={user.avatar} className="w-5 h-5 rounded-full border border-gray-100" alt="avatar" />
           </div>
        )}
      </div>
      
      <div className="mt-3 flex justify-between items-center">
        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${lead.probability > 70 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
            {lead.probability}% Prob.
        </span>
        <button 
            onClick={handleAiInsight}
            disabled={aiLoading}
            className={`p-1 rounded-full transition-colors ${aiLoading ? 'bg-purple-100 animate-pulse' : 'hover:bg-purple-100 text-purple-600'}`}
            title="Gerar Estratégia com IA"
        >
            <Sparkles size={14} />
        </button>
      </div>
    </div>
  );
};