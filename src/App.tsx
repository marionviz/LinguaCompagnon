import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { Chat } from '@google/genai';
import type { ChatMessage } from './types';
import { getSystemPrompt, getWeekThemes } from './services/geminiService';
import ChatMessageComponent from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import WeekSelector from './components/WeekSelector';
import { DownloadIcon, EndIcon } from './components/Icons';

const avatarDataUrl = "data:image/jpeg;base64,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";

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [currentThemes, setCurrentThemes] = useState<string>(getWeekThemes(currentWeek));
  const [error, setError] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);
  
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentWeek]);

  useEffect(() => {
    const getAndSetVoices = () => {
      if (typeof window.speechSynthesis !== 'undefined') {
        setVoices(window.speechSynthesis.getVoices());
      }
    };
    if (typeof window.speechSynthesis !== 'undefined') {
      window.speechSynthesis.addEventListener('voiceschanged', getAndSetVoices);
      getAndSetVoices();
    }
    return () => {
      if (typeof window.speechSynthesis !== 'undefined') {
        window.speechSynthesis.removeEventListener('voiceschanged', getAndSetVoices);
      }
    };
  }, []);


  const sendWelcomeMessage = () => {
    setIsLoading(true);
    setMessages([]);
    setTimeout(() => {
        const firstMessage: ChatMessage = {
            id: `model-${Date.now()}`,
            role: 'model',
            text: `Bonjour ! Je suis l'avatar de Marion et je suis votre partenaire conversationnel. Mon objectif est de vous aider à mettre en application ce que vous apprenez en cours. Nous sommes en semaine ${currentWeek}. Commençons à pratiquer ! Comment allez-vous aujourd'hui ?`,
        };
        setMessages([firstMessage]);
        setIsLoading(false);
    }, 500);
  }

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
        
        sendWelcomeMessage();

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
  
  const handleDownload = () => {
    if (messages.length === 0) return;
    const header = `Conversation - LinguaCompagnon - Semaine ${currentWeek}\n=========================================\n\n`;
    const formatted = messages.map(msg => {
      const prefix = msg.role === 'user' ? 'Apprenant' : 'LinguaCompagnon';
      return `${prefix}:\n${msg.text}\n`;
    }).join('\n-----------------------------------------\n\n');
    
    const content = header + formatted;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `linguacompagnon-semaine-${currentWeek}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleEnd = () => {
    if (messages.length === 0) return;
    if (window.confirm('Voulez-vous vraiment terminer et effacer cette conversation ?')) {
      sendWelcomeMessage();
    }
  };

  const handlePractice = (messageId: string) => {
    console.log('🎯 Bouton "Je veux pratiquer" cliqué pour le message:', messageId);
    handleSendMessage("C'est noté. Pourriez-vous me donner un exercice de 5 phrases pour pratiquer ce point de grammaire ou de conjugaison ?");
  };

  const handleSpeak = (text: string, messageId: string) => {
    if (typeof window.speechSynthesis === 'undefined') {
      setError('Votre navigateur ne supporte pas la synthèse vocale.');
      return;
    }
    if (speakingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    
    const cleanText = text.replace(/\*\*/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'fr-FR';
    
    const frenchVoices = voices.filter(voice => voice.lang === 'fr-FR');
    if (frenchVoices.length > 0) {
      const preferredVoice = 
        frenchVoices.find(voice => voice.name.includes('Google')) || 
        frenchVoices.find(voice => voice.localService) ||
        frenchVoices[0];
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setSpeakingMessageId(messageId);
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = (e) => {
        console.error("Speech synthesis error", e);
        setSpeakingMessageId(null);
    };
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
        
        // ✅ DÉTECTION DE [PRATIQUE]
        let displayText = streamedText;
        let currentHasPractice = false;

        if (displayText.includes('[PRATIQUE]')) {
          displayText = displayText.replace('[PRATIQUE]', '').trim();
          currentHasPractice = true;
          console.log('🟢 [PRATIQUE] détecté ! hasPractice =', currentHasPractice);
          console.log('📝 Texte après remplacement:', displayText);
        }
        
        setMessages((prevMessages) => {
          const newMessages = [...prevMessages];
          if (newMessages.length > 0) {
              const lastMessage = newMessages[newMessages.length - 1];
              newMessages[newMessages.length - 1] = { 
                ...lastMessage, 
                text: displayText,
                hasPractice: currentHasPractice 
              };
          }
          return newMessages;
        });
      }

    } catch (e) {
      console.error(e);
      const errorMessage = "Désolé, une erreur est survenue. Veuillez réessayer. Si le problème persiste, contactez votre enseignante.";
      setMessages((prevMessages) => {
          const newMessages = [...prevMessages];
          if (newMessages.length > 0) {
            const lastMessage = newMessages[newMessages.length - 1];
            newMessages[newMessages.length - 1] = { ...lastMessage, text: errorMessage };
          }
          return newMessages;
      });
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white font-sans">
      <header className="p-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center">
            <img src="/avatar.jpg" alt="Avatar de Marion" className="w-12 h-12 rounded-full mr-3 border-2 border-white shadow-md" />
            <h1 className="text-xl font-bold text-gray-800">
              Lingua<span className="text-brand-green">Compagnon</span>
            </h1>
          </div>
          <WeekSelector currentWeek={currentWeek} onWeekChange={handleWeekChange} />
        </div>
         <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600 flex-grow">
                <span className="font-semibold text-gray-900">Objectifs :</span> {currentThemes}
            </p>
            <div className="flex items-center gap-2">
                <button onClick={handleDownload} aria-label="Télécharger la conversation" className="p-2 rounded-md text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors"><DownloadIcon className="w-5 h-5"/></button>
                <button onClick={handleEnd} aria-label="Terminer la conversation" className="p-2 rounded-md text-red-500 hover:bg-red-100 hover:text-red-700 transition-colors"><EndIcon className="w-5 h-5"/></button>
            </div>
        </div>
      </header>
      
      <main className="flex-grow overflow-y-auto p-4 bg-gray-50">
         {error && <div className="p-4 mb-4 text-sm text-red-800 bg-red-100 rounded-lg" role="alert">
            <span className="font-medium">Erreur :</span> {error}
          </div>}

        <div className="flex flex-col">
          {messages.map((msg) => (
            <ChatMessageComponent 
              key={msg.id} 
              message={msg}
              onSpeak={handleSpeak}
              onPractice={handlePractice}
              isSpeaking={speakingMessageId === msg.id}
            />
          ))}
           <div ref={messagesEndRef} />
        </div>
      </main>
      
      <footer className="sticky bottom-0 z-10">
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </footer>
    </div>
  );
};

export default App;