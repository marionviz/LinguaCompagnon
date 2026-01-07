import React from 'react';
import type { ChatMessage as ChatMessageType } from '../types';
import { BotIcon, UserIcon, SpeakerWaveIcon, PencilIcon } from './Icons';

interface ChatMessageProps {
  message: ChatMessageType;
  onSpeak: (text: string, messageId: string) => void;
  onPractice: (messageId: string) => void;
  onReportDoubt: (messageId: string) => void; // ✅ NOUVEAU
  isSpeaking: boolean;
}

// Simple parser for **bold** text and newlines
const SimpleMarkdown: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        // Handle newlines
        return part.split('\n').map((line, j) => (
            <React.Fragment key={`${i}-${j}`}>
              {line}
              {j < part.split('\n').length - 1 && <br />}
            </React.Fragment>
          ));
      })}
    </>
  );
};

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  onSpeak, 
  onPractice, 
  onReportDoubt, // ✅ NOUVEAU
  isSpeaking 
}) => {
  const isModel = message.role === 'model';

  return (
    <div className={`flex items-start gap-3 my-4 ${isModel ? '' : 'flex-row-reverse'}`}>
       <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
           isModel ? 'bg-brand-green' : 'bg-gray-300'
        }`}>
            {isModel ? <BotIcon className="w-6 h-6 text-white"/> : <UserIcon className="w-6 h-6 text-gray-600"/>}
        </div>
      <div className={`flex flex-col ${isModel ? 'items-start' : 'items-end'}`}>
        <div className={`max-w-xl p-4 rounded-xl shadow-sm ${
            isModel 
              ? 'bg-gray-200 text-gray-800 rounded-tl-none' 
              : 'bg-brand-green text-white rounded-br-none'
          }`}
        >
          <div className="prose prose-p:my-0 prose-strong:text-brand-green">
               <SimpleMarkdown text={message.text} />
          </div>
        </div>
        
        {/* ✅ BOUTONS POUR LES MESSAGES DE JULIE */}
        {isModel && message.text && (
          <div className="flex items-center gap-2 mt-2 px-1 flex-wrap">
            {/* Bouton Écouter */}
            <button
              onClick={() => onSpeak(message.text, message.id)}
              aria-label="Écouter le message"
              className={`p-1.5 rounded-full transition-colors ${isSpeaking ? 'text-brand-green bg-green-100' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}
            >
              <SpeakerWaveIcon className="w-5 h-5" />
            </button>
            
            {/* Bouton Pratiquer */}
            {message.hasPractice && (
              <button
                onClick={() => onPractice(message.id)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-green hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                <PencilIcon className="w-5 h-5" />
                Je veux pratiquer
              </button>
            )}
            
            {/* ✅ NOUVEAU : Bouton Signaler un doute */}
            <button
              onClick={() => onReportDoubt(message.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 hover:text-orange-800 text-xs font-medium rounded-lg transition-all border border-orange-300"
              title="Signaler un doute sur cette correction à Marion"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Un doute ?
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;