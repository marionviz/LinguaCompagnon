import React from 'react';
import type { ChatMessage as ChatMessageType } from '../types';
import { BotIcon, UserIcon, SpeakerWaveIcon, PencilIcon } from './Icons';

interface ChatMessageProps {
  message: ChatMessageType;
  onSpeak: (text: string, messageId: string) => void;
  onPractice: (messageId: string) => void;
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

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onSpeak, onPractice, isSpeaking }) => {
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
        {isModel && message.text && (
          <div className="flex items-center gap-2 mt-2 px-1">
            <button
              onClick={() => onSpeak(message.text, message.id)}
              aria-label="Écouter le message"
              className={`p-1.5 rounded-full transition-colors ${isSpeaking ? 'text-brand-green bg-green-100' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}
            >
              <SpeakerWaveIcon className="w-5 h-5" />
            </button>
            {message.hasPractice && (
              <button
                onClick={() => onPractice(message.id)}
                className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                <PencilIcon className="w-5 h-5" />
                Je veux pratiquer
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;