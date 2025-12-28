// src/components/ToolBox/StrategyReflection.tsx

import React, { useState } from 'react';
import { getStrategiesForWeek, getStrategiesByType, LearningStrategies } from '../../data/LearningStrategies';

interface StrategyReflectionProps {
  weekNumber: number; // ✅ NOUVEAU : Semaine en cours
  onSave: (reflection: string) => void;
}

type FilterType = 'all' | 'grammar' | 'vocabulary' | 'conjugation' | 'pronunciation';

export const StrategyReflection: React.FC<StrategyReflectionProps> = ({ weekNumber, onSave }) => {
  const [reflection, setReflection] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showStrategies, setShowStrategies] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('all');

  // ✅ Récupérer les stratégies de la semaine
  const allStrategies = getStrategiesForWeek(weekNumber);
  const filteredStrategies = filterType === 'all' 
    ? allStrategies 
    : getStrategiesByType(weekNumber, filterType);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reflection.trim()) {
      onSave(reflection.trim());
      setReflection('');
      setIsExpanded(false);
    }
  };

  const categoryIcons = {
    grammar: '📐',
    vocabulary: '📚',
    conjugation: '🔄',
    pronunciation: '🗣️'
  };

  const categoryLabels = {
    grammar: 'Grammaire',
    vocabulary: 'Vocabulaire',
    conjugation: 'Conjugaison',
    pronunciation: 'Prononciation'
  };

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-4">
      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 1 : STRATÉGIES SUGGÉRÉES */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div>
        <button
          onClick={() => setShowStrategies(!showStrategies)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">💡</span>
            <h3 className="text-sm font-bold text-purple-900">
              Stratégies pour la semaine {weekNumber}
            </h3>
            <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
              {allStrategies.length} conseil{allStrategies.length > 1 ? 's' : ''}
            </span>
          </div>
          <svg 
            className={`w-5 h-5 text-purple-600 transition-transform ${showStrategies ? 'rotate-180' : ''}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showStrategies && (
          <div className="mt-4 space-y-4">
            {/* Filtres */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterType === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                }`}
              >
                📦 Tout ({allStrategies.length})
              </button>
              <button
                onClick={() => setFilterType('grammar')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterType === 'grammar'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                }`}
              >
                📐 Grammaire ({getStrategiesByType(weekNumber, 'grammar').length})
              </button>
              <button
                onClick={() => setFilterType('vocabulary')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterType === 'vocabulary'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                }`}
              >
                📚 Vocabulaire ({getStrategiesByType(weekNumber, 'vocabulary').length})
              </button>
              <button
                onClick={() => setFilterType('conjugation')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterType === 'conjugation'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                }`}
              >
                🔄 Conjugaison ({getStrategiesByType(weekNumber, 'conjugation').length})
              </button>
              <button
                onClick={() => setFilterType('pronunciation')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterType === 'pronunciation'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                }`}
              >
                🗣️ Prononciation ({getStrategiesByType(weekNumber, 'pronunciation').length})
              </button>
            </div>

            {/* Liste des stratégies */}
            <div className="space-y-3">
              {filteredStrategies.length === 0 ? (
                <div className="text-center text-sm text-purple-600 py-4">
                  Aucune stratégie pour ce filtre
                </div>
              ) : (
                filteredStrategies.map((strategy, index) => (
                  <div 
                    key={index}
                    className="bg-white border border-purple-200 rounded-lg p-3"
                  >
                    {/* En-tête */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{categoryIcons[strategy.errorType]}</span>
                      <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                        {categoryLabels[strategy.errorType]}
                      </span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-600">{strategy.errorPattern}</span>
                    </div>

                    {/* Stratégie */}
                    <p className="text-sm text-gray-800 mb-2 leading-relaxed">
                      {strategy.strategy}
                    </p>

                    {/* Exemple */}
                    {strategy.example && (
                      <div className="bg-purple-50 border-l-4 border-purple-400 p-2 rounded-r">
                        <p className="text-xs text-purple-800">
                          <strong>💬 Exemple :</strong> {strategy.example}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION 2 : MES RÉFLEXIONS PERSONNELLES */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="border-t border-purple-300 pt-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">🤔</span>
            <h3 className="text-sm font-bold text-purple-900">Mes réflexions personnelles</h3>
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
                className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!reflection.trim()}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
              >
                💾 Enregistrer ma réflexion
              </button>
              <button
                type="button"
                onClick={() => {
                  setReflection('');
                  setIsExpanded(false);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
              >
                Annuler
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* AIDE */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="bg-purple-100 border border-purple-300 rounded-lg p-3">
        <p className="text-xs text-purple-800 leading-relaxed">
          <strong>💡 Conseil :</strong> Consultez les stratégies suggérées ci-dessus pour progresser sur vos points faibles. 
          Ajoutez vos propres découvertes dans "Mes réflexions personnelles" !
        </p>
      </div>
    </div>
  );
};