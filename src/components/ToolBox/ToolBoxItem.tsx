import React, { useState } from 'react';
import { ToolBoxItem as ToolBoxItemType } from '../../types/toolbox.types';
import { useToolBox } from '../../hooks/useToolBox';
import { Trash2, Eye, Edit2, Check, X } from 'lucide-react';

interface Props {
  item: ToolBoxItemType;
}

export const ToolBoxItem: React.FC<Props> = ({ item }) => {
  const { removeItem, updateItem, reviewItem } = useToolBox();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: item.title,
    description: item.description,
    example: item.example || '',
    learningStrategy: item.learningStrategy || '',
  });

  const handleSave = () => {
    updateItem(item.id, editData);
    setIsEditing(false);
  };

  const handleView = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      reviewItem(item.id);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-grow">
          {isEditing ? (
            <input
              type="text"
              value={editData.title}
              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              className="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <h3 className="font-semibold text-gray-900">{item.title}</h3>
          )}
          
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <span>Ajouté le {new Date(item.addedDate).toLocaleDateString('fr-FR')}</span>
            {item.reviewCount > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {item.reviewCount} révision{item.reviewCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="p-1.5 text-green-600 hover:bg-green-50 rounded transition"
                title="Sauvegarder"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1.5 text-gray-600 hover:bg-gray-50 rounded transition"
                title="Annuler"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleView}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                title="Voir détails"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 text-gray-600 hover:bg-gray-50 rounded transition"
                title="Modifier"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (confirm('Supprimer cet élément ?')) {
                    removeItem(item.id);
                  }
                }}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Détails expansibles */}
      {isExpanded && !isEditing && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Explication :</div>
            <p className="text-sm text-gray-600">{item.description}</p>
          </div>

          {item.example && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Exemple :</div>
              <p className="text-sm text-gray-600 italic">"{item.example}"</p>
            </div>
          )}

          {item.learningStrategy && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <div className="text-sm font-medium text-yellow-800 mb-1">💡 Ma stratégie :</div>
              <p className="text-sm text-yellow-700">{item.learningStrategy}</p>
            </div>
          )}

          {item.errorContext && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <div className="text-sm font-medium text-red-800 mb-1">⚠️ Contexte d'erreur :</div>
              <p className="text-sm text-red-700">{item.errorContext}</p>
            </div>
          )}
        </div>
      )}

      {/* Mode édition */}
      {isExpanded && isEditing && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Explication :
            </label>
            <textarea
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 h-20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Exemple :
            </label>
            <input
              type="text"
              value={editData.example}
              onChange={(e) => setEditData({ ...editData, example: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ma stratégie :
            </label>
            <textarea
              value={editData.learningStrategy}
              onChange={(e) => setEditData({ ...editData, learningStrategy: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 h-16"
            />
          </div>
        </div>
      )}
    </div>
  );
};