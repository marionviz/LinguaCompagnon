// src/components/LiveTutorOral.tsx
// VERSION COMPLÈTE HYBRIDE : Timer + Google TTS + Web Speech API + ToolBox

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
  const [transcript, setTranscript] = useState<string>('');
  const [conversationHistory, setConversationHistory] = useState<Array<{role: 'user' | 'model', parts: Array<{text: string}>}>>([]);
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
      const model = ai.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        systemInstruction: week.systemPrompt
      });

      const chat = model.startChat({
        history: [],
      });

      geminiChatRef.current = chat;
      console.log('✅ Gemini Chat initialisé');
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
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('🎤 Écoute démarrée');
        isListeningRef.current = true;
        setTranscript('');
      };

      recognition.onresult = async (event: any) => {
        const userText = event.results[0][0].transcript.trim();
        const confidence = event.results[0][0].confidence;
        
        console.log('📝 Transcription:', userText, '| Confiance:', confidence);
        
        // Ignorer si identique au dernier transcript (évite boucles)
        if (userText === lastTranscriptRef.current) {
          console.log('⚠️ Transcription identique, ignorée');
          isListeningRef.current = false;
          if (!isManualMode) {
            setTimeout(() => startListening(), 1500);
          }
          return;
        }

        // Ignorer si trop court ou faible confiance
        if (userText.length < 3 || confidence < 0.5) {
          console.log('⚠️ Transcription ignorée (trop courte ou confiance faible)');
          isListeningRef.current = false;
          if (!isManualMode) {
            setTimeout(() => startListening(), 1500);
          }
          return;
        }

        lastTranscriptRef.current = userText;
        setTranscript(userText);
        isListeningRef.current = false;

        // Ajouter à l'historique
        setConversationHistory(prev => [...prev, { 
          role: 'user', 
          parts: [{ text: userText }] 
        }]);

        // Envoyer à Gemini
        await sendToGemini(userText);
      };

      recognition.onerror = (event: any) => {
        console.error('❌ Erreur reconnaissance:', event.error);
        isListeningRef.current = false;
        
        if (event.error === 'no-speech') {
          console.log('🔄 Pas de parole détectée');
          if (!isManualMode) {
            setTimeout(() => startListening(), 1500);
          }
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
  // GEMINI CHAT
  // ═══════════════════════════════════════════════════════════

  const sendToGemini = async (userText: string) => {
    try {
      if (!geminiChatRef.current) {
        throw new Error('Gemini non initialisé');
      }

      console.log('🔄 Envoi à Gemini...');
      const result = await geminiChatRef.current.sendMessage(userText);
      const response = result.response.text();
      
      console.log('✅ Réponse Gemini:', response);

      // Ajouter à l'historique
      setConversationHistory(prev => [...prev, { 
        role: 'model', 
        parts: [{ text: response }] 
      }]);

      // Extraire corrections
      const extractedCorrections = extractCorrections(response, userText);
      
      if (extractedCorrections.length > 0) {
        console.log('📝 Corrections trouvées:', extractedCorrections);
        setAllCorrections(prev => [...prev, ...extractedCorrections]);
        saveCorrectionsToToolBox(extractedCorrections);
      }

      // Synthèse vocale
      await speakWithGoogleTTS(response);

      // Relancer l'écoute
      if (!isManualMode) {
        console.log('⏳ Attente 1.5s avant relance écoute...');
        setTimeout(() => {
          if (connectionState === ConnectionState.CONNECTED && !isSpeaking) {
            console.log('🔄 Relance automatique écoute');
            startListening();
          }
        }, 1500);
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
  // EXTRACTION CORRECTIONS
  // ═══════════════════════════════════════════════════════════

  const extractCorrections = (response: string, originalText: string): Correction[] => {
    const corrections: Correction[] = [];
    
    const patterns = [
      /(?:erreur|incorrect|faux|attention).*?["«](.+?)["»].*?(?:devrait être|dire|correct|plutôt).*?["«](.+?)["»]/gi,
      /["«](.+?)["»]\s*(?:→|=>|➜)\s*["«](.+?)["»]/gi,
      /vous avez dit\s+["«](.+?)["»].*?(?:mais|correct|devrait).*?["«](.+?)["»]/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        const original = match[1].trim();
        const corrected = match[2].trim();
        
        if (original.toLowerCase() !== corrected.toLowerCase()) {
          corrections.push({
            originalSentence: original,
            correctedSentence: corrected,
            explanation: 'Correction identifiée par François',
          });
        }
      }
    }

    console.log('✅ Corrections extraites:', corrections.length);
    return corrections;
  };

  // ═══════════════════════════════════════════════════════════
  // SAUVEGARDE TOOLBOX
  // ═══════════════════════════════════════════════════════════

  const saveCorrectionsToToolBox = (corrections: Correction[]) => {
    if (corrections.length === 0) {
      console.log('ℹ️ Pas de correction à sauvegarder');
      return;
    }

    console.log('💾 Sauvegarde de', corrections.length, 'correction(s)...');

    corrections.forEach((correction, index) => {
      addItem({
        category: 'grammar',
        title: `Correction ${index + 1}`,
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
      console.log('🔊 Synthèse vocale Google TTS...');

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
        throw new Error(`TTS API error: ${response.status}`);
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
    return new Promise<void>((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 1.0;

      const voices = speechSynthesis.getVoices();
      const frenchVoice = voices.find(v => v.lang.startsWith('fr'));
      if (frenchVoice) {
        utterance.voice = frenchVoice;
      }

      utterance.onend = () => {
        setIsSpeaking(false);
        resolve();
      };

      utterance.onerror = (err) => {
        setIsSpeaking(false);
        reject(err);
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
      setConversationHistory([]);

      // Vérifier micro
      await navigator.mediaDevices.getUserMedia({ audio: true });

      console.log('✅ Session démarrée');
      setConnectionState(ConnectionState.CONNECTED);

      // Message d'accueil
      const greeting = `Bonjour ! Je suis François, votre tuteur de français. Nous travaillons sur la semaine ${weekNumber}. ${week.description}. Commençons !`;
      await speakWithGoogleTTS(greeting);

      // Démarrer l'écoute
      if (!isManualMode) {
        setTimeout(() => {
          startListening();
        }, 500);
      }

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
      try {
        recognitionRef.current.stop();
      } catch (e) {}
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

  // ═══════════════════════════════════════════════════════════
  // BOUTON "UN DOUTE"
  // ═══════════════════════════════════════════════════════════

  const handleReportDoubt = () => {
    const elapsedTime = selectedDuration ? (selectedDuration * 60 - timeRemaining) : 0;
    
    let correctionsText = '=== CORRECTIONS REÇUES ===\n\n';
    if (allCorrections.length === 0) {
      correctionsText += '(Aucune correction)\n\n';
    } else {
      allCorrections.forEach((correction, index) => {
        correctionsText += `[${index + 1}]\n`;
        correctionsText += `   Original : ${correction.originalSentence}\n`;
        correctionsText += `   Corrigé  : ${correction.correctedSentence}\n`;
        correctionsText += `   Explication : ${correction.explanation}\n\n`;
      });
    }
    
    const subject = encodeURIComponent('🚨 Doute sur correction - Mode ORAL');
    const body = encodeURIComponent(`Bonjour Marion,

J'ai un doute concernant une correction.

CONTEXTE :
- Semaine : ${week.title}
- Date : ${new Date().toLocaleString('fr-FR')}
- Durée : ${formatTime(elapsedTime)}
- Corrections : ${allCorrections.length}

${correctionsText}

COMMENTAIRE :
(Ajoutez vos commentaires ici)

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

  // SÉLECTEUR DURÉE
  if (showDurationSelector) {
    return (
      <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white">
        <header className="p-4 border-b bg-white/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/francois.jpg" alt="François" className="w-10 h-10 rounded-full shadow-sm object-cover" />
              <div>
                <h1 className="text-xl font-bold text-gray-800">
                  Lingua<span className="text-brand-green">Compagnon</span>
                </h1>
                <p className="text-xs text-gray-500">Mode Oral - Semaine {week.id}</p>
              </div>
            </div>
            <button onClick={onClose} className="px-4 py-2 bg-red-500/20 text-red-600 rounded-lg hover:bg-red-500/30">
              ← Retour
            </button>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Combien de temps voulez-vous pratiquer ?
            </h2>
            <p className="text-gray-600 text-lg">
              Choisissez la durée de votre conversation avec François
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl">
            {[2, 5, 8, 10].map((duration) => (
              <button
                key={duration}
                onClick={() => startSession(duration)}
                className="group p-8 bg-white rounded-xl border-2 border-gray-200 hover:border-brand-green hover:shadow-xl transition-all"
              >
                <div className="text-5xl font-bold text-brand-green group-hover:scale-110 transition-transform">
                  {duration}
                </div>
                <div className="text-sm text-gray-600">
                  minute{duration > 1 ? 's' : ''}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 text-center text-gray-500 text-sm">
            💡 Conseil : Commencez par 2-5 minutes
          </div>
        </main>
      </div>
    );
  }

  // SESSION EN COURS
  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white">
      {showToolboxNotification && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-xl">
          ✅ Ajouté à votre boîte à outils !
        </div>
      )}
      
      <header className="p-4 border-b bg-white/80 backdrop-blur-sm">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-3">
            <img src="/francois.jpg" alt="François" className="w-10 h-10 rounded-full shadow-sm object-cover" />
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                Lingua<span className="text-brand-green">Compagnon</span>
              </h1>
              <p className="text-xs text-gray-500">Mode Oral - {week.title}</p>
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
        <p className="text-sm text-gray-600">
          <span className="font-semibold">Objectif :</span> {week.description}
        </p>
      </header>

      <main className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
          {connectionState === ConnectionState.CONNECTING && (
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-lg font-medium text-gray-700">Connexion...</p>
            </div>
          )}

          {connectionState === ConnectionState.ERROR && (
            <div className="text-center">
              <div className="text-6xl mb-4">❌</div>
              <p className="text-xl text-red-600 mb-4">Erreur</p>
              <p className="text-gray-600 mb-4">{errorMsg}</p>
              <button
                onClick={() => setShowDurationSelector(true)}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Réessayer
              </button>
            </div>
          )}

          {connectionState === ConnectionState.CONNECTED && (
            <div className="text-center">
              <div className={`w-48 h-48 rounded-full flex items-center justify-center mb-6 ${
                isSpeaking 
                  ? 'bg-gradient-to-br from-blue-400 to-cyan-500 animate-pulse shadow-2xl' 
                  : isListeningRef.current 
                  ? 'bg-gradient-to-br from-purple-400 to-pink-500 animate-pulse shadow-2xl'
                  : 'bg-gradient-to-br from-green-400 to-emerald-500 shadow-2xl'
              }`}>
                <div className="text-6xl text-white">
                  {isSpeaking ? '🔊' : isListeningRef.current ? '🎤' : '✓'}
                </div>
              </div>

              <div className="text-xl font-semibold text-gray-800 mb-4">
                {isSpeaking ? 'François parle...' : isListeningRef.current ? 'Je vous écoute...' : 'Prêt'}
              </div>

              {transcript && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 max-w-2xl mb-4">
                  <p className="text-sm text-gray-600 mb-1">Vous avez dit :</p>
                  <p className="text-gray-800">{transcript}</p>
                </div>
              )}

              {!isSpeaking && !isListeningRef.current && isManualMode && (
                <button
                  onClick={() => startListening()}
                  className="mt-4 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 shadow-lg"
                >
                  🎤 Parler à François
                </button>
              )}

              <button
                onClick={() => setIsManualMode(!isManualMode)}
                className="mt-4 text-sm text-gray-500 hover:text-gray-700"
              >
                {isManualMode ? '🔄 Mode automatique' : '👆 Mode manuel'}
              </button>
            </div>
          )}
        </div>

        {allCorrections.length > 0 && (
          <div className="mt-6 bg-white border rounded-lg p-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3">
              📝 Corrections ({allCorrections.length})
            </h3>
            <div className="space-y-3">
              {allCorrections.map((correction, index) => (
                <div key={index} className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg">
                  <div className="text-sm text-gray-500 line-through">{correction.originalSentence}</div>
                  <div className="text-sm font-semibold text-gray-800">→ {correction.correctedSentence}</div>
                  <p className="text-xs text-gray-600 italic mt-1">💡 {correction.explanation}</p>
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
            <span className="text-xl">🛠️</span>
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