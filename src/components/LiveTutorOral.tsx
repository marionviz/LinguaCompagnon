// src/components/LiveTutorOral.tsx
// VERSION FINALE : TTS + Corrections automatiques + ToolBox

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { ConnectionState, Correction } from '../typesOral';
import { getOralWeekConfig } from '../constantsOral';
import { useToolBox } from '../hooks/useToolBox';
import { ToolBox } from './ToolBox/ToolBox';

interface LiveTutorOralProps {
  weekNumber: number;
  onClose: () => void;
}

// ═══════════════════════════════════════════════════════════
// FUNCTION DECLARATION POUR CORRECTIONS
// ═══════════════════════════════════════════════════════════

const correctionTool: FunctionDeclaration = {
  name: "signaler_correction",
  description: `Signaler UNE correction à la fois quand l'apprenant fait une erreur.

RÈGLES STRICTES :
✅ Corriger UNIQUEMENT les VRAIES erreurs importantes
❌ NE JAMAIS corriger si phrases identiques
❌ NE JAMAIS inventer des erreurs

TYPES D'ERREURS :
- grammar : articles, accords, structure
- conjugation : temps verbal, auxiliaire
- vocabulary : mot inexistant
- pronunciation : liaisons interdites

EXEMPLES :
✅ "Je suis allé à la Paris" → "Je suis allé à Paris" (grammar)
✅ "Hier je mange" → "Hier j'ai mangé" (conjugation)
❌ NE PAS corriger si déjà correct`,
  
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      originalSentence: { 
        type: SchemaType.STRING, 
        description: "Phrase EXACTE avec l'erreur" 
      },
      correctedSentence: { 
        type: SchemaType.STRING, 
        description: "Version CORRIGÉE (doit être différente)" 
      },
      explanation: { 
        type: SchemaType.STRING, 
        description: "Explication brève (max 15 mots)" 
      },
      errorType: {
        type: SchemaType.STRING,
        description: "Type: pronunciation, grammar, vocabulary, conjugation",
        enum: ["pronunciation", "grammar", "vocabulary", "conjugation"]
      }
    },
    required: ["originalSentence", "correctedSentence", "explanation", "errorType"],
  },
};

