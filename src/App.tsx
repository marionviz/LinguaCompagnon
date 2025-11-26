// Version App.tsx avec TOUS les modèles possibles
// Décommentez celui qui fonctionne après avoir mis à jour le package

import React, { useState, useEffect, useRef } from 'react';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import WeekSelector from './components/WeekSelector';
import LiveTutorOral from './components/LiveTutorOral';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSystemPrompt, getWeekThemes } from './services/geminiService';
import './index.css';

type ConversationMode = 'ecrit' | 'oral' | null;

type ChatMessage = { 
  id: string; 
  role: 'model' | 'user'; 
  text: string;
  hasPractice?: boolean;
};

function App() {
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

  const chatRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initializingRef = useRef(false);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const sendWelcomeMessage = () => {
    console.log('📨 Envoi message bienvenue...');
    setIsLoading(true);
    setMessages([]);
    setTimeout(() => {
        const firstMessage: ChatMessage = {
            id: `model-${Date.now()}`,
            role: 'model',
            text: `Bonjour ! Je suis l'avatar de Marion. Mon objectif est de vous aider à pratiquer votre écrit en appliquant ce que vous apprenez en cours. Nous sommes en semaine ${currentWeek}. Commençons à pratiquer ! Comment allez-vous aujourd'hui ?`,
        };
        setMessages([firstMessage]);
        setIsLoading(false);
        console.log('✅ Message bienvenue envoyé');
    }, 500);
  };

  useEffect(() => {
    if (conversationMode === 'ecrit' && !initializingRef.current) {
      initializingRef.current = true;
      console.log('🚀 Initialisation du chat mode écrit...');
      
      const initializeChat = async () => {
        try {
          const apiKey = import.meta.env.VITE_API_KEY;
          console.log('🔑 API Key:', apiKey ? 'présente' : 'MANQUANTE');
          
          if (!apiKey) {
            throw new Error('La clé API est manquante. Assurez-vous que VITE_API_KEY est définie dans .env.local.');
          }

          console.log('🤖 Création GoogleGenerativeAI...');
          const genAI = new GoogleGenerativeAI(apiKey);
          const systemPrompt = getSystemPrompt(currentWeek);
          
          console.log('🧠 Création du modèle...');
          
          const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            
            systemInstruction: systemPrompt,
            generationConfig: {
              temperature: 1.2,
              topP: 0.95,
              topK: 40,
              maxOutputTokens: 8192,
            },
          });
          
          console.log('💬 Démarrage du chat...');
          const chat = model.startChat({
            history: [],
          });
          
          chatRef.current = chat;
          console.log('✅ Chat initialisé avec succès');
          sendWelcomeMessage();
        } catch (error) {
          console.error('❌ Erreur initialisation chat:', error);
          setError(`Impossible d'initialiser le chat: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
          initializingRef.current = false;
        }
      };

      initializeChat();
    }
  }, [conversationMode]);
  
  const handleWeekChange = async (week: number) => {
    console.log('📅 Changement semaine:', week);
    setCurrentWeek(week);
    setCurrentThemes(getWeekThemes(week));
    
    // Réinitialiser le chat avec la nouvelle semaine
    setMessages([]);
    setIsLoading(true);
    
    try {
      const apiKey = import.meta.env.VITE_API_KEY;
      if (!apiKey) {
        throw new Error('La clé API est manquante.');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const systemPrompt = getSystemPrompt(week);
      
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: systemPrompt,
        generationConfig: {
          temperature: 1.2,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192,
        },
      });
      
      const chat = model.startChat({
        history: [],
      });
      
      chatRef.current = chat;
      
      // Envoyer le message de bienvenue avec la bonne semaine
      setTimeout(() => {
        const welcomeMessage: ChatMessage = {
          id: `model-${Date.now()}`,
          role: 'model',
          text: `Bonjour ! Je suis l'avatar de Marion. Mon objectif est de vous aider à pratiquer votre écrit en appliquant ce que vous apprenez en cours. Nous sommes en semaine ${week}. Commençons à pratiquer ! Comment allez-vous aujourd'hui ?`,
        };
        setMessages([welcomeMessage]);
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error('❌ Erreur réinitialisation chat:', error);
      setError(`Impossible de changer de semaine: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      setIsLoading(false);
    }
  };

  const handleModeSelect = (mode: ConversationMode) => {
    console.log('🎯 Sélection mode:', mode);
    setConversationMode(mode);
    if (mode === 'oral') {
      setShowModeSelector(false);
      setShowOralWeekSelector(true);
    } else {
      setShowModeSelector(false);
      setShowOralWeekSelector(false);
    }
  };

  const handleBackToModeSelector = () => {
    console.log('⬅️ Retour au sélecteur de mode');
    setConversationMode(null);
    setShowModeSelector(true);
    setShowOralWeekSelector(false);
    setMessages([]);
    initializingRef.current = false;
    chatRef.current = null;
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const handleOralWeekSelect = (week: number) => {
    console.log('🎤 Sélection semaine oral:', week);
    setCurrentWeek(week);
    setShowOralWeekSelector(false);
  };
  
  const handleDownload = () => {
    if (messages.length === 0) return;
    const header = `Conversation - LinguaCompagnon - Semaine ${currentWeek}\n=========================================\n\n`;
    const formatted = messages.map(msg => {
      const prefix = msg.role === 'user' ? 'Apprenant' : 'LinguaCompagnon';
      return `${prefix}: ${msg.text}`;
    }).join('\n\n');
    const blob = new Blob([header + formatted], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-semaine-${currentWeek}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSpeak = (text: string, messageId: string) => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const frenchVoice = voices.find(voice => voice.lang.startsWith('fr'));
    if (frenchVoice) {
      utterance.voice = frenchVoice;
    }
    utterance.lang = 'fr-FR';
    utterance.rate = 0.9;
    utterance.pitch = 1;

    utterance.onstart = () => setSpeakingMessageId(messageId);
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    window.speechSynthesis.speak(utterance);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || !chatRef.current) {
      console.warn('⚠️ Pas de texte ou chat non initialisé');
      return;
    }

    console.log('📤 Envoi message:', text.substring(0, 50) + '...');
    
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: text.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      console.log('⏳ Attente réponse Gemini...');
      const result = await chatRef.current.sendMessage(text);
      const responseText = result.response.text();
      console.log('✅ Réponse reçue:', responseText.substring(0, 50) + '...');

      if (responseText.includes('[PRATIQUE]')) {
        const cleanText = responseText.replace(/\[PRATIQUE\]/g, '').trim();
        
        const responseMessage: ChatMessage = {
          id: `model-${Date.now()}`,
          role: 'model',
          text: cleanText,
          hasPractice: true,
        };
        setMessages((prev) => [...prev, responseMessage]);
      } else {
        const responseMessage: ChatMessage = {
          id: `model-${Date.now()}`,
          role: 'model',
          text: responseText,
        };
        setMessages((prev) => [...prev, responseMessage]);
      }
    } catch (e) {
      console.error('❌ Erreur sendMessage:', e);
      const errorMessage = "Désolé, une erreur est survenue. Veuillez réessayer.";
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
      const errorMsg: ChatMessage = {
        id: `model-error-${Date.now()}`,
        role: 'model',
        text: errorMessage,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  console.log('🎨 Rendu App - mode:', conversationMode, 'selector:', showModeSelector);

  if (showModeSelector) {
    return (
      <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white font-sans">
        <header className="p-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-green rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">
              LC
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                Lingua<span className="text-brand-green">Compagnon</span>
              </h1>
              <p className="text-xs text-gray-500">Votre partenaire conversationnel</p>
            </div>
          </div>
        </header>

        <main className="flex-grow flex flex-col items-center justify-center p-8 bg-gray-50">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Que voulez-vous pratiquer aujourd'hui ?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
            <button
              onClick={() => handleModeSelect('ecrit')}
              className="group flex flex-col items-center p-8 bg-white rounded-2xl border-2 border-gray-200 hover:border-brand-green hover:shadow-xl transition-all duration-300"
            >
              <div className="w-24 h-24 mb-6 rounded-full bg-gray-100 group-hover:bg-green-50 flex items-center justify-center transition-colors">
                <svg className="w-12 h-12 text-gray-600 group-hover:text-brand-green transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
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
                <svg className="w-12 h-12 text-gray-600 group-hover:text-brand-green transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">Mode Oral</h3>
              <p className="text-gray-600 text-center mb-4">
                Conversation vocale naturelle avec François, votre tuteur IA
              </p>
              <ul className="text-sm text-gray-500 space-y-2 text-left">
                <li>✓ Interaction vocale fluide</li>
                <li>✓ Corrections en temps réel</li>
                <li>✓ Pratique de la prononciation</li>
              </ul>
            </button>
          </div>
        </main>
      </div>
    );
  }

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
            <button
              onClick={handleBackToModeSelector}
              className="ml-4 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              ← Changer de mode
            </button>
        </div>
      </header>

      <main className="flex-grow overflow-y-auto p-4 bg-gray-50">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <p className="font-bold">Erreur :</p>
            <p className="text-sm">{error}</p>
            <p className="text-xs mt-2">Vérifiez la console (F12) pour plus de détails.</p>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              onSpeak={handleSpeak}
              onPractice={() => sendMessage("Je veux pratiquer")}
              isSpeaking={speakingMessageId === msg.id}
            />
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-3xl bg-white border border-gray-200 rounded-2xl rounded-tl-sm p-4 shadow-sm">
                <div className="flex items-center gap-2 text-gray-500">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="sticky bottom-0 z-10 bg-white border-t border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <ChatInput onSendMessage={sendMessage} isLoading={isLoading} />
          <button
            onClick={handleDownload}
            disabled={messages.length === 0}
            className="px-4 py-2 bg-brand-green hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg transition-colors disabled:cursor-not-allowed whitespace-nowrap text-sm"
            title="Télécharger la conversation"
          >
            Télécharger
          </button>
        </div>
      </footer>
    </div>
  );
}

export default App;