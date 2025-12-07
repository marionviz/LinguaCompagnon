typescript// src/components/ToolBox/ToolBox.tsx

import React, { useState } from 'react';
import { useToolBox } from '@/hooks/useToolBox';
import { ToolBoxCategory } from '@/types/toolbox.types';
import { ToolBoxCategory as CategoryComponent } from './ToolBoxCategory';
import { StrategyReflection } from './StrategyReflection';
import { 
  BookOpen, 
  MessageSquare, 
  Clock, 
  Mic, 
  Brain,
  Download,
  TrendingUp 
} from 'lucide-react';

const CATEGORY_CONFIG = {
  grammar: {
    icon: BookOpen,
    label: 'Grammaire',
    color: 'bg-blue-100 text-blue-800',
    description: 'Règles et structures grammaticales',
  },
  vocabulary: {
    icon: MessageSquare,
    label: 'Vocabulaire',
    color: 'bg-green-100 text-green-800',
    description: 'Mots et expressions utiles',
  },
  conjugation: {
    icon: Clock,
    label: 'Conjugaison',
    color: 'bg-purple-100 text-purple-800',
    description: 'Verbes et temps',
  },
  pronunciation: {
    icon: Mic,
    label: 'Prononciation',
    color: 'bg-orange-100 text-orange-800',
    description: 'Sons et accents',
  },
  strategy: {
    icon: Brain,
    label: 'Stratégies d\'apprentissage',
    color: 'bg-pink-100 text-pink-800',
    description: 'Mes techniques qui fonctionnent',
  },
};

export const ToolBox: React.FC = () => {
  const { toolboxData, getItemsByCategory, exportData } = useToolBox();
  const [activeTab, setActiveTab] = useState<ToolBoxCategory | 'strategies'>('grammar');
  const [showReflection, setShowReflection] = useState(false);

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-blue-600" />
              Ma Boîte à Outils
            </h1>
            <p className="text-gray-600 mt-2">
              Toutes mes découvertes et stratégies pour progresser en français
            </p>
          </div>
          
          <button
            onClick={exportData}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            <Download className="w-5 h-5" />
            Exporter
          </button>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {toolboxData.totalItemsAdded}
            </div>
            <div className="text-sm text-gray-600">Éléments ajoutés</div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {toolboxData.strategies.length}
            </div>
            <div className="text-sm text-gray-600">Stratégies découvertes</div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {Object.values(toolboxData.categoryCounts).reduce((a, b) => a + b, 0)}
            </div>
            <div className="text-sm text-gray-600">Total d'items</div>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {toolboxData.items.reduce((sum, item) => sum + item.reviewCount, 0)}
            </div>
            <div className="text-sm text-gray-600">Révisions effectuées</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-2 overflow-x-auto">
          {(Object.keys(CATEGORY_CONFIG) as ToolBoxCategory[]).map(category => {
            const config = CATEGORY_CONFIG[category];
            const Icon = config.icon;
            const count = toolboxData.categoryCounts[category];
            
            return (
              <button
                key={category}
                onClick={() => setActiveTab(category)}
                className={`
                  flex items-center gap-2 px-4 py-3 border-b-2 transition whitespace-nowrap
                  ${activeTab === category 
                    ? 'border-blue-600 text-blue-600 font-medium' 
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                {config.label}
                {count > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-xs bg-gray-100 rounded-full">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
          
          <button
            onClick={() => setActiveTab('strategies')}
            className={`
              flex items-center gap-2 px-4 py-3 border-b-2 transition whitespace-nowrap
              ${activeTab === 'strategies' 
                ? 'border-blue-600 text-blue-600 font-medium' 
                : 'border-transparent text-gray-600 hover:text-gray-900'
              }
            `}
          >
            <TrendingUp className="w-5 h-5" />
            Mes stratégies
            {toolboxData.strategies.length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs bg-gray-100 rounded-full">
                {toolboxData.strategies.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'strategies' ? (
          <StrategyReflection />
        ) : (
          <CategoryComponent 
            category={activeTab as ToolBoxCategory}
            config={CATEGORY_CONFIG[activeTab as ToolBoxCategory]}
          />
        )}
      </div>

      {/* Bouton réflexion flottant */}
      <button
        onClick={() => setShowReflection(!showReflection)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition"
        title="Ajouter une réflexion"
      >
        <Brain className="w-6 h-6" />
      </button>
    </div>
  );
};