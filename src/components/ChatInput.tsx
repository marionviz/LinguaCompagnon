import React, { useState, useRef } from 'react';
import { SendIcon } from './Icons';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onDownload: () => void;
  isLoading: boolean;
  hasMessages: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, onDownload, isLoading, hasMessages }) => {
  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
    }
  };

  const insertCharacter = (char: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = inputValue.substring(0, start) + char + inputValue.substring(end);
      setInputValue(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 1, start + 1);
      }, 0);
    } else {
      setInputValue(prev => prev + char);
    }
  };

  const specialChars = ['é', 'è', 'à', 'ç', "'", 'ê', 'ù', 'œ'];

  return (
    <div className="flex flex-col bg-gray-100 border-t border-gray-200">
      {/* ✅ Caractères spéciaux + Bouton Télécharger responsive */}
      <div className="flex gap-2 px-3 pt-2 pb-0 overflow-x-auto items-center">
        {specialChars.map((char) => (
          <button
            key={char}
            type="button"
            onClick={() => insertCharacter(char)}
            disabled={isLoading}
            className="px-3 py-1 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-green-600 hover:text-white hover:border-green-600 transition-colors text-sm font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-green-600 flex-shrink-0"
          >
            {char}
          </button>
        ))}
        
        {/* ✅ BOUTON TÉLÉCHARGER - Responsive (texte caché sur mobile) */}
        <button
          type="button"
          onClick={onDownload}
          disabled={!hasMessages}
          className="ml-auto flex-shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-3 py-2 md:px-4 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Télécharger la conversation"
          aria-label="Télécharger la conversation"
        >
          {/* Icône télécharger */}
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {/* ✅ Texte visible uniquement sur desktop (≥768px) */}
          <span className="hidden md:inline text-sm font-medium">Télécharger</span>
        </button>
      </div>

      {/* ✅ Zone de saisie + bouton Envoi à droite */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2 p-2 pt-2">
        {/* ✅ TEXTAREA */}
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écrivez votre message..."
          className="flex-grow bg-white text-gray-900 placeholder-gray-500 p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent resize-none min-h-[80px]"
          rows={3}
          disabled={isLoading}
        />

        {/* ✅ BOUTON ENVOI À DROITE */}
        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          aria-label="Envoyer le message"
          className="flex-shrink-0 bg-brand-green text-white p-3 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green shadow-md"
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
          ) : (
            <SendIcon className="w-6 h-6" />
          )}
        </button>
      </form>
    </div>
  );
};

export default ChatInput;