const LiveTutorOral: React.FC<LiveTutorOralProps> = ({ weekNumber, onClose }) => {
  const week = getOralWeekConfig(weekNumber);
  const { addItem } = useToolBox();
  
  // États
  const [showDurationSelector, setShowDurationSelector] = useState(true);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [transcript, setTranscript] = useState<string>('');
  const [allCorrections, setAllCorrections] = useState<Correction[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showToolbox, setShowToolbox] = useState(false);
  const [showToolboxNotification, setShowToolboxNotification] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);

  // Refs
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const geminiChatRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef<string>('');

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
  // INITIALISATION GEMINI AVEC FUNCTION CALLING
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
      
      // ✅ AVEC FUNCTION CALLING pour corrections
      const model = ai.getGenerativeModel({ 
        model: 'gemini-2.5-flash-preview-tts',
        systemInstruction: week.systemPrompt,
        tools: [{ functionDeclarations: [correctionTool] }],
      });

      const chat = model.startChat({
        history: [],
      });

      geminiChatRef.current = chat;
      console.log('✅ Gemini Chat initialisé avec function calling');
    } catch (err) {
      console.error('❌ Erreur initialisation Gemini:', err);
      setErrorMsg('Erreur initialisation IA');
      setConnectionState(ConnectionState.ERROR);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // RECONNAISSANCE VOCALE
  // ═══════════════════════════════════════════════════════════

  const startListening = useCallback(() => {
    if (isListeningRef.current || isSpeaking) {
      console.log('⏸️ Écoute déjà active ou François parle');
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        throw new Error('Speech Recognition non supporté');
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'fr-FR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        console.log('🎤 Écoute démarrée');
        isListeningRef.current = true;
        setTranscript('');
      };

      recognition.onresult = async (event: any) => {
        const userText = event.results[0][0].transcript.trim();
        const confidence = event.results[0][0].confidence;
        
        console.log('📝 Transcription:', userText);
        console.log('   Confiance:', confidence);
        
        // Ignorer si identique
        if (userText === lastTranscriptRef.current) {
          console.log('⚠️ Identique, ignorée');
          isListeningRef.current = false;
          if (!isManualMode) {
            setTimeout(() => startListening(), 2000);
          }
          return;
        }

        // Ignorer si trop court
        if (userText.length < 3) {
          console.log('⚠️ Trop courte');
          isListeningRef.current = false;
          if (!isManualMode) {
            setTimeout(() => startListening(), 2000);
          }
          return;
        }

        console.log('✅ Transcription acceptée');
        lastTranscriptRef.current = userText;
        setTranscript(userText);
        isListeningRef.current = false;

        // Envoyer à Gemini
        await sendToGemini(userText);
      };

      recognition.onerror = (event: any) => {
        console.error('❌ Erreur reconnaissance:', event.error);
        isListeningRef.current = false;
        
        if (event.error === 'no-speech' && !isManualMode) {
          setTimeout(() => startListening(), 2000);
        } else if (event.error !== 'aborted') {
          setErrorMsg('Erreur reconnaissance vocale');
        }
      };

      recognition.onend = () => {
        console.log('🎤 Écoute terminée');
        isListeningRef.current = false;
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (err: any) {
      console.error('❌ Erreur démarrage reconnaissance:', err);
      setErrorMsg('Microphone non accessible');
      setConnectionState(ConnectionState.ERROR);
    }
  }, [isSpeaking, isManualMode]);

  // ═══════════════════════════════════════════════════════════
  // GEMINI CHAT AVEC FUNCTION CALLING
  // ═══════════════════════════════════════════════════════════

  const sendToGemini = async (userText: string) => {
    try {
      if (!geminiChatRef.current) {
        throw new Error('Gemini non initialisé');
      }

      console.log('🔄 Envoi à Gemini...');
      const result = await geminiChatRef.current.sendMessage(userText);
      
      // ✅ GÉRER FUNCTION CALLS (corrections)
      const response = result.response;
      
      // Vérifier si Gemini veut appeler la fonction
      const functionCalls = response.functionCalls();
      
      if (functionCalls && functionCalls.length > 0) {
        console.log('🔧 Function calls reçus:', functionCalls);
        
        functionCalls.forEach((call: any) => {
          if (call.name === 'signaler_correction') {
            const correction: Correction = {
              originalSentence: call.args.originalSentence,
              correctedSentence: call.args.correctedSentence,
              explanation: call.args.explanation,
              errorType: call.args.errorType,
            };
            
            console.log('📝 Correction détectée:', correction);
            
            // Ajouter à la liste
            setAllCorrections(prev => [...prev, correction]);
            
            // Sauvegarder dans ToolBox
            saveCorrectionsToToolBox([correction]);
          }
        });
        
        // Répondre au function call
        const functionResponse = {
          functionResponses: functionCalls.map((call: any) => ({
            name: call.name,
            response: { result: "Correction enregistrée" }
          }))
        };
        
        // Continuer la conversation
        const finalResult = await geminiChatRef.current.sendMessage([functionResponse]);
        const finalText = finalResult.response.text();
        
        console.log('✅ Réponse finale:', finalText);
        await speakWithGoogleTTS(finalText);
        
      } else {
        // Pas de correction, réponse simple
        const textResponse = response.text();
        console.log('✅ Réponse Gemini:', textResponse);
        await speakWithGoogleTTS(textResponse);
      }

      // Relancer l'écoute
      if (!isManualMode) {
        console.log('⏳ Attente 3s avant relance...');
        setTimeout(() => {
          if (connectionState === ConnectionState.CONNECTED && !isSpeaking) {
            console.log('✅ Relance écoute');
            startListening();
          }
        }, 3000);
      }

    } catch (err: any) {
      console.error('❌ Erreur Gemini:', err);
      setErrorMsg('Erreur traitement IA');
      
      if (!isManualMode) {
        setTimeout(() => {
          if (connectionState === ConnectionState.CONNECTED) {
            startListening();
          }
        }, 2000);
      }
    }
  };

  // ═══════════════════════════════════════════════════════════
  // SAUVEGARDE TOOLBOX
  // ═══════════════════════════════════════════════════════════

  const saveCorrectionsToToolBox = (corrections: Correction[]) => {
    if (corrections.length === 0) return;

    console.log('💾 Sauvegarde dans ToolBox:', corrections.length);

    corrections.forEach((correction) => {
      const category = correction.errorType || 'grammar';
      
      addItem({
        category: category as any,
        title: `Correction - ${category}`,
        description: correction.explanation,
        example: `❌ "${correction.originalSentence}"\n✅ "${correction.correctedSentence}"`,
        errorContext: `Semaine ${weekNumber} - Mode Oral`,
      });
    });

    window.dispatchEvent(new Event('toolboxUpdated'));
    setShowToolboxNotification(true);
    setTimeout(() => setShowToolboxNotification(false), 3000);
  };

  // ═══════════════════════════════════════════════════════════
  // GOOGLE CLOUD TTS
  // ═══════════════════════════════════════════════════════════

  const speakWithGoogleTTS = async (text: string) => {
    try {
      setIsSpeaking(true);
      console.log('🔊 Synthèse TTS...');

      const apiKey = import.meta.env.VITE_API_KEY;
      
      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text },
            voice: {
              languageCode: 'fr-FR',
              name: 'fr-FR-Neural2-B',
            },
            audioConfig: {
              audioEncoding: 'MP3',
              pitch: 0,
              speakingRate: 1.0
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`TTS error: ${response.status}`);
      }

      const data = await response.json();
      await playAudioBase64(data.audioContent);

      console.log('✅ Audio joué');
      setIsSpeaking(false);

    } catch (err: any) {
      console.error('❌ Erreur TTS:', err);
      setIsSpeaking(false);
      await speakWithBrowserTTS(text);
    }
  };

  const speakWithBrowserTTS = async (text: string) => {
    return new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';

      utterance.onend = () => {
        setIsSpeaking(false);
        resolve();
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        resolve();
      };

      speechSynthesis.speak(utterance);
    });
  };

  const playAudioBase64 = async (base64Audio: string) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const audioContext = audioContextRef.current;
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);

    return new Promise<void>((resolve) => {
      source.onended = () => resolve();
      source.start(0);
    });
  };

  // ═══════════════════════════════════════════════════════════
  // DÉMARRAGE SESSION
  // ═══════════════════════════════════════════════════════════

  const startSession = async (duration: number) => {
    try {
      setSelectedDuration(duration);
      setTimeRemaining(duration * 60);
      setShowDurationSelector(false);
      setConnectionState(ConnectionState.CONNECTING);
      setErrorMsg(null);
      setAllCorrections([]);
      setIsManualMode(false);

      await navigator.mediaDevices.getUserMedia({ audio: true });

      console.log('✅ Session démarrée');
      setConnectionState(ConnectionState.CONNECTED);

      const greeting = `Bonjour ! Je suis François. Nous travaillons sur la semaine ${weekNumber}. ${week.description}. Commençons !`;
      await speakWithGoogleTTS(greeting);

      setTimeout(() => {
        console.log('✅ Première écoute');
        startListening();
      }, 2000);

    } catch (err: any) {
      console.error('❌ Erreur démarrage:', err);
      setErrorMsg('Impossible d\'accéder au microphone');
      setConnectionState(ConnectionState.ERROR);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════

  const cleanup = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    speechSynthesis.cancel();
    isListeningRef.current = false;

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  };

  const handleEndCall = () => {
    cleanup();
    onClose();
  };

  const handleReportDoubt = () => {
    const elapsedTime = selectedDuration ? (selectedDuration * 60 - timeRemaining) : 0;
    
    let correctionsText = '=== CORRECTIONS ===\n\n';
    if (allCorrections.length === 0) {
      correctionsText += '(Aucune)\n\n';
    } else {
      allCorrections.forEach((c, i) => {
        correctionsText += `[${i + 1}] ${c.errorType}\n`;
        correctionsText += `   ❌ ${c.originalSentence}\n`;
        correctionsText += `   ✅ ${c.correctedSentence}\n`;
        correctionsText += `   💡 ${c.explanation}\n\n`;
      });
    }
    
    const subject = encodeURIComponent('🚨 Doute - Mode ORAL');
    const body = encodeURIComponent(`Bonjour Marion,

Semaine : ${week.title}
Date : ${new Date().toLocaleString('fr-FR')}
Durée : ${formatTime(elapsedTime)}

${correctionsText}

Commentaire :
(Ajoutez vos commentaires)

Cordialement`);

    window.location.href = `mailto:marionviz@hotmail.com?subject=${subject}&body=${body}`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ═══════════════════════════════════════════════════════════
  // RENDU UI
  // ═══════════════════════════════════════════════════════════

  if (showDurationSelector) {
    return (
      <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white">
        <header className="p-4 border-b bg-white/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/francois.jpg" alt="François" className="w-10 h-10 rounded-full shadow-sm object-cover" />
              <div>
                <h1 className="text-xl font-bold">
                  Lingua<span className="text-brand-green">Compagnon</span>
                </h1>
                <p className="text-xs text-gray-500">Mode Oral - Semaine {week.id}</p>
              </div>
            </div>
            <button onClick={onClose} className="px-4 py-2 bg-red-500/20 text-red-600 rounded-lg">
              ← Retour
            </button>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50">
          <h2 className="text-3xl font-bold mb-4">Durée de pratique ?</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl">
            {[2, 5, 8, 10].map((d) => (
              <button
                key={d}
                onClick={() => startSession(d)}
                className="p-8 bg-white rounded-xl border-2 hover:border-brand-green hover:shadow-xl transition-all"
              >
                <div className="text-5xl font-bold text-brand-green">{d}</div>
                <div className="text-sm text-gray-600">minute{d > 1 ? 's' : ''}</div>
              </button>
            ))}
          </div>
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
      
      <header className="p-4 border-b bg-white/80">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-3">
            <img src="/francois.jpg" alt="François" className="w-10 h-10 rounded-full shadow-sm object-cover" />
            <div>
              <h1 className="text-xl font-bold">
                Lingua<span className="text-brand-green">Compagnon</span>
              </h1>
              <p className="text-xs text-gray-500">{week.title}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="px-4 py-2 bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-brand-green">
                {formatTime(timeRemaining)}
              </div>
            </div>
            
            <button 
              onClick={handleReportDoubt}
              className="px-3 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 text-xs font-medium rounded-lg"
            >
              ⚠️ Un doute ?
            </button>
            
            <button 
              onClick={handleEndCall} 
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
            >
              ✕ Terminer
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          {connectionState === ConnectionState.CONNECTING && (
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p>Connexion...</p>
            </div>
          )}

          {connectionState === ConnectionState.ERROR && (
            <div className="text-center">
              <div className="text-6xl mb-4">❌</div>
              <p className="text-red-600 mb-4">{errorMsg}</p>
              <button onClick={() => setShowDurationSelector(true)} className="px-6 py-3 bg-red-500 text-white rounded-lg">
                Réessayer
              </button>
            </div>
          )}

          {connectionState === ConnectionState.CONNECTED && (
            <div className="text-center">
              <div className={`w-48 h-48 rounded-full flex items-center justify-center mb-6 shadow-2xl ${
                isSpeaking ? 'bg-gradient-to-br from-blue-400 to-cyan-500 animate-pulse' :
                isListeningRef.current ? 'bg-gradient-to-br from-purple-400 to-pink-500 animate-pulse' :
                'bg-gradient-to-br from-green-400 to-emerald-500'
              }`}>
                <div className="text-6xl text-white">
                  {isSpeaking ? '🔊' : isListeningRef.current ? '🎤' : '✓'}
                </div>
              </div>

              <div className="text-xl font-semibold mb-4">
                {isSpeaking ? 'François parle...' : isListeningRef.current ? 'Je vous écoute...' : 'Prêt'}
              </div>

              {transcript && (
                <div className="bg-white border rounded-lg p-4 max-w-2xl mb-4">
                  <p className="text-sm text-gray-600">Vous :</p>
                  <p className="text-gray-800">{transcript}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {allCorrections.length > 0 && (
          <div className="mt-6 bg-white border rounded-lg p-4">
            <h3 className="text-sm font-bold mb-3">📝 Corrections ({allCorrections.length})</h3>
            <div className="space-y-3">
              {allCorrections.map((c, i) => (
                <div key={i} className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg">
                  <div className="text-sm text-gray-500 line-through">{c.originalSentence}</div>
                  <div className="text-sm font-semibold text-gray-800">→ {c.correctedSentence}</div>
                  <p className="text-xs text-gray-600 italic mt-1">💡 {c.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <div className="p-4 bg-white border-t">
        <button
          onClick={() => setShowToolbox(!showToolbox)}
          className="w-full flex items-center justify-between px-4 py-3 bg-brand-green hover:bg-green-700 text-white rounded-lg"
        >
          <div className="flex items-center gap-3">
            <span>🛠️</span>
            <span className="font-semibold">Ma Boîte à Outils</span>
          </div>
          <svg className={`w-5 h-5 transition-transform ${showToolbox ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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