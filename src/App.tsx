import React, { useState, useEffect, useRef } from 'react';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import WeekSelector from './components/WeekSelector';
import LiveTutorOral from './components/LiveTutorOral';
import { ToolBox } from './components/ToolBox/ToolBox';
import { Footer } from './components/Footer';
import { CGUModal } from './components/CGUModal';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSystemPrompt, getWeekThemes } from './services/geminiService';
import './index.css';

type ConversationMode = 'ecrit' | 'oral' | 'toolbox' | null;

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
  const [showCGU, setShowCGU] = useState(false);

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
            text: `Bonjour ! Je suis Julie. Mon objectif est de vous aider à pratiquer votre écrit en utilisant ce que vous apprenez en cours. Nous sommes en semaine ${currentWeek}. Commençons à pratiquer, c'est d'accord ?`,
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
          text: `Bonjour ! Je suis Julie. Mon objectif est de vous aider à pratiquer votre écrit en utilisant ce que vous apprenez en cours.  
          Nous sommes en semaine ${week}. Commençons à pratiquer, c'est d'accord ?`,
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
  };

  const handleOralWeekSelect = (week: number) => {
    console.log('🎤 Semaine sélectionnée pour mode oral:', week);
    setCurrentWeek(week);
    setCurrentThemes(getWeekThemes(week));
    setShowOralWeekSelector(false);
  };

