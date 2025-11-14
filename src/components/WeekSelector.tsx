import React from 'react';

interface WeekSelectorProps {
  currentWeek: number;
  onWeekChange: (week: number) => void;
}

const WeekSelector: React.FC<WeekSelectorProps> = ({ currentWeek, onWeekChange }) => {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="week-select" className="text-sm font-medium text-slate-300">
        Semaine :
      </label>
      <select
        id="week-select"
        value={currentWeek}
        onChange={(e) => onWeekChange(Number(e.target.value))}
        className="bg-slate-700 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-600"
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((week) => (
          <option key={week} value={week}>
            Semaine {week}
          </option>
        ))}
      </select>
    </div>
  );
};

export default WeekSelector;
