// src/components/ToolBox/ToolBoxCategory.tsx

import React, { useState } from 'react';
import { ToolBoxItem as ToolBoxItemType, ToolBoxCategory as CategoryType } from '../../types/toolbox.types';
import { ToolBoxItem } from './ToolBoxItem';

interface ToolBoxCategoryProps {
  category: CategoryType;
  items: ToolBoxItemType[];
  onAddItem: (item: Omit<ToolBoxItemType, 'id' | 'addedDate' | 'reviewCount'>) => void;
  onRemoveItem: (id: string) => void;
  onUpdateItem: (id: string, updates: Partial<ToolBoxItemType>) => void;
  onReviewItem: (id: string) => void;
}

const categoryLabels: Record<CategoryType, string> = {
  grammaire: 'Grammaire',
  vocabulaire: 'Vocabulaire',
  conjugaison: 'Conjugaison',
  prononciation: 'Prononciation',
  strategy: 'Stratégies d\'apprentissage',
};

const categoryIcons: Record<CategoryType, string> = {
  grammaire: '📐',
  vocabulaire: '📚',
  conjugaiison: '🔄',
  prononciation: '🗣️',
  strategy: '💡',
};

export const ToolBoxCategory: React.FC<ToolBoxCategoryProps> = ({
  category,
  items,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  onReviewItem,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newExample, setNewExample] = useState('');
  const [newStrategy, setNewStrategy] = useState('');
  const [newContext, setNewContext] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTitle.trim() || !newDescription.trim()) {
      alert('Le titre et la description sont obligatoires');
      return;
    }

    onAddItem({
      category,
      title: newTitle.trim(),
      description: newDescription.trim(),
      example: newExample.trim() || undefined,
      learningStrategy: newStrategy.trim() || undefined,
      errorContext: newContext.trim() || undefined,
    });

    // Réinitialiser le formulaire
    setNewTitle('');
    setNewDescription('');
    setNewExample('');
    setNewStrategy('');
    setNewContext('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <span className="text-2xl">{categoryIcons[category]}</span>
          {categoryLabels[category]}
          <span className="text-sm font-normal text-gray-500">({items.length})</span>
        </h3>
        
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
        >
          {showAddForm ? '✕ Annuler' : '+ Ajouter'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titre *
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ex: Accord du participe passé"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Explication *
            </label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Ex: Avec l'auxiliaire 'être', le participe passé s'accorde avec le sujet"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Exemple
            </label>
            <textarea
              value={newExample}
              onChange={(e) => setNewExample(e.target.value)}
              placeholder="Ex: Elle est allée (pas 'allé')"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stratégie de mémorisation
            </label>
            <input
              type="text"
              value={newStrategy}
              onChange={(e) => setNewStrategy(e.target.value)}
              placeholder="Ex: Penser à 'être' = accord automatique"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contexte de l'erreur
            </label>
            <input
              type="text"
              value={newContext}
              onChange={(e) => setNewContext(e.target.value)}
              placeholder="Ex: Erreur récurrente dans mes écrits"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            className="w-full px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
          >
            ✓ Ajouter à ma boîte à outils
          </button>
        </form>
      )}

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">Aucun élément dans cette catégorie</p>
            <p className="text-xs mt-1">Cliquez sur "+ Ajouter" pour commencer</p>
          </div>
        ) : (
          items.map((item) => (
            <ToolBoxItem
              key={item.id}
              item={item}
              onRemove={onRemoveItem}
              onUpdate={onUpdateItem}
              onReview={onReviewItem}
            />
          ))
        )}
      </div>
    </div>
  );
};