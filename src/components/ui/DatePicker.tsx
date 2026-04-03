import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ArrowRight
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  subDays,
  startOfToday,
  startOfYesterday,
  endOfToday,
  startOfISOWeek,
  endOfISOWeek,
  isWithinInterval,
  isAfter,
  isBefore,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DateRange {
  start: string;
  end: string;
}

interface DatePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  label?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'presets' | 'custom'>('presets');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selection, setSelection] = useState<DateRange>(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePresetClick = (preset: string) => {
    const today = startOfToday();
    let start = today;
    let end = endOfToday();

    switch (preset) {
      case 'today':
        start = today;
        end = endOfToday();
        break;
      case 'week':
        start = startOfISOWeek(today);
        end = endOfISOWeek(today);
        break;
      case 'month':
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case '7d':
        start = subDays(today, 6);
        end = endOfToday();
        break;
      case '14d':
        start = subDays(today, 13);
        end = endOfToday();
        break;
      case '30d':
        start = subDays(today, 29);
        end = endOfToday();
        break;
      case '6m':
        start = subMonths(today, 6);
        end = endOfToday();
        break;
      default:
        break;
    }

    const newRange = { 
      start: start.toISOString().split('T')[0], 
      end: end.toISOString().split('T')[0] 
    };
    onChange(newRange);
    setIsOpen(false);
  };

  const handleDateClick = (day: Date) => {
    const dayStr = day.toISOString().split('T')[0];
    
    if (!selection.start || (selection.start && selection.end)) {
      setSelection({ start: dayStr, end: '' });
    } else {
      const start = parseISO(selection.start);
      if (isBefore(day, start)) {
        setSelection({ start: dayStr, end: selection.start });
      } else {
        setSelection({ ...selection, end: dayStr });
      }
    }
  };

  const applyCustomRange = () => {
    if (selection.start && selection.end) {
      onChange(selection);
      setIsOpen(false);
    }
  };

  const renderHeader = () => (
    <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
      <button 
        onClick={() => setView('presets')}
        className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <ChevronLeft size={18} />
        <span className="text-sm font-bold text-slate-800 tracking-tight">Período personalizado</span>
      </button>
    </div>
  );

  const renderDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;
        
        const isSelected = (selection.start && isSameDay(day, parseISO(selection.start))) || 
                           (selection.end && isSameDay(day, parseISO(selection.end)));
        
        const isInRange = selection.start && selection.end && 
                         isWithinInterval(day, { 
                           start: parseISO(selection.start), 
                           end: parseISO(selection.end) 
                         });

        const isCurrentMonth = isSameMonth(day, monthStart);

        days.push(
          <div
            key={day.toString()}
            className={`relative h-10 w-full flex items-center justify-center cursor-pointer text-xs font-bold transition-all
              ${!isCurrentMonth ? "text-slate-300" : "text-slate-700 hover:bg-slate-50"}
              ${isSelected ? "bg-indigo-600 text-white rounded-lg z-10 shadow-lg shadow-indigo-100" : ""}
              ${isInRange && !isSelected ? "bg-indigo-50 text-indigo-600" : ""}
            `}
            onClick={() => handleDateClick(cloneDay)}
          >
            {formattedDate}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7 gap-1" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }

    return (
      <div className="p-4">
        <div className="grid grid-cols-7 gap-1 mb-2 text-center">
          {weekDays.map(d => (
            <div key={d} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{d}</div>
          ))}
        </div>
        {rows}
      </div>
    );
  };

  const getDisplayLabel = () => {
    if (!value.start) return "Selecionar";
    if (value.start === value.end) return format(parseISO(value.start), 'dd/MM/yyyy');
    return `${format(parseISO(value.start), 'dd/MM/yyyy')} - ${format(parseISO(value.end), 'dd/MM/yyyy')}`;
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 transition-all group shadow-sm"
      >
        <div className="flex items-center gap-3">
          <CalendarIcon size={18} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
          <span className="text-sm font-bold text-slate-700 tracking-tight">{getDisplayLabel()}</span>
        </div>
        <ChevronDown size={18} className={`text-slate-300 group-hover:text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-[320px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-[100] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
          {view === 'presets' ? (
            <div className="p-2 space-y-1">
              <PresetItem label="Hoje" onClick={() => handlePresetClick('today')} />
              <PresetItem label="Esta semana" onClick={() => handlePresetClick('week')} />
              <PresetItem label="Este mês" onClick={() => handlePresetClick('month')} />
              <div className="h-px bg-slate-100 my-1 mx-2" />
              <PresetItem label="Últimos 7 dias" onClick={() => handlePresetClick('7d')} />
              <PresetItem label="Últimos 14 dias" onClick={() => handlePresetClick('14d')} />
              <PresetItem label="Últimos 30 dias" onClick={() => handlePresetClick('30d')} />
              <PresetItem label="Últimos 6 meses" onClick={() => handlePresetClick('6m')} />
              <div className="h-px bg-slate-100 my-1 mx-2" />
              <button 
                onClick={() => setView('custom')}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 text-slate-700 transition-all group rounded-xl"
              >
                <span className="text-sm font-bold tracking-tight">Período personalizado</span>
                <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col">
              {renderHeader()}
              
              <div className="p-4 grid grid-cols-2 gap-3 bg-slate-50 border-b border-gray-100">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Início</p>
                  <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-900 shadow-sm">
                    {selection.start ? format(parseISO(selection.start), 'dd/MM/yyyy') : 'DD/MM/YYYY'}
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-1">Fim</p>
                  <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-900 shadow-sm">
                    {selection.end ? format(parseISO(selection.end), 'dd/MM/yyyy') : 'DD/MM/YYYY'}
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400">
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm font-black text-slate-800 uppercase tracking-widest">
                  {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                </span>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400">
                  <ChevronRight size={18} />
                </button>
              </div>

              {renderDays()}

              <div className="p-4 bg-slate-50">
                <button 
                  onClick={applyCustomRange}
                  disabled={!selection.start || !selection.end}
                  className="w-full py-3 bg-[#003B4F] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#002a3a] transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                  Aplicar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const PresetItem = ({ label, onClick }: { label: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="w-full text-left px-4 py-3 hover:bg-slate-50 text-slate-700 font-bold text-sm tracking-tight transition-all rounded-xl"
  >
    {label}
  </button>
);
