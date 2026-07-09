import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, Clock, UserPlus, CheckSquare, Webhook } from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCRM } from '../context/CRMContext';

export const NotificationPanel = ({ onNavigate }: { onNavigate: (view: string, data?: any) => void }) => {
  const { notifications, tasksToday, unreadCount, markAsRead, markAllAsRead } = useCRM();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="relative text-slate-400 hover:text-slate-600 transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-3 w-[380px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-slate-700" />
              <span className="font-bold text-slate-900 text-sm">Notificações</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full leading-none">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {notifications.some(n => !n.read) && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                  Marcar todas como lidas
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            {/* Tasks today */}
            {tasksToday.length > 0 && (
              <div>
                <div className="px-5 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-1.5">
                  <Clock size={11} className="text-amber-600" />
                  <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">
                    Tarefas para hoje — {tasksToday.length}
                  </span>
                </div>
                {tasksToday.map(task => (
                  <button
                    key={task.id}
                    onClick={() => { onNavigate('tasks'); setIsOpen(false); }}
                    className="w-full flex items-start gap-3 px-5 py-3 hover:bg-slate-50 border-b border-slate-50 text-left transition-colors group"
                  >
                    <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                      <CheckSquare size={14} className="text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-amber-700 transition-colors">
                        {task.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {task.lead_title ? `Lead: ${task.lead_title}` : 'Tarefa do dia'}
                        {task.due_date && ` · ${format(parseISO(task.due_date), 'HH:mm')}`}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Lead notifications */}
            {notifications.length > 0 && (
              <div>
                <div className="px-5 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-1.5">
                  <UserPlus size={11} className="text-blue-600" />
                  <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider">
                    Novos leads
                  </span>
                </div>
                {notifications.map(notif => (
                  <button
                    key={notif.id}
                    onClick={() => {
                      if (notif.related_id) onNavigate('lead-detail', notif.related_id);
                      if (!notif.read) markAsRead(notif.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-start gap-3 px-5 py-3 hover:bg-slate-50 border-b border-slate-50 text-left transition-colors group ${!notif.read ? 'bg-blue-50/40' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      notif.type === 'new_lead_webhook' ? 'bg-purple-100' : 'bg-blue-100'
                    }`}>
                      {notif.type === 'new_lead_webhook'
                        ? <Webhook size={14} className="text-purple-600" />
                        : <UserPlus size={14} className="text-blue-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-semibold truncate group-hover:text-blue-700 transition-colors ${notif.read ? 'text-slate-600' : 'text-slate-900'}`}>
                          {notif.title}
                        </p>
                        {!notif.read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />
                        )}
                      </div>
                      {notif.message && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{notif.message}</p>
                      )}
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        {formatDistanceToNow(parseISO(notif.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Empty state */}
            {notifications.length === 0 && tasksToday.length === 0 && (
              <div className="py-14 text-center px-6">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Bell size={24} className="text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-500">Tudo em dia!</p>
                <p className="text-xs text-slate-300 mt-1">Nenhuma notificação no momento.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
