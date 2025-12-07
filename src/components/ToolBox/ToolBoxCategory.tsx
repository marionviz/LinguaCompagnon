typescript// src/components/ToolBox/ToolBoxCategory.tsx

import React, { useState } from 'react';
import { useToolBox } from '@/hooks/useToolBox';
import { ToolBoxCategory, ToolBoxItem } from '@/types/toolbox.types';
import { ToolBoxItem as ItemComponent } from './ToolBoxItem';
import { Plus, AlertCircle } from 'lucide-react';

interface Props {
  category: ToolBoxCategory;
  config: {
    icon: any;
    label: string;
    color: string;
    description: string;
  };
}

export const ToolBoxCategory: React.FC<Props> = ({ category, config }) => {
  const { getItemsByCategory, addToolBoxItem } = useToolBox();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    example: '',
    learningStrategy: '',
    errorContext: '',
  });

  const items = getItemsByCategory(category);
  const Icon = config.icon;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Le titre et la description sont obligatoires');
      return;
    }

    addToolBoxItem({
      category,
      title: formData.title,
      description: formData.description,
      example: formData.example || undefined,
      learningStrategy: formData.learningStrategy || undefined,
      errorContext: formData.errorContext || undefined,
    });

    // Reset form
    setFormData({
      title: '',
      description: '',
      example: '',
      learningStrategy: '',
      errorContext: '',
    });
    setShowAddForm(false);
  };

  return (
    <div>
      {/* Header catégorie */}
      <div className={`${config.color} p-4 rounded-lg mb-6`}>
        <div className="flex items-center gap-3 mb-2">
          <Icon className="w-6 h-6" />
          <h2 className="text-xl font-semibold">{config.label}</h2>
        </div>
        <p className="text-sm opacity-80">{config.description}</p>
      </div>

      {/* Bouton ajouter */}
      <button
        onClick={() => setShowAddForm(!showAddForm)}
        className="w-full mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition flex items-center justify-center gap-2 text-gray-600 hover:text-blue-600"
      >
        <Plus className="w-5 h-5" />
        Ajouter un élément
      </button>

      {/* Formulaire d'ajout */}
      {showAddForm && (
        <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Nouvel élément</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titre / Concept principal *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Accord du participe passé avec 'être'"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Explication / Règle *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Avec l'auxiliaire 'être', le participe passé s'accorde avec le sujet"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exemple concret
              </label>
              <input
                type="text"
                value={formData.example}
                onChange={(e) => setFormData({ ...formData, example: e.target.value })}
                placeholder="Ex: Elle est allée (féminin) / Ils sont partis (masculin pluriel)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                💡 Ma stratégie pour m'en souvenir
              </label>
              <textarea
                value={formData.learningStrategy}
                onChange={(e) => setFormData({ ...formData, learningStrategy: e.target.value })}
                placeholder="Ex: Je pense à 'être = accord' / Je visualise le genre du sujet avant d'écrire"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ⚠️ Contexte de mon erreur (optionnel)
              </label>
              <input
                type="text"
                value={formData.errorContext}
                onChange={(e) => setFormData({ ...formData, errorContext: e.target.value })}
                placeholder="Ex: J'avais écrit 'elle est allé' dans un email formel"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Ajouter à ma boîte à outils
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des items */}
      {items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Aucun élément dans cette catégorie pour le moment.</p>
          <p className="text-sm mt-2">Ajoutez vos découvertes au fur et à mesure !</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <ItemComponent key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};