// src/components/LiveTutorOral.tsx
// VERSION FINALE CORRIGÉE
// ✅ NE PAS afficher transcription utilisateur
// ✅ Seulement afficher corrections
// ✅ Chirp 3 HD voix française
// ✅ Corrections vers ToolBox

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

  // Refs
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const geminiChatRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef<string>('');
  const conversationHistoryRef = useRef<string[]>([]);

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
      
      // Prompt enrichi pour corrections
      const enrichedPrompt = `${week.systemPrompt}

IMPORTANT : Quand l'apprenant fait une erreur, signale-la dans ce format EXACT :

[CORRECTION]
Erreur : [phrase erronée exacte]
Correct : [phrase corrigée]
Type : [grammar/conjugation/vocabulary/pronunciation]
Explication : [explication brève, max 15 mots]
[/CORRECTION]

Après avoir signalé l'erreur, continue la conversation normalement et encourage l'apprenant.`;

      const model = ai.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        systemInstruction: enrichedPrompt
      });

      const chat = model.startChat({
        history: [],
      });

      geminiChatRef.current = chat;
      console.log('✅ Gemini 1.5 Flash initialisé');
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
      };

      recognition.onresult = async (event: any) => {
        const userText = event.results[0][0].transcript.trim();
        
        console.log('📝 Transcription:', userText);
        
        // Ignorer si identique
        if (userText === lastTranscriptRef.current) {
          console.log('⚠️ Identique, ignorée');
          isListeningRef.current = false;
          setTimeout(() => startListening(), 2000);
          return;
        }

        // Ignorer si trop court
        if (userText.length < 3) {
          console.log('⚠️ Trop courte');
          isListeningRef.current = false;
          setTimeout(() => startListening(), 2000);
          return;
        }

        console.log('✅ Transcription acceptée');
        lastTranscriptRef.current = userText;
        isListeningRef.current = false;

        // Ajouter à l'historique
        conversationHistoryRef.current.push(`Apprenant: ${userText}`);

        // Envoyer à Gemini
        await sendToGemini(userText);
      };

      recognition.onerror = (event: any) => {
        console.error('❌ Erreur reconnaissance:', event.error);
        isListeningRef.current = false;
        
        // ✅ Relancer automatiquement même si "no-speech"
        if (event.error === 'no-speech' || event.error === 'audio-capture') {
          console.log('⏳ Relance après erreur...');
          setTimeout(() => {
            if (connectionState === ConnectionState.CONNECTED) {
              startListening();
            }
          }, 1500);
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
  }, [isSpeaking, connectionState]);

  // ═══════════════════════════════════════════════════════════
  // PARSER DE CORRECTIONS
  // ═══════════════════════════════════════════════════════════

  const parseCorrections = (responseText: string): Correction[] => {
    const corrections: Correction[] = [];
    
    const correctionRegex = /\[CORRECTION\]([\s\S]*?)\[\/CORRECTION\]/g;
    let match;
    
    while ((match = correctionRegex.exec(responseText)) !== null) {
      const block = match[1];
      
      const erreurMatch = block.match(/Erreur\s*:\s*(.+)/);
      const correctMatch = block.match(/Correct\s*:\s*(.+)/);
      const typeMatch = block.match(/Type\s*:\s*(.+)/);
      const explanationMatch = block.match(/Explication\s*:\s*(.+)/);
      
      if (erreurMatch && correctMatch && explanationMatch) {
        corrections.push({
          originalSentence: erreurMatch[1].trim(),
          correctedSentence: correctMatch[1].trim(),
          explanation: explanationMatch[1].trim(),
          errorType: typeMatch ? typeMatch[1].trim() as any : 'grammar',
        });
      }
    }
    
    console.log('🔍 Corrections parsées:', corrections);
    return corrections;
  };

  // ═══════════════════════════════════════════════════════════
  // GEMINI CHAT
  // ═══════════════════════════════════════════════════════════

  const sendToGemini = async (userText: string) => {
    try {
      if (!geminiChatRef.current) {
        throw new Error('Gemini non initialisé');
      }

      console.log('🔄 Envoi à Gemini...');

      // Construire contexte avec historique
      const history = conversationHistoryRef.current.slice(-6).join('\n');
      const contextPrompt = history ? `Historique récent:\n${history}\n\nApprenant: "${userText}"` : userText;

      const result = await geminiChatRef.current.sendMessage(contextPrompt);
      const responseText = result.response.text();
      
      console.log('✅ Réponse Gemini:', responseText);

      // Ajouter à l'historique
      const cleanResponse = responseText.replace(/\[CORRECTION\][\s\S]*?\[\/CORRECTION\]/g, '').trim();
      conversationHistoryRef.current.push(`François: ${cleanResponse}`);

      // Parser les corrections
      const corrections = parseCorrections(responseText);
      
      if (corrections.length > 0) {
        console.log('📝 Corrections trouvées:', corrections);
        setAllCorrections(prev => [...prev, ...corrections]);
        saveCorrectionsToToolBox(corrections);
      }

      // Synthèse vocale avec Chirp 3 HD
      await speakWithChirp3HD(cleanResponse);

      // Relancer l'écoute
      console.log('⏳ Attente 2s avant relance...');
      setTimeout(() => {
        if (connectionState === ConnectionState.CONNECTED && !isSpeaking) {
          console.log('✅ Relance écoute');
          startListening();
        }
      }, 2000);

    } catch (err: any) {
      console.error('❌ Erreur Gemini:', err);
      setErrorMsg('Erreur traitement IA');
      
      setTimeout(() => {
        if (connectionState === ConnectionState.CONNECTED) {
          startListening();
        }
      }, 2000);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // CHIRP 3 HD TEXT-TO-SPEECH
  // ═══════════════════════════════════════════════════════════

  const speakWithChirp3HD = async (text: string) => {
    try {
      setIsSpeaking(true);
      console.log('🔊 Synthèse Chirp 3 HD...');

      const apiKey = import.meta.env.VITE_API_KEY;
      
      // ✅ APPEL CHIRP 3 HD via REST API
      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text },
            voice: {
              languageCode: 'fr-FR',
              name: 'fr-FR-Chirp3-HD-Charon'  // ✅ Voix masculine française HD
            },
            audioConfig: {
              audioEncoding: 'MP3',
              speakingRate: 1.0
            }
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Erreur Chirp 3 HD:', errorData);
        throw new Error(`Chirp 3 HD error: ${response.status}`);
      }

      const data = await response.json();
      await playAudioBase64(data.audioContent);

      console.log('✅ Audio Chirp 3 HD joué');
      setIsSpeaking(false);

    } catch (err: any) {
      console.error('❌ Erreur Chirp 3 HD:', err);
      setIsSpeaking(false);
      // Fallback vers TTS navigateur
      await speakWithBrowserTTS(text);
    }
  };

  const speakWithBrowserTTS = async (text: string) => {
    return new Promise<void>((resolve) => {
      setIsSpeaking(true);
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
    try {
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

    } catch (err) {
      console.error('❌ Erreur lecture audio:', err);
      throw err;
    }
  };

  // ═══════════════════════════════════════════════════════════
  // SAUVEGARDE TOOLBOX
  // ═══════════════════════════════════════════════════════════

  const saveCorrectionsToToolBox = (corrections: Correction[]) => {
    if (corrections.length === 0) return;

    console.log('💾 Sauvegarde dans ToolBox:', corrections.length);

    corrections.forEach((correction) => {
      // ✅ Déterminer la catégorie depuis errorType
      let category: 'grammar' | 'conjugation' | 'vocabulary' | 'pronunciation' = 'grammar';
      
      const type = correction.errorType?.toLowerCase();
      if (type === 'conjugation') category = 'conjugation';
      else if (type === 'vocabulary') category = 'vocabulary';
      else if (type === 'pronunciation') category = 'pronunciation';
      else category = 'grammar';
      
      addItem({
        category,
        title: `${category.charAt(0).toUpperCase() + category.slice(1)} - ${correction.explanation.substring(0, 30)}`,
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
      conversationHistoryRef.current = [];

      await navigator.mediaDevices.getUserMedia({ audio: true });

      console.log('✅ Session démarrée');
      setConnectionState(ConnectionState.CONNECTED);

      // Message d'accueil avec Chirp 3 HD
      const greeting = `Bonjour ! Aujourd'hui, semaine ${weekNumber}. Commençons !`;
      await speakWithChirp3HD(greeting);

      setTimeout(() => {
        console.log('✅ Première écoute');
        startListening();
      }, 1500);

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
Durée : ${formatTime(elapsedTime)}

${correctionsText}

Commentaire :

Cordialement`);

    window.location.href = `mailto:marionviz@hotmail.com?subject=${subject}&body=${body}`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ═══════════════════════════════════════════════════════════
  // RENDU UI - PAS DE TRANSCRIPTION AFFICHÉE
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
          <h2 className="text-3xl font-bold mb-4">Durée de pratique ?</h2>
          <p className="text-gray-600 mb-8">Voix Chirp 3 HD - Corrections vers ToolBox</p>
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
        <div className="flex justify-between items-center">
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
              <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 shadow-2xl transition-all duration-300 ${
                isSpeaking ? 'bg-[#2d5016] animate-pulse' :
                isListeningRef.current ? 'bg-[#90c695] animate-pulse' :
                'bg-[#2d5016]'
              }`}>
                <div className="text-5xl text-white">
                  {isSpeaking ? '🔊' : isListeningRef.current ? '🎤' : '✓'}
                </div>
              </div>

              <div className="text-xl font-semibold mb-4">
                {isSpeaking ? 'François parle...' : isListeningRef.current ? 'Je vous écoute...' : 'Prêt'}
              </div>

              {/* ✅ PAS DE TRANSCRIPTION AFFICHÉE */}
            </div>
          )}
        </div>

        {/* ✅ UNIQUEMENT LES CORRECTIONS AFFICHÉES */}
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