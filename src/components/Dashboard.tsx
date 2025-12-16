
import React, { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  Trophy, TrendingUp, DollarSign, Calendar, MoreHorizontal, 
  Filter, Target, User as UserIcon, Briefcase 
} from 'lucide-react';

export const Dashboard = () => {
  const { leads, funnels, users, teams } = useCRM();
  const [dateRange, setDateRange] = useState('30_days');

  // --- HELPERS & CALCULATIONS ---

  const currencyFormatter = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  const safeCurrency = (val: unknown) =>
    currencyFormatter(typeof val === 'number' ? val : 0);

  // 1. Calculate General Goal (Sum of all teams goals)
  const globalGoal = useMemo(() => teams.reduce((acc, t) => acc + t.goal, 0), [teams]);

  // 2. Filter Leads (Won Only for revenue, All for pipeline)
  const wonLeads = useMemo(() => leads.filter(l => l.probability === 100), [leads]);
  const activeLeads = useMemo(() => leads.filter(l => l.probability > 0 && l.probability < 100), [leads]);

  const totalRevenue = wonLeads.reduce((acc, l) => acc + l.value, 0);
  const goalProgress = globalGoal > 0 ? (totalRevenue / globalGoal) * 100 : 0;
  const gap = globalGoal - totalRevenue;

  // 3. User Ranking
  const rankingData = useMemo(() => {
    return users.map(user => {
      const userWonLeads = wonLeads.filter(l => l.assignedUserId === user.id);
      const userAllLeads = leads.filter(l => l.assignedUserId === user.id);
      
      const revenue = userWonLeads.reduce((acc, l) => acc + l.value, 0);
      const salesCount = userWonLeads.length;
      const totalCount = userAllLeads.length;
      const conversionRate = totalCount > 0 ? (salesCount / totalCount) * 100 : 0;
      
      const userTeam = teams.find(t => t.id === user.teamId);
      const teamMemberCount = users.filter(u => u.teamId === user.teamId).length || 1;
      const individualGoal = userTeam ? userTeam.goal / teamMemberCount : 0;
      const goalStatus = individualGoal > 0 ? (revenue / individualGoal) * 100 : 0;

      return {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        salesCount,
        revenue,
        conversionRate,
        goalStatus
      };
    }).sort((a, b) => b.revenue - a.revenue); 
  }, [users, leads, wonLeads, teams]);

  // 4. Recent Sales
  const recentSales = useMemo(() => {
    return [...wonLeads]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [wonLeads]);

  // 5. Funnel Aggregation (Using the first active funnel for visualization)
  const primaryFunnel = funnels[0];
  const funnelData = useMemo(() => {
    if (!primaryFunnel) return [];
    
    return primaryFunnel.stages.map(stage => {
      const stageLeads = leads.filter(l => l.funnelId === primaryFunnel.id && l.stageId === stage.id);
      const value = stageLeads.reduce((acc, l) => acc + l.value, 0);
      return {
        id: stage.id,
        name: stage.name,
        count: stageLeads.length,
        value: value,
        color: stage.color
      };
    });
  }, [primaryFunnel, leads]);

  // 6. Products (Tags) Distribution
  const productData = useMemo(() => {
    const counts: Record<string, number> = {};
    wonLeads.forEach(lead => {
      const product = lead.tags && lead.tags.length > 0 ? lead.tags[0] : 'Outros';
      counts[product] = (counts[product] || 0) + lead.value;
    });

    const data = Object.entries(counts).map(([name, value]) => ({ name, value }));
    // Return empty array if no data to prevent chart errors
    return data.length > 0 ? data : [{ name: 'Sem dados', value: 1 }]; 
  }, [wonLeads]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // 7. Evolution Data (Last 7 days)
  const evolutionData = useMemo(() => {
    const data: Record<string, number> = {};
    // Initialize last 7 days with 0
    for(let i=6; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        data[dateStr] = 0;
    }

    wonLeads.forEach(lead => {
        const d = new Date(lead.createdAt);
        const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        // Only sum if date is within the initialized range
        if (Object.prototype.hasOwnProperty.call(data, dateStr)) {
            data[dateStr] += lead.value;
        }
    });

    return Object.entries(data).map(([date, value]) => ({ date, value }));
  }, [wonLeads]);

  return (
    <div className="p-6 bg-gray-50 h-full overflow-y-auto animate-fade-in text-gray-800">
      
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard de Vendas</h1>
            <p className="text-sm text-gray-500">Visão geral de performance e metas.</p>
          </div>
          <div className="flex gap-2">
             <button className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-700 transition-colors shadow-sm">
                <Calendar size={16} />
                Este Mês
             </button>
             <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors">
                <Filter size={16} />
                Filtrar
             </button>
          </div>
      </div>

      {/* TOP ROW: Ranking, Meta, Ultimas Vendas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        
        {/* 1. Ranking Equipe (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[320px]">
           <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
               <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                   <Trophy className="text-yellow-500" size={18} /> Ranking da Equipe
               </h3>
               <button className="text-gray-400 hover:text-gray-600"><MoreHorizontal size={18} /></button>
           </div>
           <div className="flex-1 overflow-auto">
               <table className="w-full text-left text-xs sm:text-sm">
                   <thead className="bg-gray-50 text-gray-500 font-medium sticky top-0">
                       <tr>
                           <th className="px-4 py-3">Nome</th>
                           <th className="px-2 py-3 text-center">Vendas</th>
                           <th className="px-4 py-3 text-right">R$ (Realizado)</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                       {rankingData.map((user, idx) => (
                           <tr key={user.id} className="hover:bg-blue-50/30 transition-colors">
                               <td className="px-4 py-3 flex items-center gap-3">
                                   <div className="relative flex-shrink-0">
                                       <img src={user.avatar} className="w-8 h-8 rounded-full border border-gray-200" alt={user.name} />
                                       {idx < 3 && user.salesCount > 0 && (
                                           <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white border-2 border-white ${idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-gray-400' : 'bg-orange-400'}`}>
                                               {idx + 1}
                                           </div>
                                       )}
                                   </div>
                                   <div className="flex flex-col">
                                      <span className="font-medium text-gray-700 truncate max-w-[100px]">{user.name.split(' ')[0]}</span>
                                      <span className="text-[10px] text-gray-400">{user.conversionRate.toFixed(0)}% conv.</span>
                                   </div>
                               </td>
                               <td className="px-2 py-3 text-center font-bold text-gray-700">{user.salesCount}</td>
                               <td className="px-4 py-3 text-right font-bold text-gray-800">
                                   {safeCurrency(user.revenue)}
                                   <div className="text-[10px] text-gray-400 font-normal">
                                       {user.goalStatus > 0 ? `${user.goalStatus.toFixed(0)}% meta` : '-'}
                                   </div>
                               </td>
                           </tr>
                       ))}
                       {rankingData.length === 0 && (
                           <tr><td colSpan={3} className="p-8 text-center text-gray-400 text-sm">Sem dados de equipe</td></tr>
                       )}
                   </tbody>
               </table>
           </div>
        </div>

        {/* 2. Meta Geral (3 cols) */}
        <div className="lg:col-span-3 bg-gray-900 rounded-xl shadow-lg border border-gray-800 text-white flex flex-col relative overflow-hidden h-[320px]">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600 rounded-full blur-[80px] opacity-20"></div>
            
            <div className="p-5 flex justify-between items-start z-10">
                <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wide">
                    <Target size={14} /> Meta Geral
                </div>
                <div className="text-[10px] bg-gray-800 px-2 py-1 rounded border border-gray-700 text-gray-300">Mensal</div>
            </div>

            <div className="flex-1 flex flex-col justify-center items-center z-10 px-6">
                <div className="text-5xl font-black tracking-tight mb-2">
                    {goalProgress.toFixed(0)}<span className="text-2xl text-gray-500">%</span>
                </div>
                <div className="text-sm text-gray-400 mb-6 font-medium">atingido da meta</div>
                
                <div className="text-center">
                    <div className="text-xs text-gray-500 uppercase font-bold mb-1">Valor Realizado</div>
                    <div className="text-2xl font-bold text-white tracking-tight">
                        {safeCurrency(totalRevenue)}
                    </div>
                </div>
            </div>

            <div className="p-6 bg-gray-800/50 mt-auto border-t border-gray-800 z-10">
                 <div className="flex justify-between text-xs mb-2">
                     <span className="text-green-400 font-bold">{safeCurrency(totalRevenue)}</span>
                     <span className="text-gray-500">Meta: {safeCurrency(globalGoal)}</span>
                 </div>
                 <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden relative">
                     <div 
                        className="bg-gradient-to-r from-green-400 to-blue-500 h-full rounded-full transition-all duration-1000" 
                        style={{ width: `${Math.min(goalProgress, 100)}%` }}
                     ></div>
                 </div>
                 <div className="text-center mt-3">
                     <span className="text-[10px] bg-gray-700 text-gray-300 px-2 py-1 rounded">
                         Gap: {gap > 0 ? `-${safeCurrency(gap)}` : 'Meta Batida! 🚀'}
                     </span>
                 </div>
            </div>
        </div>

        {/* 3. Últimas Vendas (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[320px]">
           <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
               <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                   <DollarSign className="text-green-600" size={18} /> Últimas Vendas
               </h3>
               <div className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">{wonLeads.length}</div>
           </div>
           <div className="flex-1 overflow-auto">
               <table className="w-full text-left text-xs">
                   <thead className="text-gray-500 bg-white sticky top-0 shadow-sm">
                       <tr className="border-b border-gray-100">
                           <th className="px-4 py-2">Cliente</th>
                           <th className="px-4 py-2">Valor</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                       {recentSales.map(lead => {
                           const rep = users.find(u => u.id === lead.assignedUserId);
                           return (
                               <tr key={lead.id} className="hover:bg-gray-50">
                                   <td className="px-4 py-3">
                                       <div className="font-bold text-gray-800 truncate max-w-[140px]">{lead.title}</div>
                                       <div className="flex items-center gap-1 text-gray-500 text-[10px] mt-0.5">
                                           <UserIcon size={10} /> 
                                           {rep?.name.split(' ')[0] || 'N/A'}
                                       </div>
                                   </td>
                                   <td className="px-4 py-3 text-right">
                                       <div className="font-bold text-green-600">{safeCurrency(lead.value)}</div>
                                       <div className="text-[10px] text-gray-400">{new Date(lead.createdAt).toLocaleDateString()}</div>
                                   </td>
                               </tr>
                           );
                       })}
                       {recentSales.length === 0 && (
                           <tr><td colSpan={2} className="p-8 text-center text-gray-400 text-sm">Nenhuma venda recente</td></tr>
                       )}
                   </tbody>
               </table>
           </div>
        </div>
      </div>

      {/* BOTTOM ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 4. Negociações por Etapa (Funnel Chevron) */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-[300px]">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Briefcase className="text-blue-500" size={18} />
                    Funil de Vendas
                </h3>
                <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded">
                    {primaryFunnel?.name || 'Principal'}
                </span>
            </div>
            
            <div className="flex-1 flex items-center overflow-x-auto pb-4 custom-scrollbar">
                <div className="flex w-full min-w-[600px] h-28">
                   {funnelData.map((stage, idx) => {
                       const isFirst = idx === 0;
                       const isLast = idx === funnelData.length - 1;
                       
                       // Custom Clip Paths for Chevron Effect
                       const clipPath = isLast 
                         ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 20px 50%)' 
                         : isFirst 
                            ? 'polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%)'
                            : 'polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%, 20px 50%)';
                       
                       // Alternating blues
                       const bgColor = idx % 2 === 0 ? 'bg-blue-600' : 'bg-blue-500';

                       return (
                           <div 
                             key={stage.id}
                             className={`flex-1 relative ${bgColor} text-white flex flex-col items-center justify-center min-w-[120px] transition-all hover:brightness-110 group`}
                             style={{ 
                                 clipPath, 
                                 marginLeft: isFirst ? 0 : '-20px',
                                 zIndex: funnelData.length - idx
                             }}
                           >
                               <div className="text-3xl font-bold mb-1">{stage.count}</div>
                               <div className="text-[10px] uppercase font-bold tracking-wide opacity-80 mb-2 px-6 truncate max-w-full text-center">
                                   {stage.name}
                               </div>
                               <div className="text-xs font-medium bg-black/20 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                   {new Intl.NumberFormat('pt-BR', { notation: "compact", compactDisplay: "short", style: 'currency', currency: 'BRL' }).format(stage.value)}
                               </div>
                           </div>
                       );
                   })}
                   {funnelData.length === 0 && (
                       <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400 rounded-lg border-2 border-dashed border-gray-200">
                           <Briefcase size={32} className="opacity-20 mb-2" />
                           <span className="text-sm">Sem dados de funil para exibir</span>
                       </div>
                   )}
                </div>
            </div>
            
            {/* Summary Footer */}
            <div className="mt-2 pt-4 border-t border-gray-100 flex gap-8 text-sm">
                <div>
                   <span className="text-gray-500 block text-xs mb-1">Total em Aberto</span>
                   <span className="font-bold text-gray-800 text-lg">{safeCurrency(activeLeads.reduce((a,b)=>a+b.value,0))}</span>
                </div>
                <div>
                   <span className="text-gray-500 block text-xs mb-1">Total Ganho</span>
                   <span className="font-bold text-green-600 text-lg">{safeCurrency(totalRevenue)}</span>
                </div>
            </div>
        </div>

        {/* 5. Faturamento por Produto (Pie Chart) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-[300px]">
            <h3 className="font-bold text-gray-800 mb-4 text-sm flex items-center gap-2">
                <Target size={16} className="text-purple-500" />
                Mix de Produtos
            </h3>
            <div className="flex-1 min-h-0 relative">
                {productData[0]?.name === 'Sem dados' ? (
                     <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                         <div className="w-32 h-32 rounded-full border-4 border-gray-100 flex items-center justify-center mb-2">
                             0%
                         </div>
                         <span className="text-xs">Sem vendas ainda</span>
                     </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={productData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={70}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {productData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(val: number) => safeCurrency(val)} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '10px'}} />
                        </PieChart>
                    </ResponsiveContainer>
                )}
                {productData[0]?.name !== 'Sem dados' && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[60%] text-center pointer-events-none">
                        <div className="text-xl font-bold text-gray-800">{productData.length}</div>
                        <div className="text-[9px] text-gray-500 uppercase">Tipos</div>
                    </div>
                )}
            </div>
        </div>

      </div>

      {/* 6. Evolução (Area Chart) */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-[320px]">
          <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <TrendingUp className="text-blue-600" size={20} /> Evolução de Vendas (7 Dias)
              </h3>
          </div>
          <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolutionData}>
                      <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} tickFormatter={(val) => `R$${val/1000}k`} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(val: number) => [safeCurrency(val), 'Vendas']}
                      />
                      <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
              </ResponsiveContainer>
          </div>
      </div>

    </div>
  );
};
