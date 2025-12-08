// src/components/ToolBox/StrategyReflection.tsx

import React, { useState } from 'react';

interface StrategyReflectionProps {
  onSave: (reflection: string) => void;
}

export const StrategyReflection: React.FC<StrategyReflectionProps> = ({ onSave }) => {
  const [reflection, setReflection] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reflection.trim()) {
      onSave(reflection.trim());
      setReflection('');
      setIsExpanded(false);
    }
  };

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">🤔</span>
          <h3 className="text-sm font-bold text-purple-900">Réflexion sur mes stratégies</h3>
        </div>
        <svg 
          className={`w-5 h-5 text-purple-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-purple-800 mb-2">
              Quelle stratégie d'apprentissage avez-vous découverte aujourd'hui ?
            </label>
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="Ex: J'ai remarqué que répéter à voix haute m'aide à mémoriser les conjugaisons..."
              rows={4}
              className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!reflection.trim()}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              💾 Enregistrer ma réflexion
            </button>
            <button
              type="button"
              onClick={() => {
                setReflection('');
                setIsExpanded(false);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
};