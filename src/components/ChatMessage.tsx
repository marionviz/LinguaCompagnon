
import React from 'react';
import type { ChatMessage as ChatMessageType, Feedback } from '../types';
import { BotIcon, UserIcon, ThumbsUpIcon, ThumbsDownIcon, SpeakerWaveIcon } from './Icons';

interface ChatMessageProps {
  message: ChatMessageType;
  onFeedback: (feedback: Feedback) => void;
  onSpeak: (text: string, messageId: string) => void;
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

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onFeedback, onSpeak, isSpeaking }) => {
  const isModel = message.role === 'model';

  return (
    <div className={`flex items-start gap-4 my-4 ${isModel ? '' : 'flex-row-reverse'}`}>
       <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
           isModel ? 'bg-cyan-500' : 'bg-slate-600'
        }`}>
            {isModel ? <BotIcon className="w-6 h-6 text-white"/> : <UserIcon className="w-6 h-6 text-slate-300"/>}
        </div>
      <div className={`flex flex-col ${isModel ? 'items-start' : 'items-end'}`}>
        <div className={`max-w-xl p-4 rounded-xl shadow-md ${
            isModel 
              ? 'bg-slate-700 text-slate-100 rounded-tl-none' 
              : 'bg-indigo-600 text-white rounded-br-none'
          }`}
        >
          <div className="prose prose-invert prose-p:my-0 prose-strong:text-cyan-300">
               <SimpleMarkdown text={message.text} />
          </div>
        </div>
        {isModel && message.text && (
          <div className="flex items-center gap-3 mt-2 px-1">
            <button
              onClick={() => onSpeak(message.text, message.id)}
              aria-label="Écouter le message"
              className={`p-1.5 rounded-full transition-colors ${isSpeaking ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <SpeakerWaveIcon className="w-6 h-6" />
            </button>
            <button
              onClick={() => onFeedback('up')}
              aria-label="Bonne réponse"
              className={`p-1.5 rounded-full transition-colors ${message.feedback === 'up' ? 'text-green-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <ThumbsUpIcon className="w-6 h-6" />
            </button>
            <button
              onClick={() => onFeedback('down')}
              aria-label="Mauvaise réponse"
              className={`p-1.5 rounded-full transition-colors ${message.feedback === 'down' ? 'text-red-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <ThumbsDownIcon className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
