// src/components/LiveTutorOral.tsx
// VERSION GEMINI 2.5 FLASH TTS (Décembre 2025)
// ✅ Voix française native intégrée
// ✅ Intelligence + Synthèse vocale en un appel

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
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
  const [allCorrections, setAllCorrections] = useState<Correction[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showToolbox, setShowToolbox] = useState(false);
  const [showToolboxNotification, setShowToolboxNotification] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Refs
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const geminiClientRef = useRef<any>(null);
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

      const ai = new GoogleGenAI({ apiKey });
      geminiClientRef.current = ai;
      
      console.log('✅ Gemini 2.5 Flash TTS initialisé');
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
        setTranscript(userText);
        isListeningRef.current = false;

        // Ajouter à l'historique
        conversationHistoryRef.current.push(`Apprenant: ${userText}`);

        // Envoyer à Gemini
        await sendToGemini(userText);
      };

      recognition.onerror = (event: any) => {
        console.error('❌ Erreur reconnaissance:', event.error);
        isListeningRef.current = false;
        
        if (event.error === 'no-speech') {
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
  }, [isSpeaking]);

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
  // GEMINI 2.5 FLASH TTS - APPEL UNIQUE
  // ═══════════════════════════════════════════════════════════

  const sendToGemini = async (userText: string) => {
    try {
      if (!geminiClientRef.current) {
        throw new Error('Gemini non initialisé');
      }

      console.log('🔄 Envoi à Gemini 2.5 Flash TTS...');

      // Construire le prompt avec historique
      const history = conversationHistoryRef.current.slice(-6).join('\n');
      const fullPrompt = `${week.systemPrompt}

IMPORTANT : Quand l'apprenant fait une erreur, signale-la dans ce format EXACT :

[CORRECTION]
Erreur : [phrase erronée]
Correct : [phrase corrigée]
Type : [grammar/conjugation/vocabulary/pronunciation]
Explication : [explication brève, max 15 mots]
[/CORRECTION]

Historique récent :
${history}

Apprenant vient de dire : "${userText}"

Réponds naturellement et corrige si nécessaire.`;

      // ✅ APPEL GEMINI 2.5 FLASH TTS
      const response = await geminiClientRef.current.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ 
          parts: [{ text: fullPrompt }] 
        }],
        config: {
          responseModalities: ['AUDIO'],  // ✅ Audio direct
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Kore'  // ✅ Voix masculine française
              }
            }
          }
        }
      });

      // Extraire le texte ET l'audio
      const candidate = response.candidates[0];
      
      // Texte de la réponse (pour parser corrections)
      let responseText = '';
      for (const part of candidate.content.parts) {
        if (part.text) {
          responseText += part.text;
        }
      }
      
      console.log('✅ Réponse texte:', responseText);

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

      // Extraire l'audio
      const audioData = candidate.content.parts.find((p: any) => p.inlineData)?.inlineData?.data;
      
      if (audioData) {
        console.log('🔊 Audio reçu, lecture...');
        await playAudioPCM(audioData);
        console.log('✅ Audio joué');
      } else {
        console.warn('⚠️ Pas d\'audio, fallback TTS navigateur');
        await speakWithBrowserTTS(cleanResponse);
      }

      // Relancer l'écoute
      console.log('⏳ Attente 3s avant relance...');
      setTimeout(() => {
        if (connectionState === ConnectionState.CONNECTED && !isSpeaking) {
          console.log('✅ Relance écoute');
          startListening();
        }
      }, 3000);

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
  // LECTURE AUDIO PCM (Gemini 2.5 Flash TTS)
  // ═══════════════════════════════════════════════════════════

  const playAudioPCM = async (base64Audio: string) => {
    try {
      setIsSpeaking(true);

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      
      // Decode base64
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Gemini renvoie du PCM 16-bit, 24kHz, mono
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      
      // Convertir PCM16 en Float32 pour AudioBuffer
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0;
      }

      // Créer AudioBuffer
      const audioBuffer = audioContext.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      // Jouer
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      return new Promise<void>((resolve) => {
        source.onended = () => {
          setIsSpeaking(false);
          resolve();
        };
        source.start(0);
      });

    } catch (err) {
      console.error('❌ Erreur lecture PCM:', err);
      setIsSpeaking(false);
      throw err;
    }
  };

  // ═══════════════════════════════════════════════════════════
  // FALLBACK TTS NAVIGATEUR
  // ═══════════════════════════════════════════════════════════

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

      // Message d'accueil court avec Gemini TTS
      const greetingPrompt = `Tu es François, tuteur de français. Dis simplement : "Bonjour ! Aujourd'hui, semaine ${weekNumber}. Commençons !"`;
      
      const response = await geminiClientRef.current.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: greetingPrompt }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' }
            }
          }
        }
      });

      const audioData = response.candidates[0].content.parts.find((p: any) => p.inlineData)?.inlineData?.data;
      if (audioData) {
        await playAudioPCM(audioData);
      }

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
  // RENDU UI (identique à la version précédente)
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