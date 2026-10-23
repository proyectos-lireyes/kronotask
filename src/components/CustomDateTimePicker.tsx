import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronUp,
  ChevronDown,
  X,
  Check,
  Clock,
} from 'lucide-react';

interface CustomDateTimePickerProps {
  value: string; // ISO string or 'YYYY-MM-DDTHH:mm'
  onChange: (value: string) => void;
  label?: string;
  minDate?: string;
  required?: boolean;
}

export const CustomDateTimePicker: React.FC<CustomDateTimePickerProps> = ({
  value,
  onChange,
  label,
  required,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Parse current value or fallback to now
  const parsedDate = value ? new Date(value) : new Date();
  const validDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

  // Internal selection state
  const [viewYear, setViewYear] = useState(validDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(validDate.getMonth()); // 0-11
  const [selectedDay, setSelectedDay] = useState(validDate.getDate());
  const [selectedHour, setSelectedHour] = useState(validDate.getHours());
  const [selectedMinute, setSelectedMinute] = useState(validDate.getMinutes());

  // Month-Year dropdown open state
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  const hoursContainerRef = useRef<HTMLDivElement>(null);
  const minutesContainerRef = useRef<HTMLDivElement>(null);

  // Sync internal state when external value changes
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
        setSelectedDay(d.getDate());
        setSelectedHour(d.getHours());
        setSelectedMinute(d.getMinutes());
      }
    }
  }, [value]);

  // Scroll active hour and minute into view when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (hoursContainerRef.current) {
          const activeEl = hoursContainerRef.current.querySelector('[data-selected="true"]');
          if (activeEl) {
            (activeEl as HTMLElement).scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
        }
        if (minutesContainerRef.current) {
          const activeEl = minutesContainerRef.current.querySelector('[data-selected="true"]');
          if (activeEl) {
            (activeEl as HTMLElement).scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
        }
      }, 50);
    }
  }, [isOpen]);

  const pad = (n: number) => (n < 10 ? '0' + n : String(n));

  const formatToIsoLocal = (year: number, month: number, day: number, hour: number, minute: number) => {
    return `${year}-${pad(month + 1)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
  };

  const handleApply = (newYear = viewYear, newMonth = viewMonth, newDay = selectedDay, newHour = selectedHour, newMin = selectedMinute) => {
    const formatted = formatToIsoLocal(newYear, newMonth, newDay, newHour, newMin);
    onChange(formatted);
  };

  const monthNamesEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const monthNamesEs = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  // Days of current view month
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  // Adjust Monday = 0, Sunday = 6 (matching Mo Tu We Th Fr Sa Su)
  const startOffset = (firstDayOfWeek + 6) % 7;
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  // Generate grid days (42 slots: 6 weeks x 7 days)
  const calendarCells = [];
  // 1. Previous month trailing days
  for (let i = startOffset - 1; i >= 0; i--) {
    calendarCells.push({
      day: daysInPrevMonth - i,
      monthOffset: -1,
      isCurrentMonth: false,
    });
  }
  // 2. Current month days
  for (let i = 1; i <= daysInCurrentMonth; i++) {
    calendarCells.push({
      day: i,
      monthOffset: 0,
      isCurrentMonth: true,
    });
  }
  // 3. Next month leading days
  const remainingCells = 42 - calendarCells.length;
  for (let i = 1; i <= remainingCells; i++) {
    calendarCells.push({
      day: i,
      monthOffset: 1,
      isCurrentMonth: false,
    });
  }

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleDayClick = (cell: { day: number; monthOffset: number; isCurrentMonth: boolean }) => {
    let targetYear = viewYear;
    let targetMonth = viewMonth + cell.monthOffset;
    if (targetMonth < 0) {
      targetMonth = 11;
      targetYear -= 1;
    } else if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
    setViewYear(targetYear);
    setViewMonth(targetMonth);
    setSelectedDay(cell.day);
    handleApply(targetYear, targetMonth, cell.day, selectedHour, selectedMinute);
  };

  const handleHourClick = (h: number) => {
    setSelectedHour(h);
    handleApply(viewYear, viewMonth, selectedDay, h, selectedMinute);
  };

  const handleMinuteClick = (m: number) => {
    setSelectedMinute(m);
    handleApply(viewYear, viewMonth, selectedDay, selectedHour, m);
  };

  const handleClear = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDay(now.getDate());
    setSelectedHour(12);
    setSelectedMinute(0);
    handleApply(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0);
  };

  const handleToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDay(now.getDate());
    setSelectedHour(now.getHours());
    setSelectedMinute(now.getMinutes());
    handleApply(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
  };

  // Formatted display text for trigger button
  const displayFormatted = (() => {
    if (!value) return 'Seleccionar fecha y hora';
    const d = new Date(value);
    if (isNaN(d.getTime())) return 'Seleccionar fecha y hora';
    return `${d.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })} - ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  })();

  const hoursList = Array.from({ length: 24 }, (_, i) => i);
  const minutesList = Array.from({ length: 60 }, (_, i) => i);

  return (
    <div className="relative w-full">
      {label && (
        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
          {label} {required && '*'}
        </label>
      )}

      {/* Trigger Button that replaces native input */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm bg-white hover:bg-slate-50 border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-800 font-medium cursor-pointer transition-all shadow-2xs"
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="truncate">{displayFormatted}</span>
        </div>
        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>

      {/* Modal Popup Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-w-sm sm:max-w-md w-full animate-in zoom-in-95 duration-200 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar with title & close button */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-700">
                Seleccionar Fecha y Hora
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main Picker Container: Dual-pane identical to screenshot */}
            <div className="flex flex-row divide-x divide-slate-200 h-[340px]">
              {/* Left Pane: Calendar */}
              <div className="flex-1 p-3 flex flex-col justify-between select-none">
                {/* Calendar Header: "October 2026 ▾" and "↑ ↓" */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <button
                      type="button"
                      onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                      className="flex items-center gap-1 text-xs sm:text-sm font-bold text-slate-900 hover:text-blue-600 cursor-pointer px-1 py-0.5 rounded transition-colors"
                    >
                      <span>
                        {monthNamesEn[viewMonth]} {viewYear}
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isMonthPickerOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={handlePrevMonth}
                        aria-label="Previous month"
                        className="p-1 hover:bg-slate-100 rounded text-slate-700 cursor-pointer transition-colors"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextMonth}
                        aria-label="Next month"
                        className="p-1 hover:bg-slate-100 rounded text-slate-700 cursor-pointer transition-colors"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Year/Month Selector Dropdown if toggled */}
                  {isMonthPickerOpen ? (
                    <div className="h-[240px] overflow-y-auto grid grid-cols-3 gap-1 p-1 bg-slate-50 rounded-xl border border-slate-200">
                      {monthNamesEs.map((mName, idx) => (
                        <button
                          key={mName}
                          type="button"
                          onClick={() => {
                            setViewMonth(idx);
                            setIsMonthPickerOpen(false);
                          }}
                          className={`py-2 px-1 text-xs rounded-lg font-semibold transition-all cursor-pointer ${
                            viewMonth === idx
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-100'
                          }`}
                        >
                          {mName.slice(0, 3)}
                        </button>
                      ))}
                      <div className="col-span-3 flex items-center justify-between pt-2 border-t border-slate-200 px-1">
                        <button
                          type="button"
                          onClick={() => setViewYear(viewYear - 1)}
                          className="px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded"
                        >
                          « {viewYear - 1}
                        </button>
                        <span className="text-xs font-bold text-slate-800">{viewYear}</span>
                        <button
                          type="button"
                          onClick={() => setViewYear(viewYear + 1)}
                          className="px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded"
                        >
                          {viewYear + 1} »
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Weekday headers: Mo Tu We Th Fr Sa Su (from user screenshot) */}
                      <div className="grid grid-cols-7 text-center mb-1">
                        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((wd) => (
                          <div key={wd} className="text-[11px] font-medium text-slate-700 py-1">
                            {wd}
                          </div>
                        ))}
                      </div>

                      {/* Days Grid */}
                      <div className="grid grid-cols-7 gap-y-1 text-center">
                        {calendarCells.map((cell, idx) => {
                          const isSelected =
                            cell.isCurrentMonth &&
                            cell.day === selectedDay &&
                            viewYear === validDate.getFullYear() &&
                            viewMonth === validDate.getMonth();

                          return (
                            <div key={idx} className="flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => handleDayClick(cell)}
                                className={`w-7 h-7 text-xs font-semibold rounded transition-all cursor-pointer flex items-center justify-center ${
                                  isSelected
                                    ? 'bg-[#1976d2] text-white shadow-xs font-bold'
                                    : cell.isCurrentMonth
                                    ? 'text-slate-800 hover:bg-blue-50 hover:text-blue-600'
                                    : 'text-slate-400 hover:bg-slate-100'
                                }`}
                              >
                                {cell.day}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* Footer: Clear & Today (exact match to screenshot) */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2 px-1">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-xs font-medium text-[#1976d2] hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleToday}
                    className="text-xs font-medium text-[#1976d2] hover:underline cursor-pointer"
                  >
                    Today
                  </button>
                </div>
              </div>

              {/* Right Pane: Two Vertical Scrollable Columns (Hours & Minutes) */}
              <div className="w-28 sm:w-32 flex flex-row divide-x divide-slate-100 bg-white">
                {/* Hours Column (00 - 23) */}
                <div
                  ref={hoursContainerRef}
                  className="flex-1 overflow-y-auto no-scrollbar py-2 flex flex-col items-center gap-1 scroll-smooth"
                >
                  {hoursList.map((h) => {
                    const isSelected = h === selectedHour;
                    return (
                      <button
                        key={h}
                        type="button"
                        data-selected={isSelected ? 'true' : 'false'}
                        onClick={() => handleHourClick(h)}
                        className={`w-9 py-1 text-xs font-bold rounded-md transition-all cursor-pointer text-center ${
                          isSelected
                            ? 'bg-[#1976d2] text-white shadow-xs'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {pad(h)}
                      </button>
                    );
                  })}
                </div>

                {/* Minutes Column (00 - 59) */}
                <div
                  ref={minutesContainerRef}
                  className="flex-1 overflow-y-auto no-scrollbar py-2 flex flex-col items-center gap-1 scroll-smooth"
                >
                  {minutesList.map((m) => {
                    const isSelected = m === selectedMinute;
                    return (
                      <button
                        key={m}
                        type="button"
                        data-selected={isSelected ? 'true' : 'false'}
                        onClick={() => handleMinuteClick(m)}
                        className={`w-9 py-1 text-xs font-bold rounded-md transition-all cursor-pointer text-center ${
                          isSelected
                            ? 'bg-[#1976d2] text-white shadow-xs'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {pad(m)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer with Listo button */}
            <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">
                {displayFormatted}
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#1976d2] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
