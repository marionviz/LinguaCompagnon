import React, { useState, useEffect, useRef } from 'react';
import { SendIcon } from './Icons';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true; // ✅ MODIFIÉ : Enregistrement continu
      recognition.lang = 'fr-FR';
      recognition.interimResults = true; // ✅ MODIFIÉ : Afficher les résultats intermédiaires

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputValue(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        // ✅ MODIFIÉ : Ne pas arrêter automatiquement si l'utilisateur est en train d'enregistrer
        if (isListening) {
          recognitionRef.current.start();
        }
      };
      
      recognitionRef.current = recognition;
    }
  }, [isListening]);

  const toggleListening = () => {
    if (isLoading || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      // ✅ Arrêter l'enregistrement si actif avant d'envoyer
      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
      }
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
      <div className="flex gap-2 px-3 pt-2 pb-0 overflow-x-auto">
        {specialChars.map((char) => (
          <button
            key={char}
            type="button"
            onClick={() => insertCharacter(char)}
            disabled={isLoading}
            className="px-3 py-1 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-green-600 hover:text-white hover:border-green-600 transition-colors text-sm font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-green-600"
          >
            {char}
          </button>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-2 pt-2">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écrivez votre message ou dictez-le..."
          className="flex-grow bg-white text-gray-900 placeholder-gray-500 p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent resize-none"
          rows={1}
          disabled={isLoading}
        />
        
        {/* ✅ NOUVEAU BOUTON MICRO avec animation */}
        <button
          type="button"
          onClick={toggleListening}
          disabled={isLoading}
          aria-label={isListening ? 'Arrêter l\'enregistrement' : 'Commencer l\'enregistrement'}
          className={`flex-shrink-0 p-3 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-brand-green disabled:opacity-50 disabled:cursor-not-allowed relative ${
              isListening 
                ? 'bg-red-600 text-white shadow-lg' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {isListening ? (
            // ✅ Animation barres verticales pendant l'enregistrement
            <div className="flex items-center justify-center gap-1 w-6 h-6">
              <div className="w-1 bg-white rounded-full animate-pulse" style={{height: '60%', animationDelay: '0ms'}}></div>
              <div className="w-1 bg-white rounded-full animate-pulse" style={{height: '100%', animationDelay: '150ms'}}></div>
              <div className="w-1 bg-white rounded-full animate-pulse" style={{height: '80%', animationDelay: '300ms'}}></div>
              <div className="w-1 bg-white rounded-full animate-pulse" style={{height: '60%', animationDelay: '450ms'}}></div>
            </div>
          ) : (
            // ✅ Icône micro simple
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>

        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          aria-label="Envoyer le message"
          className="bg-brand-green text-white p-3 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-brand-green-dark transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green"
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