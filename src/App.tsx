
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { Chat } from '@google/genai';
import type { ChatMessage, Feedback } from './types';
import { getSystemPrompt, getWeekThemes } from './services/geminiService';
import ChatMessageComponent from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import WeekSelector from './components/WeekSelector';

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [currentThemes, setCurrentThemes] = useState<string>(getWeekThemes(currentWeek));
  const [error, setError] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);
  
  // Stop speech synthesis when component unmounts or week changes
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentWeek]);


  useEffect(() => {
    const initializeChat = () => {
      try {
        if (!process.env.API_KEY) {
          throw new Error("API_KEY environment variable not set.");
        }
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        setCurrentThemes(getWeekThemes(currentWeek));
        const systemInstruction = getSystemPrompt(currentWeek);
        
        chatRef.current = ai.chats.create({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction,
          },
        });
        
        setMessages([]); 
        setIsLoading(true);
        setTimeout(() => {
            const firstMessage: ChatMessage = {
                id: `model-${Date.now()}`,
                role: 'model',
                text: `Bonjour ! Je suis LinguaCompagnon, votre partenaire conversationnel. Nous sommes en semaine ${currentWeek}. Commençons à pratiquer ! Comment allez-vous aujourd'hui ?`,
            };
            setMessages([firstMessage]);
            setIsLoading(false);
        }, 1000);

      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : 'An unknown error occurred during initialization.');
      }
    };
    initializeChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeek]);
  
  const handleWeekChange = (week: number) => {
    setCurrentWeek(week);
  };

  const handleFeedback = (messageId: string, feedback: Feedback) => {
    setMessages(prevMessages =>
      prevMessages.map(msg => {
        if (msg.id === messageId) {
          // Toggle feedback: if same button is clicked again, remove feedback
          return { ...msg, feedback: msg.feedback === feedback ? undefined : feedback };
        }
        return msg;
      })
    );
  };

  const handleSpeak = (text: string, messageId: string) => {
    if (typeof window.speechSynthesis === 'undefined') {
      setError('Votre navigateur ne supporte pas la synthèse vocale.');
      return;
    }
    // If this message is already speaking, stop it.
    if (speakingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    // If another message is speaking, stop it before starting a new one.
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.onstart = () => setSpeakingMessageId(messageId);
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (text: string) => {
    if (!chatRef.current) {
        setError("Chat is not initialized.");
        return;
    }

    setIsLoading(true);
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', text };
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    const modelMessage: ChatMessage = { id: `model-${Date.now()}`, role: 'model', text: '' };
    setMessages((prevMessages) => [...prevMessages, modelMessage]);

    try {
      const result = await chatRef.current.sendMessageStream({ message: text });
      
      let streamedText = '';
      for await (const chunk of result) {
        streamedText += chunk.text;
        setMessages((prevMessages) => {
          const newMessages = [...prevMessages];
          const lastMessage = newMessages[newMessages.length - 1];
          newMessages[newMessages.length - 1] = { ...lastMessage, text: streamedText };
          return newMessages;
        });
      }

    } catch (e) {
      console.error(e);
      const errorMessage = "Désolé, une erreur est survenue. Veuillez réessayer. Si le problème persiste, contactez votre enseignante.";
      setMessages((prevMessages) => {
          const newMessages = [...prevMessages];
          const lastMessage = newMessages[newMessages.length - 1];
          newMessages[newMessages.length - 1] = { ...lastMessage, text: errorMessage };
          return newMessages;
      });
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-slate-900 font-sans">
      <header className="p-4 border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-xl font-bold text-white">
            Lingua<span className="text-indigo-400">Compagnon</span>
          </h1>
          <WeekSelector currentWeek={currentWeek} onWeekChange={handleWeekChange} />
        </div>
        <p className="text-sm text-slate-300">
            <span className="font-semibold text-slate-100">Objectifs :</span> {currentThemes}
        </p>
      </header>
      
      <main className="flex-grow overflow-y-auto p-4">
         {error && <div className="p-4 mb-4 text-sm text-red-200 bg-red-800 rounded-lg" role="alert">
            <span className="font-medium">Erreur :</span> {error}
          </div>}

        <div className="flex flex-col">
          {messages.map((msg) => (
            <ChatMessageComponent 
              key={msg.id} 
              message={msg}
              onFeedback={(feedback) => handleFeedback(msg.id, feedback)}
              onSpeak={handleSpeak}
              isSpeaking={speakingMessageId === msg.id}
            />
          ))}
           <div ref={messagesEndRef} />
        </div>
      </main>
      
      <footer className="p-2 sticky bottom-0 bg-slate-900">
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </footer>
    </div>
  );
};

export default App;
