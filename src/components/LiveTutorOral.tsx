// src/components/LiveTutorOral.tsx
// VERSION HYBRIDE : Web Speech API + Gemini Chat + Google Cloud TTS

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
  
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [transcript, setTranscript] = useState<string>('');
  const [conversationHistory, setConversationHistory] = useState<Array<{role: 'user' | 'model', parts: Array<{text: string}>}>>([]);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showToolbox, setShowToolbox] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const geminiChatRef = useRef<any>(null);
  const isListeningRef = useRef(false);

  // ═══════════════════════════════════════════════════════════
  // INITIALISATION GEMINI CHAT
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
        model: 'gemini-2.0-flash-exp',
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
  // RECONNAISSANCE VOCALE (Web Speech API)
  // ═══════════════════════════════════════════════════════════

  const startListening = useCallback(() => {
    if (isListeningRef.current || isSpeaking) return;

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
        const userText = event.results[0][0].transcript;
        console.log('📝 Transcription:', userText);
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
        if (event.error !== 'no-speech') {
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
  }, [isSpeaking]);

  // ═══════════════════════════════════════════════════════════
  // GEMINI CHAT (Analyse + Corrections)
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

      // Parser les corrections
      const extractedCorrections = extractCorrections(response, userText);
      
      if (extractedCorrections.length > 0) {
        setCorrections(prev => [...prev, ...extractedCorrections]);
        saveCorrectionsToToolBox(extractedCorrections);
      }

      // Synthétiser la voix avec Google TTS
      await speakWithGoogleTTS(response);

      // Relancer l'écoute après que François ait parlé
      setTimeout(() => {
        if (connectionState === ConnectionState.CONNECTED) {
          startListening();
        }
      }, 500);

    } catch (err: any) {
      console.error('❌ Erreur Gemini:', err);
      setErrorMsg('Erreur traitement IA');
      setConnectionState(ConnectionState.ERROR);
    }
  };

  // Extraction des corrections
  const extractCorrections = (response: string, originalText: string): Correction[] => {
    const corrections: Correction[] = [];
    
    const correctionPatterns = [
      /(?:erreur|incorrect|faux|attention).*?["«](.+?)["»].*?(?:devrait être|dire|correct).*?["«](.+?)["»]/gi,
      /["«](.+?)["»].*?(?:→|=>|devrait être|correct).*?["«](.+?)["»]/gi
    ];

    for (const pattern of correctionPatterns) {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        corrections.push({
          originalSentence: match[1].trim(),
          correctedSentence: match[2].trim(),
          explanation: 'Correction identifiée',
        });
      }
    }

    return corrections;
  };

  // Sauvegarder dans la ToolBox
  const saveCorrectionsToToolBox = (corrections: Correction[]) => {
    corrections.forEach(correction => {
      addItem({
        category: 'grammar',
        title: 'Correction orale',
        description: correction.explanation,
        example: `❌ "${correction.originalSentence}"\n✅ "${correction.correctedSentence}"`,
        errorContext: `Semaine ${weekNumber}`,
      });
    });

    window.dispatchEvent(new Event('toolboxUpdated'));
  };

  // ═══════════════════════════════════════════════════════════
  // GOOGLE CLOUD TEXT-TO-SPEECH (Voix française native)
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
              name: 'fr-FR-Neural2-B', // ✅ Voix masculine française native
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
      const audioContent = data.audioContent;

      await playAudioBase64(audioContent);

      console.log('✅ Audio joué');
      setIsSpeaking(false);

    } catch (err: any) {
      console.error('❌ Erreur TTS:', err);
      setIsSpeaking(false);
      
      // Fallback : synthèse navigateur
      console.log('🔄 Fallback vers synthèse navigateur...');
      await speakWithBrowserTTS(text);
    }
  };

  // Fallback : Synthèse vocale navigateur
  const speakWithBrowserTTS = async (text: string) => {
    return new Promise<void>((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

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
        console.error('❌ Erreur synthèse navigateur:', err);
        setIsSpeaking(false);
        reject(err);
      };

      speechSynthesis.speak(utterance);
    });
  };

  // Jouer l'audio depuis base64
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

  const startSession = async () => {
    try {
      setConnectionState(ConnectionState.CONNECTING);
      setErrorMsg(null);
      setCorrections([]);
      setConversationHistory([]);

      // Vérifier le micro
      await navigator.mediaDevices.getUserMedia({ audio: true });

      console.log('✅ Session démarrée');
      setConnectionState(ConnectionState.CONNECTED);

      // Message d'accueil
      const greeting = `Bonjour ! Je suis François, votre tuteur de français. Nous travaillons sur la semaine ${weekNumber}. Commençons !`;
      await speakWithGoogleTTS(greeting);

      // Démarrer l'écoute après l'accueil
      setTimeout(() => {
        startListening();
      }, 500);

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
  };

  // ═══════════════════════════════════════════════════════════
  // RENDU UI
  // ═══════════════════════════════════════════════════════════

  const getStateDisplay = () => {
    if (isSpeaking) {
      return { icon: '🔊', text: 'François parle...', color: 'text-blue-500' };
    }
    if (isListeningRef.current) {
      return { icon: '🎤', text: 'Je vous écoute...', color: 'text-purple-500 animate-pulse' };
    }

    switch (connectionState) {
      case ConnectionState.DISCONNECTED:
        return { icon: '⚪', text: 'Déconnecté', color: 'text-gray-500' };
      case ConnectionState.CONNECTING:
        return { icon: '🔄', text: 'Connexion...', color: 'text-blue-500' };
      case ConnectionState.CONNECTED:
        return { icon: '🟢', text: 'Connecté', color: 'text-green-500' };
      case ConnectionState.ERROR:
        return { icon: '❌', text: 'Erreur', color: 'text-red-500' };
      default:
        return { icon: '⚪', text: 'Inconnu', color: 'text-gray-500' };
    }
  };

  const stateDisplay = getStateDisplay();

  return (
    <div className="flex flex-col h-screen max-w-6xl mx-auto bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* HEADER */}
      <header className="p-6 border-b bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              🎤 François - Mode Oral Hybride
            </h1>
            <p className="text-sm text-gray-600">Semaine {weekNumber} • Voix française native</p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ← Retour
          </button>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        {connectionState === ConnectionState.DISCONNECTED && (
          <div className="text-center">
            <button
              onClick={startSession}
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full text-lg font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              🎤 Démarrer la conversation
            </button>
            <p className="mt-4 text-sm text-gray-600">
              Solution hybride : Gemini Chat + Google TTS
            </p>
          </div>
        )}

        {connectionState === ConnectionState.CONNECTING && (
          <div className="text-center">
            <div className="w-24 h-24 border-8 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg text-gray-700">Connexion...</p>
          </div>
        )}

        {connectionState === ConnectionState.CONNECTED && (
          <div className="text-center">
            <div className={`w-48 h-48 rounded-full flex items-center justify-center text-6xl shadow-2xl mb-6 ${
              isSpeaking ? 'bg-gradient-to-br from-blue-400 to-cyan-500 animate-pulse' :
              isListeningRef.current ? 'bg-gradient-to-br from-purple-400 to-pink-500 animate-pulse' :
              'bg-gradient-to-br from-green-400 to-emerald-500'
            }`}>
              {stateDisplay.icon}
            </div>

            <div className={`text-xl font-semibold ${stateDisplay.color} mb-4`}>
              {stateDisplay.text}
            </div>

            {transcript && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 max-w-2xl mb-4">
                <p className="text-sm text-gray-600 mb-1">Vous avez dit :</p>
                <p className="text-gray-800">{transcript}</p>
              </div>
            )}

            {!isSpeaking && !isListeningRef.current && (
              <p className="text-sm text-gray-500">
                François vous écoute automatiquement...
              </p>
            )}
          </div>
        )}

        {connectionState === ConnectionState.ERROR && (
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <p className="text-xl text-red-600 mb-4">Erreur</p>
            <p className="text-gray-600 mb-4">{errorMsg}</p>
            <button
              onClick={startSession}
              className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Réessayer
            </button>
          </div>
        )}
      </main>

      {/* TOOLBOX */}
      <div className="border-t bg-white p-4">
        <button
          onClick={() => setShowToolbox(!showToolbox)}
          className="w-full flex items-center justify-between hover:bg-gray-50 p-2 rounded transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">🛠️</span>
            <span className="font-semibold text-gray-800">Boîte à Outils</span>
            {corrections.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {corrections.length}
              </span>
            )}
          </div>
          <svg 
            className={`w-5 h-5 transition-transform ${showToolbox ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
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