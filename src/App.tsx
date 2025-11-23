import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { Chat } from '@google/genai';
import type { ChatMessage } from './types';
import { getSystemPrompt, getWeekThemes } from './services/geminiService';
import ChatMessageComponent from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import WeekSelector from './components/WeekSelector';
import LiveTutorOral from './components/LiveTutorOral';
import { DownloadIcon, EndIcon, PhoneIcon, ChatBubbleLeftRightIcon } from './components/Icons';

type ConversationMode = 'ecrit' | 'oral' | null;

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [currentThemes, setCurrentThemes] = useState<string>(getWeekThemes(currentWeek));
  const [error, setError] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  const [conversationMode, setConversationMode] = useState<ConversationMode>(null);
  const [showModeSelector, setShowModeSelector] = useState(true);
  const [showOralWeekSelector, setShowOralWeekSelector] = useState(false);

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
            text: `Bonjour ! Je suis votre partenaire conversationnel. Mon objectif est de vous aider à mettre en application ce que vous apprenez en cours. Nous sommes en semaine ${currentWeek}. Commençons à pratiquer ! Comment allez-vous aujourd'hui ?`,
        };
        setMessages([firstMessage]);
        setIsLoading(false);
    }, 500);
  };

  useEffect(() => {
    if (conversationMode === 'ecrit') {
      const initializeChat = () => {
        try {
          const apiKey = import.meta.env.VITE_API_KEY;
          
          if (!apiKey) {
            throw new Error("VITE_API_KEY environment variable not set. Please check your .env.local file.");
          }
          const ai = new GoogleGenAI({ apiKey });
          
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
    }
  }, [currentWeek, conversationMode]);
  
  const handleWeekChange = (week: number) => {
    setCurrentWeek(week);
  };

  const handleModeSelect = (mode: ConversationMode) => {
    setConversationMode(mode);
    if (mode === 'oral') {
      // Pour le mode oral, afficher d'abord le sélecteur de semaine
      setShowModeSelector(false);
      setShowOralWeekSelector(true);
    } else {
      // Pour le mode écrit, démarrer directement
      setShowModeSelector(false);
      setShowOralWeekSelector(false);
    }
  };

  const handleBackToModeSelector = () => {
    setConversationMode(null);
    setShowModeSelector(true);
    setShowOralWeekSelector(false);
    setMessages([]);
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const handleOralWeekSelect = (week: number) => {
    setCurrentWeek(week);
    setShowOralWeekSelector(false);
    // Le mode oral va démarrer avec la semaine sélectionnée
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
    if (messages.length === 0 && conversationMode !== 'oral') return;
    if (window.confirm('Voulez-vous vraiment terminer et revenir au choix du mode ?')) {
      handleBackToModeSelector();
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
        
        let displayText = streamedText;
        let currentHasPractice = false;

        if (displayText.includes('[PRATIQUE]')) {
          displayText = displayText.replace('[PRATIQUE]', '').trim();
          currentHasPractice = true;
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

  if (showModeSelector) {
    return (
      <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white font-sans">
        <header className="p-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-800">
              Lingua<span className="text-brand-green">Compagnon</span>
            </h1>
            <WeekSelector currentWeek={currentWeek} onWeekChange={handleWeekChange} />
          </div>
        </header>

        <main className="flex-grow flex flex-col items-center justify-center p-8 bg-gray-50">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Comment souhaitez-vous pratiquer ?
            </h2>
            <p className="text-gray-600 text-lg">
              Semaine {currentWeek} : {currentThemes}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
            <button
              onClick={() => handleModeSelect('ecrit')}
              className="group flex flex-col items-center p-8 bg-white rounded-2xl border-2 border-gray-200 hover:border-brand-green hover:shadow-xl transition-all duration-300"
            >
              <div className="w-24 h-24 mb-6 rounded-full bg-gray-100 group-hover:bg-green-50 flex items-center justify-center transition-colors">
                <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-600 group-hover:text-brand-green transition-colors" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">Mode Écrit</h3>
              <p className="text-gray-600 text-center mb-4">
                Conversation par messages texte avec corrections détaillées
              </p>
              <ul className="text-sm text-gray-500 space-y-2 text-left">
                <li>✓ Corrections visuelles</li>
                <li>✓ Exercices de systématisation</li>
                <li>✓ Lecture audio optionnelle</li>
              </ul>
            </button>

            <button
              onClick={() => handleModeSelect('oral')}
              className="group flex flex-col items-center p-8 bg-white rounded-2xl border-2 border-gray-200 hover:border-brand-green hover:shadow-xl transition-all duration-300"
            >
              <div className="w-24 h-24 mb-6 rounded-full bg-gray-100 group-hover:bg-green-50 flex items-center justify-center transition-colors">
                <PhoneIcon className="w-12 h-12 text-gray-600 group-hover:text-brand-green transition-colors" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">Mode Oral</h3>
              <p className="text-gray-600 text-center mb-4">
                Conversation vocale en temps réel avec votre tuteur IA
              </p>
              <ul className="text-sm text-gray-500 space-y-2 text-left">
                <li>✓ Dialogue naturel</li>
                <li>✓ Pratique orale immersive</li>
                <li>✓ Voix IA haute qualité</li>
              </ul>
            </button>
          </div>

          <p className="mt-8 text-sm text-gray-500">
            💡 Astuce : Alternez entre les deux modes pour une pratique complète !
          </p>
        </main>
      </div>
    );
  }

  // Écran de sélection de semaine pour le mode oral
  if (showOralWeekSelector && conversationMode === 'oral') {
    return (
      <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white font-sans">
        <header className="p-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-800">
              Lingua<span className="text-brand-green">Compagnon</span>
              <span className="text-sm font-normal text-gray-500 ml-2">Mode Oral</span>
            </h1>
            <button 
              onClick={handleBackToModeSelector}
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← Retour
            </button>
          </div>
        </header>

        <main className="flex-grow flex flex-col items-center justify-center p-8 bg-gray-50">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Choisissez une semaine
            </h2>
            <p className="text-gray-600 text-lg">
              Sélectionnez la semaine que vous souhaitez pratiquer à l'oral
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full max-w-4xl">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((week) => {
              const weekTheme = getWeekThemes(week);
              return (
                <button
                  key={week}
                  onClick={() => handleOralWeekSelect(week)}
                  className="group relative p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-brand-green hover:shadow-xl transition-all duration-300 text-left"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-brand-green/10 group-hover:bg-brand-green flex items-center justify-center transition-colors">
                      <span className="text-lg font-bold text-brand-green group-hover:text-white transition-colors">
                        {week}
                      </span>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-brand-green transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors line-clamp-2">
                    {weekTheme}
                  </p>
                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-5 h-5 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="mt-8 text-sm text-gray-500">
            💡 Chaque semaine a des objectifs pédagogiques spécifiques
          </p>
        </main>
      </div>
    );
  }

  if (conversationMode === 'oral') {
    return (
      <LiveTutorOral 
        weekNumber={currentWeek}
        onClose={handleBackToModeSelector}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white font-sans">
      <header className="p-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-green rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">
              LC
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                Lingua<span className="text-brand-green">Compagnon</span>
              </h1>
              <p className="text-xs text-gray-500">Mode Écrit</p>
            </div>
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