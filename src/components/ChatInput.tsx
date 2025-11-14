
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

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 p-2 bg-slate-800 border-t border-slate-700">
      <textarea
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Écrivez votre message..."
        className="flex-grow bg-slate-700 text-slate-100 placeholder-slate-400 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        rows={1}
        disabled={isLoading}
      />
      <button
        type="button"
        onClick={toggleListening}
        disabled={isLoading}
        aria-label={isListening ? 'Arrêter la dictée' : 'Commencer la dictée'}
        className={`flex-shrink-0 p-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed ${
            isListening ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-600 text-slate-200 hover:bg-slate-500'
        }`}
      >
        <MicrophoneIcon className="w-6 h-6" />
      </button>
      <button
        type="submit"
        disabled={isLoading || !inputValue.trim()}
        className="bg-indigo-600 text-white p-3 rounded-lg disabled:bg-slate-600 disabled:cursor-not-allowed hover:bg-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {isLoading ? (
          <div className="w-6 h-6 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
        ) : (
          <SendIcon className="w-6 h-6" />
        )}
      </button>
    </form>
  );
};

export default ChatInput;
