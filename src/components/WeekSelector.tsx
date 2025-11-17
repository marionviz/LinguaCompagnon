
import React from 'react';

interface WeekSelectorProps {
  currentWeek: number;
  onWeekChange: (week: number) => void;
}

const WeekSelector: React.FC<WeekSelectorProps> = ({ currentWeek, onWeekChange }) => {
  const weeks = Array.from({ length: 11 }, (_, i) => i + 1);

  return (
    <div className="flex items-center gap-2">
      <select
        id="week-select"
        value={currentWeek}
        onChange={(e) => onWeekChange(Number(e.target.value))}
        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand-green focus:border-brand-green block w-full p-2"
      >
        {weeks.map((week) => (
          <option key={week} value={week}>
            Semaine {week}
          </option>
        ))}
      </select>
    </div>
  );
};

export default WeekSelector;
