// src/components/ToolBox/ToolBox.tsx
// ✅ MODIFIÉ : Suppression de l'onglet "Stratégies" mais conservation du tableau

import React, { useState } from 'react';
import { ToolBoxCategory as CategoryType } from '../../types/toolbox.types';
import { useToolBox } from '../../hooks/useToolBox';
import { ToolBoxCategory } from './ToolBoxCategory';
import { StrategyReflection } from './StrategyReflection';

type Tab = CategoryType | 'all';

interface ToolBoxProps {
  weekNumber?: number;
}

export const ToolBox: React.FC<ToolBoxProps> = ({ weekNumber = 1 }) => {
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const { data, addItem, removeItem, updateItem, reviewItem, getByCategory, exportData } = useToolBox();

  const [updateTrigger, setUpdateTrigger] = useState(0);

  React.useEffect(() => {
    const handleToolboxUpdate = () => {
      console.log('🔄 ToolBox reçoit event, force re-render');
      setUpdateTrigger(prev => prev + 1);
    };
    window.addEventListener('toolboxUpdated', handleToolboxUpdate);
    return () => window.removeEventListener('toolboxUpdated', handleToolboxUpdate);
  }, []);
  
  const handleSaveStrategyReflection = (reflection: string) => {
    addItem({
      category: 'strategy',
      title: 'Ma réflexion',
      description: reflection,
      errorContext: `Réflexion personnelle - Semaine ${weekNumber}`,
    });
    
    console.log('✅ Réflexion sauvegardée:', reflection);
  };

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

  const handleClearAll = () => {
    if (window.confirm(
      '⚠️ ATTENTION !\n\n' +
      'Vous êtes sur le point d\'effacer TOUTES vos corrections :\n\n' +
      `📐 Grammaire : ${data.categoryCounts.grammar} corrections\n` +
      `📚 Vocabulaire : ${data.categoryCounts.vocabulary} corrections\n` +
      `🔄 Conjugaison : ${data.categoryCounts.conjugation} corrections\n` +
      `🗣️ Prononciation : ${data.categoryCounts.pronunciation} corrections\n` +
      `💡 Stratégies : ${data.strategies.length} stratégies\n\n` +
      `TOTAL : ${data.totalItemsAdded} éléments\n\n` +
      '⚠️ Cette action est IRRÉVERSIBLE !\n\n' +
      'Voulez-vous vraiment continuer ?'
    )) {
      localStorage.removeItem('linguacompagnon_toolbox');
      window.location.reload();
    }
  };

  // ✅ CHANGEMENT : Suppression de 'strategy' des onglets
  const categories: CategoryType[] = ['grammar', 'vocabulary', 'conjugation', 'pronunciation'];
  
  const categoryLabels: Record<CategoryType | 'all', string> = {
    all: 'Tout',
    grammar: 'Grammaire',
    vocabulary: 'Vocabulaire',
    conjugation: 'Conjugaison',
    pronunciation: 'Prononciation',
    strategy: 'Stratégies',
  };

  const categoryIcons: Record<CategoryType | 'all', string> = {
    all: '📂',
    grammar: '📐',
    vocabulary: '📚',
    conjugation: '🔄',
    pronunciation: '🗣️',
    strategy: '💡',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">🛠️ Ma Boîte à Outils</h2>
            <p className="text-sm text-gray-600 mt-1">
              Toutes vos corrections et notes d'apprentissage
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Bouton Exporter */}
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors text-sm font-medium border border-blue-200"
              title="Exporter toutes les corrections en fichier texte"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exporter
            </button>

            {/* Bouton Effacer tout */}
            <button
              onClick={handleClearAll}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors text-sm font-medium border border-red-200"
              title="Effacer toutes les corrections de la boîte à outils"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Effacer tout
            </button>
          </div>
        </div>
      </div>

      {/* Onglets - SANS "Stratégies" */}
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
            
            {/* ✅ TOUJOURS afficher StrategyReflection à la fin de l'onglet "Tout" */}
            <StrategyReflection 
              weekNumber={weekNumber}
              onSave={handleSaveStrategyReflection}
            />
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
      
      {/* Section MOTIVATION */}
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

      {/* Guide d'utilisation */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-bold text-blue-900 mb-2">💡 Comment utiliser votre boîte à outils ?</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✓ Les corrections du mode oral sont ajoutées automatiquement</li>
          <li>✓ Vous pouvez ajouter manuellement vos propres notes</li>
          <li>✓ Développez un élément pour voir la correction, l'explication et le contexte</li>
          <li>✓ Modifiez ou supprimez des éléments à tout moment</li>
          <li>✓ Exportez vos données en fichier texte pour les sauvegarder</li>
          <li>✓ Consultez les stratégies suggérées dans le tableau "Stratégies pour la semaine"</li>
          <li>✓ Effacez tout pour repartir à zéro (action irréversible)</li>
        </ul>
      </div>
    </div>
  );
};