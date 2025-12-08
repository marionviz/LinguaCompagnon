// src/components/ToolBox/ToolBox.tsx

import React, { useState } from 'react';
import { ToolBoxCategory as CategoryType } from '../../types/toolbox.types';
import { useToolBox } from '../../hooks/useToolBox';
import { ToolBoxCategory } from './ToolBoxCategory';

type Tab = CategoryType | 'all';

export const ToolBox: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const { data, addItem, removeItem, updateItem, reviewItem, getByCategory, exportData } = useToolBox();

  const handleExport = () => {
    const jsonData = exportData();
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boite-a-outils-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const categories: CategoryType[] = ['grammar', 'vocabulary', 'conjugation', 'pronunciation', 'strategy'];
  
  const categoryLabels: Record<CategoryType | 'all', string> = {
    all: 'Tout',
    grammar: 'Grammaire',
    vocabulary: 'Vocabulaire',
    conjugation: 'Conjugaison',
    pronunciation: 'Prononciation',
    strategy: 'Stratégies',
  };

  const categoryIcons: Record<CategoryType | 'all', string> = {
    all: '📦',
    grammar: '📐',
    vocabulary: '📚',
    conjugation: '🔄',
    pronunciation: '🗣️',
    strategy: '💡',
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Ma Boîte à Outils</h2>
        <p className="text-gray-600">
          Conservez vos notes, corrections et stratégies d'apprentissage
        </p>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-brand-green">{data.totalItemsAdded}</div>
          <div className="text-sm text-gray-600">Éléments ajoutés</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{data.strategies.length}</div>
          <div className="text-sm text-gray-600">Stratégies découvertes</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">
            {data.items.reduce((sum, item) => sum + item.reviewCount, 0)}
          </div>
          <div className="text-sm text-gray-600">Révisions effectuées</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <button
            onClick={handleExport}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exporter
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
        <div className="flex overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 min-w-[100px] px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-brand-green text-brand-green bg-green-50'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span className="mr-2">{categoryIcons.all}</span>
            {categoryLabels.all}
          </button>
          
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveTab(category)}
              className={`flex-1 min-w-[100px] px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === category
                  ? 'border-brand-green text-brand-green bg-green-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span className="mr-2">{categoryIcons[category]}</span>
              <span className="hidden md:inline">{categoryLabels[category]}</span>
              <span className="md:hidden">{categoryIcons[category]}</span>
              <span className="ml-1 text-xs text-gray-500">({data.categoryCounts[category]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Contenu */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        {activeTab === 'all' ? (
          <div className="space-y-8">
            {categories.map((category) => {
              const categoryItems = getByCategory(category);
              return (
                <ToolBoxCategory
                  key={category}
                  category={category}
                  items={categoryItems}
                  onAddItem={addItem}
                  onRemoveItem={removeItem}
                  onUpdateItem={updateItem}
                  onReviewItem={reviewItem}
                />
              );
            })}
          </div>
        ) : (
          <ToolBoxCategory
            category={activeTab as CategoryType}
            items={getByCategory(activeTab as CategoryType)}
            onAddItem={addItem}
            onRemoveItem={removeItem}
            onUpdateItem={updateItem}
            onReviewItem={reviewItem}
          />
        )}
      </div>

      {/* Guide d'utilisation */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-bold text-blue-900 mb-2">💡 Comment utiliser votre Boîte à Outils ?</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✓ Les corrections du mode oral sont ajoutées automatiquement</li>
          <li>✓ Vous pouvez ajouter manuellement vos propres notes</li>
          <li>✓ Cliquez sur "J'ai révisé" pour suivre vos progrès</li>
          <li>✓ Modifiez ou supprimez des éléments à tout moment</li>
          <li>✓ Exportez vos données en JSON pour les sauvegarder</li>
        </ul>
      </div>
    </div>
  );
};