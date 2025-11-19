
import React, { useState, useEffect, useRef } from 'react';
import { SendIcon, MicrophoneIcon } from './Icons';

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
      recognition.continuous = false;
      recognition.lang = 'fr-FR';
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(prev => (prev ? prev + ' ' : '') + transcript);
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (isLoading || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };


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

  const specialChars = ['é', 'è', 'à', 'ç'];

  return (
    <div className="flex flex-col bg-gray-100 border-t border-gray-200">
      <div className="flex gap-2 px-3 pt-2 pb-0 overflow-x-auto">
        {specialChars.map((char) => (
          <button
            key={char}
            type="button"
            onClick={() => insertCharacter(char)}
            disabled={isLoading}
            className="px-3 py-1 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-brand-green hover:text-white hover:border-brand-green transition-colors text-sm font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-brand-green"
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
          placeholder="Écrivez votre message..."
          className="flex-grow bg-white text-gray-900 placeholder-gray-500 p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent resize-none"
          rows={1}
          disabled={isLoading}
        />
        <button
          type="button"
          onClick={toggleListening}
          disabled={isLoading}
          aria-label={isListening ? 'Arrêter la dictée' : 'Commencer la dictée'}
          className={`flex-shrink-0 p-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green disabled:opacity-50 disabled:cursor-not-allowed ${
              isListening ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <MicrophoneIcon className="w-6 h-6" />
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