const sendMessage = async (userMessage: string) => {
  if (!chatRef.current || isLoading) {
    console.log('⚠️ Chat pas prêt ou en cours de chargement');
    return;
  }

  console.log('💬 Envoi du message:', userMessage);
  
  const userMsg: ChatMessage = {
    id: `user-${Date.now()}`,
    role: 'user',
    text: userMessage,
  };

  setMessages((prev) => [...prev, userMsg]);
  setIsLoading(true);
  setError(null);

  try {
    console.log('📤 Envoi au modèle...');
    const result = await chatRef.current.sendMessage(userMessage);
    console.log('📥 Réponse reçue');
    
    const response = await result.response;
    const text = response.text();
    console.log('✅ Texte extrait:', text.substring(0, 100) + '...');
    
    // ✅ NOUVEAU : Détecter et supprimer le marqueur [PRATIQUE]
    const hasPracticeMarker = text.includes('[PRATIQUE]');
    const cleanedText = text.replace(/\[PRATIQUE\]/g, '').trim();
    
    const modelMsg: ChatMessage = {
      id: `model-${Date.now()}`,
      role: 'model',
      text: cleanedText,  // ✅ Texte nettoyé
      hasPractice: hasPracticeMarker  // ✅ true si [PRATIQUE] détecté
    };

    setMessages((prev) => [...prev, modelMsg]);
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi du message:', error);
    setError(`Erreur lors de la communication avec le chatbot: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  } finally {
    setIsLoading(false);
  }
};

  const handleSpeak = (text: string, messageId: string) => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    const frenchVoice = voices.find(voice => 
      voice.lang.startsWith('fr-') && 
      voice.name.toLowerCase().includes('female')
    ) || voices.find(voice => voice.lang.startsWith('fr-'));
    
    if (frenchVoice) {
      utterance.voice = frenchVoice;
    }
    
    utterance.lang = 'fr-FR';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    utterance.onend = () => {
      setSpeakingMessageId(null);
    };
    
    utterance.onerror = () => {
      setSpeakingMessageId(null);
    };

    setSpeakingMessageId(messageId);
    window.speechSynthesis.speak(utterance);
  };

const handleDownload = () => {
  const conversationText = messages.map(msg => 
    `${msg.role === 'user' ? 'Vous' : 'LinguaCompagnon'}: ${msg.text}`
  ).join('\n\n');

  const blob = new Blob([conversationText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `conversation-semaine-${currentWeek}-${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const handleReportDoubt = (messageId: string) => {
  const reportedMessage = messages.find(m => m.id === messageId);
  if (!reportedMessage) return;

  const subject = encodeURIComponent('🚨 Doute sur une correction - LinguaCompagnon');
  
  let conversationText = '=== CONVERSATION COMPLÈTE ===\n\n';
  messages.forEach((msg, index) => {
    const speaker = msg.role === 'model' ? 'Julie' : 'Apprenant';
    conversationText += `[${index + 1}] ${speaker}:\n${msg.text}\n\n`;
  });
  
  const messageIndex = messages.findIndex(m => m.id === messageId);
  const highlightedMessage = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ MESSAGE SIGNALÉ (n°${messageIndex + 1}) :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${reportedMessage.text}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `;
  
  const body = encodeURIComponent(`Bonjour Marion,

J'ai un doute concernant une correction dans LinguaCompagnon.

${highlightedMessage}

CONTEXTE :
- Semaine : ${currentWeek}
- Date : ${new Date().toLocaleString('fr-FR')}
- Nombre de messages : ${messages.length}

${conversationText}

Merci de vérifier cette correction.

Cordialement,
Un apprenant`);

  window.location.href = `mailto:marionviz@hotmail.com?subject=${subject}&body=${body}`;
};

  // ====== ÉCRAN SÉLECTION MODE INITIAL ======
  if (showModeSelector) {
    return (
      <>
        {/* ✅ MODAL CGU */}
        {showCGU && <CGUModal onClose={() => setShowCGU(false)} />}
        
        <div className="flex flex-col h-screen max-w-6xl mx-auto bg-gray-50 font-sans">
        <header className="p-6 bg-white border-b border-gray-200">
          <div className="flex items-center justify-center gap-3">
            <img src="/LC_chat2.PNG" alt="LinguaCompagnon" className="w-10 h-10 rounded-full shadow-sm" />
            <h1 className="text-3xl font-bold text-gray-800">
              Lingua<span className="text-brand-green">Compagnon</span>
            </h1>
          </div>
          <p className="text-center text-gray-600 mt-2">
            Votre assistant personnel IA pour pratiquer le français
          </p>
        </header>

        <main className="flex-grow flex flex-col items-center justify-center p-6">
          <div className="text-center mb-4">
            <h2 className="text-3xl font-bold text-gray-800 mb-3">
              Comment voulez-vous pratiquer ?
            </h2>
            <p className="text-gray-600 text-base">
              Choisissez le mode qui correspond à vos besoins d'apprentissage
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
            {/* ✅ MODE ÉCRIT */}
            <button
              onClick={() => handleModeSelect('ecrit')}
              className="group flex flex-col items-center p-6 bg-white rounded-2xl border-2 border-gray-200 hover:border-brand-green hover:shadow-xl transition-all duration-300"
            >
              <div className="w-20 h-20 mb-4 rounded-full bg-gray-100 group-hover:bg-green-50 flex items-center justify-center transition-colors">
                <svg className="w-10 h-10 text-gray-600 group-hover:text-brand-green transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Mode écrit</h3>
              <p className="text-gray-600 text-center text-sm mb-3">
                Conversation textuelle avec Julie
              </p>
              <ul className="text-xs text-gray-500 space-y-1 text-left">
                <li>✓ Corrections visuelles</li>
                <li>✓ Encouragement à rédiger</li>
                <li>✓ Exercices de systématisation</li>
              </ul>
            </button>

            {/* ✅ MODE ORAL */}
<button
  onClick={() => handleModeSelect('oral')}
  className="group flex flex-col items-center p-6 bg-white rounded-2xl border-2 border-gray-200 hover:border-brand-green hover:shadow-xl transition-all duration-300"
>
  <div className="w-20 h-20 mb-4 rounded-full bg-gray-100 group-hover:bg-green-50 flex items-center justify-center transition-colors">
    <svg className="w-10 h-10 text-gray-600 group-hover:text-brand-green transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  </div>
  <h3 className="text-xl font-bold text-gray-800 mb-2">Mode oral</h3>
  <p className="text-gray-600 text-center text-sm mb-3">
    Conversation vocale avec François
  </p>
  <ul className="text-xs text-gray-500 space-y-1 text-left">
    <li>✓ Interaction en contexte</li>
    <li>✓ Feedback immédiat</li>
    <li>✓ Boîte à outils intégrée</li>
  </ul>
</button>
          </div>
        </main>
        
        {/* ✅ FOOTER */}
        <Footer onCGUClick={() => setShowCGU(true)} />
      </div>
      </>
    );
  }

  // ====== ÉCRAN SÉLECTION SEMAINE ORAL ======
  if (showOralWeekSelector && conversationMode === 'oral') {
    return (
      <>
        {/* ✅ MODAL CGU */}
        {showCGU && <CGUModal onClose={() => setShowCGU(false)} />}
        
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

        <main className="flex-grow flex flex-col items-center justify-center p-6 bg-gray-50">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Choisissez une semaine
            </h2>
            <p className="text-gray-600 text-base">
              Sélectionnez la semaine que vous souhaitez pratiquer à l'oral
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full max-w-4xl">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((week) => {
              const weekTheme = getWeekThemes(week);
              return (
                <button
                key={week}
                onClick={() => handleOralWeekSelect(week)}
                className="group relative p-3 bg-white rounded-xl border-2 border-gray-200 hover:border-brand-green hover:shadow-xl transition-all duration-300 text-left"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-full bg-brand-green/10 group-hover:bg-brand-green/20 flex items-center justify-center transition-colors">
                    <span className="text-sm font-bold text-brand-green transition-colors">
                      {week}
                    </span>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-brand-green transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <p className="text-xs leading-relaxed text-gray-600 group-hover:text-gray-800 transition-colors line-clamp-3">
                  {weekTheme}
                </p>
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-4 h-4 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                  </button>
              );
            })}
          </div>

          <p className="mt-4 text-xs text-gray-500">
            💡 Chaque semaine a des objectifs pédagogiques spécifiques
          </p>
        </main>
        
        {/* ✅ FOOTER */}
        <Footer onCGUClick={() => setShowCGU(true)} />
      </div>
      </>
    );
  }
 // ====== MODE BOÎTE À OUTILS ======
  if (conversationMode === 'toolbox') {
    return (
      <>
        {/* ✅ MODAL CGU */}
        {showCGU && <CGUModal onClose={() => setShowCGU(false)} />}
        
        <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white font-sans">
        <header className="p-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/LC_chat2.PNG" alt="LinguaCompagnon" className="w-10 h-10 rounded-full shadow-sm" />
              <div>
                <h1 className="text-xl font-bold text-gray-800">
                  Lingua<span className="text-brand-green">Compagnon</span>
                </h1>
                <p className="text-xs text-gray-500">Boîte à Outils</p>
              </div>
            </div>
            <button
              onClick={handleBackToModeSelector}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 border border-green-200 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              ← Changer de mode
            </button>
          </div>
        </header>
        
        <main className="flex-grow overflow-y-auto">
          <ToolBox weekNumber={currentWeek} />
        </main>
        
        {/* ✅ FOOTER */}
        <Footer onCGUClick={() => setShowCGU(true)} />
      </div>
      </>
    );
  }

// ====== MODE ORAL ======
if (conversationMode === 'oral') {
  return (
    <LiveTutorOral
      weekNumber={currentWeek}
      onClose={() => {
        setConversationMode('toolbox');
        setShowModeSelector(false);
      }}
    />
  );
}

  // ====== MODE ÉCRIT ======
  return (
    <>
      {/* ✅ MODAL CGU */}
      {showCGU && <CGUModal onClose={() => setShowCGU(false)} />}
      
      <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white font-sans">
      <header className="p-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-3">
           <img src="/avatar.jpg" alt="Julie" className="w-10 h-10 rounded-full shadow-sm object-cover" />
            <div>
              <h1 className="text-xl font-bold text-gray-800">
            <button 
            onClick={handleBackToModeSelector}
            className="hover:opacity-80 transition-opacity"
            >
            Lingua<span className="text-brand-green">Compagnon</span>
            </button>
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
              className="ml-4 px-3 py-1 text-sm text-gray-700 hover:text-gray-900 border border-green-200 bg-green-50 rounded-lg hover:bg-green-100 transition-colors whitespace-nowrap"
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
              onReportDoubt={handleReportDoubt}
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

     <footer className="sticky bottom-0 z-10 bg-white">
  <ChatInput 
    onSendMessage={sendMessage} 
    onDownload={handleDownload}
    isLoading={isLoading}
    hasMessages={messages.length > 0}
  />
</footer>

        {/* ✅ FOOTER */}
        <Footer onCGUClick={() => setShowCGU(true)} />
    </div>
    </>
  );
}

export default App;