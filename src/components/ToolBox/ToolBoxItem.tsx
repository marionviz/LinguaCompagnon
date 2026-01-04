// src/components/ToolBox/ToolBoxItem.tsx

import React, { useState } from 'react';
import { ToolBoxItem as ToolBoxItemType } from '../../types/toolbox.types';

interface ToolBoxItemProps {
  item: ToolBoxItemType;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<ToolBoxItemType>) => void;
  onReview: (id: string) => void;
}

const categoryLabelsFr: Record<string, string> = {
  'grammar': 'Grammaire',
  'conjugation': 'Conjugaison',
  'vocabulary': 'Vocabulaire',
  'pronunciation': 'Prononciation',
  'strategy': 'Stratégies'
};

export const ToolBoxItem: React.FC<ToolBoxItemProps> = ({ item, onRemove, onUpdate, onReview }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(item.title);
  const [editedDescription, setEditedDescription] = useState(item.description);
  const [showFullTitle, setShowFullTitle] = useState(false); // ✅ NOUVEAU

  const handleSave = () => {
    onUpdate(item.id, {
      title: editedTitle,
      description: editedDescription,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedTitle(item.title);
    setEditedDescription(item.description);
    setIsEditing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  const getCategoryLabel = () => {
    const lowerTitle = item.title.toLowerCase();
    
    if (lowerTitle.includes('grammar') || lowerTitle.includes('grammaire')) return 'GRAMMAIRE';
    if (lowerTitle.includes('conjugation') || lowerTitle.includes('conjugaison')) return 'CONJUGAISON';
    if (lowerTitle.includes('vocabulary') || lowerTitle.includes('vocabulaire')) return 'VOCABULAIRE';
    if (lowerTitle.includes('pronunciation') || lowerTitle.includes('prononciation')) return 'PRONONCIATION';
    
    return categoryLabelsFr[item.category]?.toUpperCase() || item.category.toUpperCase();
  };

  // ✅ Vérifier si le titre est long (plus de 50 caractères)
  const isTitleLong = item.title.length > 50;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="w-full font-medium text-gray-800 border border-gray-300 rounded px-2 py-1 mb-2"
            />
          ) : (
            <div className="mb-1">
              {/* ✅ Titre avec gestion du truncate */}
              <h4 
                className={`font-medium text-gray-800 text-sm break-words leading-tight ${
                  !showFullTitle && isTitleLong ? 'line-clamp-2' : ''
                }`}
                title={isTitleLong ? item.title : undefined}
              >
                {item.title}
              </h4>
              
              {/* ✅ Bouton "Voir plus" si titre long */}
              {isTitleLong && (
                <button
                  onClick={() => setShowFullTitle(!showFullTitle)}
                  className="text-xs text-blue-600 hover:text-blue-800 mt-1 flex items-center gap-1"
                >
                  {showFullTitle ? (
                    <>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                      Voir moins
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      Voir le titre complet
                    </>
                  )}
                </button>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2 flex-wrap">
            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold text-[10px] whitespace-nowrap">
              {getCategoryLabel()}
            </span>
            <span>•</span>
            <span className="whitespace-nowrap">📅 {formatDate(item.addedDate)}</span>
            <span>•</span>
            <span className="whitespace-nowrap">👁️ Revu {item.reviewCount}x</span>
          </div>

          {isExpanded && (
            <div className="mt-3 space-y-3">
              {item.example && (
                <div className="bg-gray-50 border-l-4 border-gray-400 p-3 rounded-r text-sm">
                  <strong className="text-gray-700">Correction :</strong>
                  <p className="text-gray-600 whitespace-pre-line mt-1">{item.example}</p>
                </div>
              )}

              {isEditing ? (
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  rows={3}
                  className="w-full text-sm text-gray-700 border border-gray-300 rounded px-2 py-1"
                />
              ) : (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r text-sm">
                  <strong className="text-red-700">⚠️ Explication :</strong>
                  <p className="text-red-800 mt-1">{item.description}</p>
                </div>
              )}

              {item.learningStrategy && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r text-sm">
                  <strong className="text-blue-700">Stratégie :</strong>
                  <p className="text-blue-600 mt-1">{item.learningStrategy}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 ml-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title={isExpanded ? "Réduire" : "Développer"}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d={isExpanded ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} 
              />
            </svg>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="flex-1 px-3 py-1.5 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors"
              >
                Enregistrer
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 px-3 py-1.5 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400 transition-colors"
              >
                Annuler
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  onReview(item.id);
                }}
                className="flex-1 px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
              >
                ✓ J'ai révisé
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 transition-colors"
                title="Modifier"
              >
                ✏️
              </button>
              <button
                onClick={() => {
                  if (confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) {
                    onRemove(item.id);
                  }
                }}
                className="px-3 py-1.5 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200 transition-colors"
                title="Supprimer"
              >
                🗑️
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};