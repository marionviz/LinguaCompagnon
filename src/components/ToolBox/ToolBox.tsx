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
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const timeStr = now.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    let content = `═══════════════════════════════════════════════════
   MA BOÎTE À OUTILS - LINGUACOMPAGNON
═══════════════════════════════════════════════════

📅 Exporté le : ${dateStr} à ${timeStr}

═══════════════════════════════════════════════════
   STATISTIQUES GÉNÉRALES
═══════════════════════════════════════════════════

📦 Total d'éléments ajoutés : ${data.totalItemsAdded}
💡 Stratégies découvertes : ${data.strategies.length}
✅ Révisions effectuées : ${data.items.reduce((sum, item) => sum + item.reviewCount, 0)}

📊 Par catégorie :
   • Grammaire : ${data.categoryCounts.grammar}
   • Vocabulaire : ${data.categoryCounts.vocabulary}
   • Conjugaison : ${data.categoryCounts.conjugation}
   • Prononciation : ${data.categoryCounts.pronunciation}
   • Stratégies : ${data.categoryCounts.strategy}

`;

    // Trier les items par catégorie
    const itemsByCategory = {
      grammar: data.items.filter(item => item.category === 'grammar'),
      vocabulary: data.items.filter(item => item.category === 'vocabulary'),
      conjugation: data.items.filter(item => item.category === 'conjugation'),
      pronunciation: data.items.filter(item => item.category === 'pronunciation'),
      strategy: data.items.filter(item => item.category === 'strategy'),
    };

    const categoryLabels = {
      grammar: '📐 GRAMMAIRE',
      vocabulary: '📚 VOCABULAIRE',
      conjugation: '🔄 CONJUGAISON',
      pronunciation: '🗣️ PRONONCIATION',
      strategy: '💡 STRATÉGIES',
    };

    // Ajouter chaque catégorie
    Object.entries(itemsByCategory).forEach(([category, items]) => {
      if (items.length === 0) return;

      content += `\n═══════════════════════════════════════════════════\n`;
      content += `   ${categoryLabels[category as keyof typeof categoryLabels]}\n`;
      content += `═══════════════════════════════════════════════════\n\n`;

      items.forEach((item, index) => {
        content += `[${index + 1}] ${item.title}\n`;
        content += `${'─'.repeat(50)}\n`;
        content += `📝 Description : ${item.description}\n`;
        
        if (item.example) {
          content += `\n💬 Exemple :\n${item.example}\n`;
        }
        
        if (item.errorContext) {
          content += `\n🎯 Contexte : ${item.errorContext}\n`;
        }

        if (item.practicePrompt) {
          content += `\n✏️ Exercice : ${item.practicePrompt}\n`;
        }

        const addedDate = new Date(item.addedDate).toLocaleDateString('fr-FR');
        content += `\n📅 Ajouté le : ${addedDate}\n`;
        content += `🔁 Nombre de révisions : ${item.reviewCount}\n`;
        
        if (item.lastReviewed) {
          const reviewDate = new Date(item.lastReviewed).toLocaleDateString('fr-FR');
          content += `🕐 Dernière révision : ${reviewDate}\n`;
        }

        content += `\n`;
      });
    });

    // Ajouter les stratégies d'apprentissage
    if (data.strategies.length > 0) {
      content += `\n═══════════════════════════════════════════════════\n`;
      content += `   🧠 STRATÉGIES D'APPRENTISSAGE\n`;
      content += `═══════════════════════════════════════════════════\n\n`;

      data.strategies.forEach((strategy, index) => {
        content += `[${index + 1}] ${strategy.name}\n`;
        content += `${'─'.repeat(50)}\n`;
        content += `📝 ${strategy.description}\n`;
        
        if (strategy.example) {
          content += `\n💬 Exemple : ${strategy.example}\n`;
        }

        const discoveredDate = new Date(strategy.discoveredDate).toLocaleDateString('fr-FR');
        content += `\n📅 Découverte le : ${discoveredDate}\n`;
        content += `📊 Utilisée ${strategy.timesUsed} fois\n\n`;
      });
    }

    content += `\n═══════════════════════════════════════════════════\n`;
    content += `   FIN DU DOCUMENT\n`;
    content += `═══════════════════════════════════════════════════\n`;

    // Créer et télécharger le fichier
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boite-a-outils-${new Date().toISOString().split('T')[0]}.txt`;
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
        
        {/* ✅ MOTIVATION au lieu de Révisions effectuées */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">
            {data.items.length > 0 
              ? Math.round((data.items.reduce((sum, item) => sum + item.reviewCount, 0) / data.items.length) * 100) / 100
              : 0}
          </div>
          <div className="text-sm text-gray-600">Moyenne révisions/item</div>
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

      {/* Guide d'utilisation - TEXTE MIS À JOUR */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-bold text-blue-900 mb-2">💡 Comment utiliser votre Boîte à Outils ?</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✓ Les corrections du mode oral sont ajoutées automatiquement</li>
          <li>✓ Vous pouvez ajouter manuellement vos propres notes</li>
          <li>✓ Développez un élément pour voir l'exemple, l'explication et le contexte</li>
          <li>✓ Modifiez ou supprimez des éléments à tout moment</li>
          <li>✓ Exportez vos données en fichier texte pour les sauvegarder</li>
        </ul>
      </div>

      {/* ✅ SECTION MOTIVATION (à développer plus tard) */}
      <div className="mt-6 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-purple-900 mb-3">🌟 Motivation</h3>
        <div className="space-y-3">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progression cette semaine</span>
              <span className="text-sm font-bold text-purple-600">
                {data.items.filter(item => {
                  const itemDate = new Date(item.addedDate);
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return itemDate >= weekAgo;
                }).length} nouveaux éléments
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                style={{ 
                  width: `${Math.min(100, (data.items.filter(item => {
                    const itemDate = new Date(item.addedDate);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return itemDate >= weekAgo;
                  }).length / 10) * 100)}%` 
                }}
              />
            </div>
          </div>

          <div className="text-center">
            <p className="text-purple-800 font-medium">
              {data.items.length === 0 
                ? "🎯 Commencez votre aventure d'apprentissage !"
                : data.items.length < 10
                ? "🚀 Continuez comme ça, vous progressez bien !"
                : data.items.length < 30
                ? "⭐ Excellente collection ! Vous êtes motivé(e) !"
                : "🏆 Impressionnant ! Vous êtes un(e) apprenant(e) assidu(e) !"
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};