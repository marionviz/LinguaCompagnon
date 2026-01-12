// src/components/LiveTutorOral.tsx
// VERSION PUSH-TO-TALK MOBILE - CORRECTION COMPLÈTE
// ✅ Push-to-talk mobile sans bug
// ✅ Mode automatique desktop préservé

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConnectionState, Correction } from '../typesOral';
import { getOralWeekConfig } from '../constantsOral';
import { useToolBox } from '../hooks/useToolBox';
import { ToolBox } from './ToolBox/ToolBox';

interface LiveTutorOralProps {
  weekNumber: number;
  onClose: () => void;
}

const LiveTutorOral: React.FC<LiveTutorOralProps> = ({ weekNumber, onClose }) => {
  const week = getOralWeekConfig(weekNumber);
  const { addItem } = useToolBox();
  
  // États
  const [showDurationSelector, setShowDurationSelector] = useState(true);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [allCorrections, setAllCorrections] = useState<Correction[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showToolbox, setShowToolbox] = useState(false);
  const [showToolboxNotification, setShowToolboxNotification] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false); // ✅ État React pour UI

  // Refs
  const recognitionRef = useRef<any>(null);
  const geminiChatRef = useRef<any>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const conversationHistoryRef = useRef<string[]>([]);
  const isMobileRef = useRef<boolean>(false);
  const isProcessingRef = useRef<boolean>(false);

  // ═══════════════════════════════════════════════════════════
  // TIMER
  // ═══════════════════════════════════════════════════════════
  
  useEffect(() => {
    if (selectedDuration && connectionState === ConnectionState.CONNECTED && timeRemaining > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleEndCall();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      };
    }
  }, [selectedDuration, connectionState, timeRemaining]);

  // ═══════════════════════════════════════════════════════════
  // INITIALISATION GEMINI
  // ═══════════════════════════════════════════════════════════
  
  useEffect(() => {
    initializeGemini();
    return () => {
      cleanup();
    };
  }, []);

  const initializeGemini = async () => {
    try {
      const apiKey = import.meta.env.VITE_API_KEY;
      if (!apiKey) throw new Error("VITE_API_KEY manquante");

      const ai = new GoogleGenerativeAI(apiKey);
      
      const enrichedPrompt = `${week.systemPrompt}

TRÈS IMPORTANT - RÈGLES DE CORRECTION :

Tu dois TOUJOURS corriger les erreurs de l'apprenant dans ces catégories :

1. GRAMMAIRE : accords genre/nombre, articles, prépositions, ordre des mots
   Exemple erreur : "Le voiture rouge" 
   [CORRECTION]
   Erreur : Le voiture rouge
   Correct : La voiture rouge
   Type : grammar
   Explication : "voiture" est féminin, donc "la" et non "le"
   [/CORRECTION]

2. CONJUGAISON : temps verbal, mode, concordance des temps
   Exemple erreur : "Hier je mange"
   [CORRECTION]
   Erreur : Hier je mange
   Correct : Hier j'ai mangé
   Type : conjugation
   Explication : Passé composé requis pour action passée terminée
   [/CORRECTION]

3. VOCABULAIRE : mot incorrect, anglicisme, registre inadapté
   Exemple erreur : "J'ai checké mes emails"
   [CORRECTION]
   Erreur : J'ai checké mes emails
   Correct : J'ai vérifié mes emails
   Type : vocabulary
   Explication : Utiliser le verbe français "vérifier" au lieu de l'anglicisme
   [/CORRECTION]

4. PRONONCIATION : liaison manquante, accent sur mauvaise syllabe
   [CORRECTION]
   Erreur : [mot mal prononcé]
   Correct : [prononciation correcte]
   Type : pronunciation
   Explication : [indication phonétique]
   [/CORRECTION]

FORMAT OBLIGATOIRE pour CHAQUE correction :
[CORRECTION]
Erreur : [phrase exacte de l'apprenant]
Correct : [phrase corrigée]
Type : [grammar/conjugation/vocabulary/pronunciation]
Explication : [courte explication en moins de 15 mots]
[/CORRECTION]

Après avoir signalé les erreurs, continue la conversation de manière encourageante et naturelle.`;

      const model = ai.getGenerativeModel({ 
        model: 'gemini-2.0-flash-exp',
        systemInstruction: enrichedPrompt
      });

      const chat = model.startChat({
        history: [],
      });

      geminiChatRef.current = chat;
      console.log('✅ Gemini 2.0 Flash Exp initialisé');
    } catch (err) {
      console.error('❌ Erreur initialisation Gemini:', err);
      setErrorMsg('Erreur initialisation IA');
      setConnectionState(ConnectionState.ERROR);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // INITIALISATION RECONNAISSANCE VOCALE
  // ═══════════════════════════════════════════════════════════
  
  useEffect(() => {
    // Détecter device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    isMobileRef.current = isMobile;
    console.log(`📱 Device détecté : ${isMobile ? 'MOBILE' : 'DESKTOP'}`);

    // Initialiser Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('❌ Speech Recognition non supporté');
      setErrorMsg('Reconnaissance vocale non supportée sur ce navigateur');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.maxAlternatives = 1;
    
    // Configuration selon device
    if (isMobile) {
      // MOBILE: Mode push-to-talk
      recognition.continuous = false;
      recognition.interimResults = false;
      console.log('📱 Config MOBILE: continuous=false, interimResults=false');
    } else {
      // DESKTOP: Mode automatique
      recognition.continuous = true;
      recognition.interimResults = true;
      console.log('💻 Config DESKTOP: continuous=true, interimResults=true');
    }

    recognition.onstart = () => {
      console.log('🎤 Écoute démarrée');
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      if (isMobile) {
        // MOBILE: Résultat final direct
        const transcript = event.results[0][0].transcript;
        console.log('📱 Transcript mobile:', transcript);
        handleUserSpeech(transcript);
      } else {
        // DESKTOP: Gestion interim + final
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript.trim()) {
          console.log('💻 Transcript desktop:', finalTranscript);
          handleUserSpeech(finalTranscript.trim());
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error('❌ Erreur reconnaissance:', event.error);
      setIsListening(false);
      
      if (event.error === 'not-allowed') {
        setErrorMsg('Accès au microphone refusé. Autorisez le microphone dans votre navigateur.');
      } else if (event.error === 'no-speech') {
        // Sur mobile, arrêter proprement
        if (isMobile) {
          setIsListening(false);
        } else {
          // Sur desktop, relancer
          if (connectionState === ConnectionState.CONNECTED) {
            setTimeout(() => startListening(), 1000);
          }
        }
      }
    };

    recognition.onend = () => {
      console.log('🎤 Écoute terminée');
      setIsListening(false);
      
      // Sur desktop, relancer automatiquement
      if (!isMobile && connectionState === ConnectionState.CONNECTED && !isProcessingRef.current) {
        setTimeout(() => startListening(), 500);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      window.speechSynthesis.cancel();
    };
  }, [connectionState]);

  // ═══════════════════════════════════════════════════════════
  // FONCTIONS RECONNAISSANCE VOCALE
  // ═══════════════════════════════════════════════════════════

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isProcessingRef.current || isSpeaking) {
      console.log('⏭️ Skip startListening: isProcessing=', isProcessingRef.current, 'isSpeaking=', isSpeaking);
      return;
    }

    try {
      recognitionRef.current.start();
      console.log('✅ Recognition.start() appelé');
    } catch (err) {
      console.error('❌ Erreur start():', err);
    }
  }, [isSpeaking]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
        console.log('✅ Recognition.stop() appelé');
      } catch (err) {
        console.error('❌ Erreur stop():', err);
      }
    }
  }, [isListening]);

  // ═══════════════════════════════════════════════════════════
  // TRAITEMENT PAROLE UTILISATEUR
  // ═══════════════════════════════════════════════════════════

  const handleUserSpeech = async (userText: string) => {
    if (!userText.trim() || !geminiChatRef.current || isProcessingRef.current) {
      console.log('⏭️ Skip handleUserSpeech');
      return;
    }

    isProcessingRef.current = true;
    stopListening();

    console.log('👤 User:', userText);
    conversationHistoryRef.current.push(`User: ${userText}`);

    try {
      const result = await geminiChatRef.current.sendMessage(userText);
      const rawResponse = result.response.text();
      
      console.log('🤖 Raw response:', rawResponse);

      // Extraire corrections
      const corrections = extractCorrections(rawResponse);
      if (corrections.length > 0) {
        setAllCorrections(prev => [...prev, ...corrections]);
      }

      // Nettoyer réponse
      let cleanedResponse = rawResponse.replace(/\[CORRECTION\][\s\S]*?\[\/CORRECTION\]/g, '').trim();
      
      console.log('🤖 François:', cleanedResponse);
      conversationHistoryRef.current.push(`François: ${cleanedResponse}`);

      // Parler
      await speakText(cleanedResponse);

      // Relancer écoute après synthèse vocale
      if (connectionState === ConnectionState.CONNECTED) {
        setTimeout(() => {
          isProcessingRef.current = false;
          startListening();
        }, 500);
      } else {
        isProcessingRef.current = false;
      }

    } catch (err) {
      console.error('❌ Erreur Gemini:', err);
      setErrorMsg('Erreur lors de la génération de la réponse.');
      isProcessingRef.current = false;
    }
  };

  // ═══════════════════════════════════════════════════════════
  // EXTRACTION CORRECTIONS
  // ═══════════════════════════════════════════════════════════

  const extractCorrections = (text: string): Correction[] => {
    const corrections: Correction[] = [];
    const regex = /\[CORRECTION\]([\s\S]*?)\[\/CORRECTION\]/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const block = match[1];
      
      const erreurMatch = block.match(/Erreur\s*:\s*(.+?)(?=\n|Correct)/i);
      const correctMatch = block.match(/Correct\s*:\s*(.+?)(?=\n|Type)/i);
      const typeMatch = block.match(/Type\s*:\s*(.+?)(?=\n|Explication)/i);
      const explanationMatch = block.match(/Explication\s*:\s*(.+?)$/i);

      if (erreurMatch && correctMatch && typeMatch && explanationMatch) {
        corrections.push({
          originalSentence: erreurMatch[1].trim(),
          correctedSentence: correctMatch[1].trim(),
          errorType: typeMatch[1].trim(),
          explanation: explanationMatch[1].trim(),
        });
      }
    }

    return corrections;
  };

  // ═══════════════════════════════════════════════════════════
  // SYNTHÈSE VOCALE
  // ═══════════════════════════════════════════════════════════

  const speakText = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      window.speechSynthesis.cancel();
      
      const cleanText = text.replace(/\*\*/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'fr-FR';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const frenchVoice = voices.find(v => v.lang === 'fr-FR') || voices[0];
      if (frenchVoice) utterance.voice = frenchVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        resolve();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  };

  // ═══════════════════════════════════════════════════════════
  // DÉMARRAGE SESSION
  // ═══════════════════════════════════════════════════════════

  const startSession = async (minutes: number) => {
    setSelectedDuration(minutes);
    setTimeRemaining(minutes * 60);
    setShowDurationSelector(false);
    setConnectionState(ConnectionState.CONNECTING);

    // Message de bienvenue
    const welcomeMessage = `Bonjour ! Je suis François, votre tuteur de français. ${week.welcomeMessage}. Nous avons ${minutes} minutes ensemble. À vous !`;
    
    await speakText(welcomeMessage);
    
    setConnectionState(ConnectionState.CONNECTED);
    
    // Démarrer l'écoute
    setTimeout(() => {
      startListening();
    }, 500);
  };

  // ═══════════════════════════════════════════════════════════
  // FIN SESSION
  // ═══════════════════════════════════════════════════════════

  const handleEndCall = () => {
    stopListening();
    window.speechSynthesis.cancel();
    
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    
    setConnectionState(ConnectionState.DISCONNECTED);
    onClose();
  };

  const handleReportDoubt = () => {
    const lastMessages = conversationHistoryRef.current.slice(-3).join('\n');
    addItem({
      weekNumber,
      content: lastMessages,
      type: 'doubt'
    });
    setShowToolboxNotification(true);
    setTimeout(() => setShowToolboxNotification(false), 3000);
  };

  const cleanup = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    window.speechSynthesis.cancel();
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ═══════════════════════════════════════════════════════════
  // RENDU
  // ═══════════════════════════════════════════════════════════

  if (showDurationSelector) {
    return (
      <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white">
        <header className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/francois.jpg" alt="François" className="w-10 h-10 rounded-full" />
              <h1 className="text-xl font-bold">Lingua<span className="text-brand-green">Compagnon</span></h1>
            </div>
            <button onClick={onClose} className="px-4 py-2 bg-red-500/20 text-red-600 rounded-lg">← Retour</button>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-8">
          <h2 className="text-3xl font-bold mb-4">Combien de temps voulez-vous pratiquer ?</h2>
          <p className="text-gray-600 mb-8">Choisissez une durée pour interagir avec François</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl">
            {[2, 5, 8, 10].map((d) => (
              <button
                key={d}
                onClick={() => startSession(d)}
                className="p-8 bg-white rounded-xl border-2 hover:border-brand-green hover:shadow-xl transition-all"
              >
                <div className="text-5xl font-bold text-brand-green">{d}</div>
                <div className="text-sm text-gray-600">min</div>
              </button>
            ))}
          </div>
          <p className="text-gray-500 mt-8">💡 Conseil : Commencez par 2-5 minutes pour vous familiariser</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white">
      {showToolboxNotification && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-xl">
          ✅ Ajouté à votre boîte à outils !
        </div>
      )}
      
      <header className="p-4 border-b">
        {/* Mobile : 2 lignes */}
        <div className="flex flex-col gap-3 md:hidden">
          {/* Ligne 1 : Logo + Titre */}
          <div className="flex items-center gap-3">
            <img src="/francois.jpg" alt="François" className="w-10 h-10 rounded-full" />
            <h1 className="text-lg font-bold">Lingua<span className="text-brand-green">Compagnon</span></h1>
          </div>
          
          {/* Ligne 2 : Boutons */}
          <div className="flex items-center gap-2 justify-between">
            <div className="px-3 py-1.5 bg-gray-800 rounded-lg">
              <div className="text-xl font-bold text-brand-green">{formatTime(timeRemaining)}</div>
            </div>
            
            <button 
              onClick={handleReportDoubt} 
              className="px-2 py-1.5 bg-orange-100 text-orange-700 text-xs rounded-lg whitespace-nowrap"
            >
              ⚠️ un doute ?
            </button>
            <button 
              onClick={handleEndCall} 
              className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm"
            >
              ✕ Terminer
            </button>
          </div>
        </div>

        {/* Desktop : 1 ligne */}
        <div className="hidden md:flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/francois.jpg" alt="François" className="w-10 h-10 rounded-full" />
            <h1 className="text-xl font-bold">Lingua<span className="text-brand-green">Compagnon</span></h1>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="px-4 py-2 bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-brand-green">{formatTime(timeRemaining)}</div>
            </div>
            
            <button onClick={handleReportDoubt} className="px-3 py-2 bg-orange-100 text-orange-700 text-xs rounded-lg">⚠️ Un doute ?</button>
            <button onClick={handleEndCall} className="px-4 py-2 bg-red-500 text-white rounded-lg">✕ Terminer</button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          {connectionState === ConnectionState.CONNECTED && (
            <div className="text-center">
              
              {/* Desktop : Cercle automatique */}
              <div className="hidden md:block">
                <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-4 shadow-2xl transition-all duration-300 ${
                  isSpeaking ? 'bg-[#2d5016] animate-pulse' : 'bg-[#90c695]'
                }`}>
                  <div className="text-5xl text-white">
                    {isSpeaking ? '🔊' : '🎤'}
                  </div>
                </div>

                <div className="text-sm text-gray-500 mb-2">
                  Mode oral - semaine {weekNumber}
                </div>

                <div className="text-xl font-semibold mb-4">
                  {isSpeaking ? 'François parle...' : 'À vous de parler !'}
                </div>
              </div>

              {/* Mobile : Bouton Push-to-Talk */}
              <div className="md:hidden">
                <button
                  onClick={startListening}
                  disabled={isSpeaking || isListening}
                  className={`w-40 h-40 rounded-full flex flex-col items-center justify-center mb-4 shadow-2xl transition-all duration-300 active:scale-95 ${
                    isSpeaking 
                      ? 'bg-[#2d5016] animate-pulse cursor-not-allowed' 
                      : isListening
                      ? 'bg-red-500 animate-pulse cursor-not-allowed'
                      : 'bg-[#90c695] active:bg-[#7ab67f]'
                  }`}
                >
                  <div className="text-6xl text-white mb-2">
                    {isSpeaking ? '🔊' : isListening ? '🎤' : '🎤'}
                  </div>
                  <div className="text-xs text-white font-semibold">
                    {isSpeaking ? 'François...' : isListening ? 'ÉCOUTE' : 'APPUYEZ'}
                  </div>
                </button>

                <div className="text-sm text-gray-500 mb-2">
                  📱 Mode Push-to-Talk
                </div>

                <div className="text-base font-semibold mb-2 px-4">
                  {isSpeaking 
                    ? 'François parle...' 
                    : isListening 
                    ? '🎤 Parlez maintenant !' 
                    : 'Appuyez pour parler'}
                </div>
                
                <div className="text-xs text-gray-400 max-w-xs mx-auto">
                  {!isSpeaking && !isListening && 'Appuyez sur le bouton et parlez clairement'}
                </div>
              </div>
            </div>
          )}
        </div>
    
        {allCorrections.length > 0 && (
          <div className="mt-6 bg-white border rounded-lg p-4">
            <h3 className="text-sm font-bold mb-3">📝 Corrections ({allCorrections.length})</h3>
            <div className="space-y-3">
              {allCorrections.map((c, i) => (
                <div key={i} className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded uppercase">
                      {c.errorType}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 line-through mb-1">{c.originalSentence}</div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold">→</span>
                    <div className="text-sm font-bold text-gray-800">{c.correctedSentence}</div>
                  </div>
                  <p className="text-xs text-gray-600 italic mt-2">💡 {c.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <div className="p-4 bg-white border-t">
        <button onClick={() => setShowToolbox(!showToolbox)} className="w-full flex items-center justify-between px-4 py-3 bg-brand-green text-white rounded-lg">
          <span>🛠️ Ma Boîte à Outils</span>
          <svg className={`w-5 h-5 ${showToolbox ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showToolbox && (
          <div className="mt-4">
            <ToolBox weekNumber={weekNumber} />
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveTutorOral;