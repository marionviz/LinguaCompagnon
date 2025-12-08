import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { ConnectionState, Correction } from '../typesOral';
import { createPCM16Blob, base64ToBytes } from '../utils/audioUtilsLive';
import { GEMINI_MODEL_LIVE, getOralWeekConfig } from '../constantsOral';
import { useToolBox } from '../hooks/useToolBox';

interface LiveTutorOralProps {
  weekNumber: number;
  onClose: () => void;
}

// Outil pour les corrections écrites
const correctionTool: FunctionDeclaration = {
  name: "displayCorrection",
  description: "Affiche une correction écrite sur l'écran. À utiliser quand l'apprenant fait une erreur de grammaire ou de vocabulaire importante.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      originalSentence: {
        type: Type.STRING,
        description: "La phrase exacte dite par l'utilisateur avec l'erreur.",
      },
      correctedSentence: {
        type: Type.STRING,
        description: "La version corrigée de la phrase.",
      },
      explanation: {
        type: Type.STRING,
        description: "Une explication très brève (max 10 mots) de l'erreur.",
      },
    },
    required: ["originalSentence", "correctedSentence", "explanation"],
  },
};

const LiveTutorOral: React.FC<LiveTutorOralProps> = ({ weekNumber, onClose }) => {
  const week = getOralWeekConfig(weekNumber);
  
  const [showDurationSelector, setShowDurationSelector] = useState(true);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [allCorrections, setAllCorrections] = useState<Correction[]>([]);
  const [showToolboxNotification, setShowToolboxNotification] = useState(false);

  const { addItem } = useToolBox();

  // Refs pour gestion audio
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (selectedDuration && connectionState === ConnectionState.CONNECTED && timeRemaining > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            endSession();
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

  const addCorrectionToToolbox = useCallback((correction: Correction) => {
    let category: 'grammar' | 'vocabulary' | 'conjugation' | 'pronunciation' = 'grammar';
    
    const explanation = correction.explanation.toLowerCase();
    
    if (explanation.includes('conjugaison') || explanation.includes('temps') || 
        explanation.includes('passé composé') || explanation.includes('imparfait') ||
        explanation.includes('présent') || explanation.includes('futur')) {
      category = 'conjugation';
    } else if (explanation.includes('vocabulaire') || explanation.includes('mot') || 
               explanation.includes('expression')) {
      category = 'vocabulary';
    } else if (explanation.includes('prononciation') || explanation.includes('son') ||
               explanation.includes('accent')) {
      category = 'pronunciation';
    }

    const title = correction.explanation.length > 50 
      ? correction.explanation.substring(0, 50) + '...'
      : correction.explanation;

    addItem({
      category,
      title,
      description: correction.explanation,
      example: `❌ ${correction.originalSentence}\n✅ ${correction.correctedSentence}`,
      errorContext: `Erreur faite pendant la conversation orale (semaine ${weekNumber})`,
    });

    setShowToolboxNotification(true);
    setTimeout(() => setShowToolboxNotification(false), 3000);
  }, [addItem, weekNumber]);

  const stopAudioProcessing = useCallback(() => {
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) { /* ignore */ }
    });
    sourcesRef.current.clear();

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current.onaudioprocess = null;
      scriptProcessorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (inputAudioContextRef.current?.state !== 'closed') {
      try { inputAudioContextRef.current.close(); } catch (e) { /* ignore */ }
    }
    if (outputAudioContextRef.current?.state !== 'closed') {
      try { outputAudioContextRef.current.close(); } catch (e) { /* ignore */ }
    }
    
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  }, []);

  const updateVolume = () => {
    if (analyzerRef.current && connectionState === ConnectionState.CONNECTED) {
        const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
        analyzerRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setVolumeLevel(average);
        animationFrameRef.current = requestAnimationFrame(updateVolume);
    }
  };

  const startSession = async (duration: number) => {
    try {
      setSelectedDuration(duration);
      setTimeRemaining(duration * 60);
      setShowDurationSelector(false);
      setConnectionState(ConnectionState.CONNECTING);
      setErrorMsg(null);

      const apiKey = import.meta.env.VITE_API_KEY;
      if (!apiKey) throw new Error("VITE_API_KEY manquante dans .env.local");

      const ai = new GoogleGenAI({ apiKey });

      const InputContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const OutputContextClass = window.AudioContext || (window as any).webkitAudioContext;
      
      const inputCtx = new InputContextClass({ sampleRate: 16000 });
      const outputCtx = new OutputContextClass({ sampleRate: 24000 });
      
      if (inputCtx.state === 'suspended') await inputCtx.resume();
      if (outputCtx.state === 'suspended') await outputCtx.resume();

      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      const outputNode = outputCtx.createGain();
      outputNode.connect(outputCtx.destination);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const config = {
        model: GEMINI_MODEL_LIVE,
        systemInstruction: {
          parts: [{ text: week.systemPrompt }]
        },
        generationConfig: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } }
          }
        },
        tools: [{ functionDeclarations: [correctionTool] }]
      };

      console.log("🚀 Démarrage session Live API");
      const session = await ai.live.connect(config);
      sessionRef.current = session;

      // Setup audio input
      const source = inputCtx.createMediaStreamSource(stream);
      const analyzer = inputCtx.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      analyzerRef.current = analyzer;
      updateVolume();

      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (isMicMuted || !sessionRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBlob = createPCM16Blob(inputData);
        try {
          sessionRef.current.sendRealtimeInput({ media: pcmBlob });
        } catch (err) {
          console.error("Erreur envoi audio:", err);
        }
      };

      source.connect(processor);
      processor.connect(inputCtx.destination);

      // Message handlers
      session.on('message', async (message: LiveServerMessage) => {
        if (message.toolCall) {
           const functionCalls = message.toolCall.functionCalls;
           if (functionCalls && functionCalls.length > 0) {
             const call = functionCalls[0];
             if (call.name === 'displayCorrection') {
               const correctionData = call.args as unknown as Correction;
               console.log("📝 Correction reçue:", correctionData);
               setAllCorrections(prev => [...prev, correctionData]);
               addCorrectionToToolbox(correctionData);

               try {
                 sessionRef.current.sendToolResponse({
                   functionResponses: [{
                     name: 'displayCorrection',
                     response: { success: true }
                   }]
                 });
               } catch (err) {
                 console.error("Erreur tool response:", err);
               }
             }
           }
        }

        if (message.serverContent?.modelTurn?.parts) {
          for (const part of message.serverContent.modelTurn.parts) {
            if (part.inlineData?.mimeType?.startsWith("audio/")) {
              const audioData = base64ToBytes(part.inlineData.data);
              try {
                const audioBuffer = await outputCtx.decodeAudioData(audioData.buffer);
                const source = outputCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputNode);
                
                const startTime = Math.max(outputCtx.currentTime, nextStartTimeRef.current);
                source.start(startTime);
                nextStartTimeRef.current = startTime + audioBuffer.duration;
                
                sourcesRef.current.add(source);
                
                setIsAiSpeaking(true);
                source.onended = () => {
                  sourcesRef.current.delete(source);
                  if (sourcesRef.current.size === 0) {
                    setIsAiSpeaking(false);
                  }
                };
              } catch (err) {
                console.error("❌ Erreur décodage audio:", err);
              }
            }
          }
        }
      });

      session.on('error', (error: any) => {
        console.error("❌ Erreur Live API:", error);
        setConnectionState(ConnectionState.ERROR);
        setErrorMsg(error.message || "Erreur de connexion");
      });

      session.on('close', () => {
        console.log("🔌 Connexion fermée");
        stopAudioProcessing();
        setConnectionState(ConnectionState.DISCONNECTED);
      });

      setConnectionState(ConnectionState.CONNECTED);
      console.log("✅ Session connectée");
      
    } catch (error) {
      console.error("❌ Erreur startSession:", error);
      setConnectionState(ConnectionState.ERROR);
      setErrorMsg(error instanceof Error ? error.message : "Erreur inconnue");
      stopAudioProcessing();
    }
  };

  const endSession = useCallback(() => {
    console.log("🔚 Arrêt manuel de la session");
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {
        console.error("Erreur fermeture session:", e);
      }
      sessionRef.current = null;
    }
    stopAudioProcessing();
    setConnectionState(ConnectionState.DISCONNECTED);
    setIsAiSpeaking(false);
  }, [stopAudioProcessing]);

  useEffect(() => {
    return () => {
      endSession();
    };
  }, [endSession]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ÉCRAN SÉLECTION DURÉE
  if (showDurationSelector) {
    return (
      <div className="flex flex-col h-screen max-w-4xl mx-auto bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 font-sans text-white">
        <header className="p-4 border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-green rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-brand-green/50">
                LC
              </div>
              <div>
                <h1 className="text-xl font-bold">
                  Lingua<span className="text-brand-green">Compagnon</span>
                </h1>
                <p className="text-xs text-gray-400">Mode Oral - Semaine {week.id}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 rounded-lg transition-colors"
            >
              ← Retour
            </button>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Combien de temps voulez-vous pratiquer ?
            </h2>
            <p className="text-gray-400 text-lg">
              Choisissez la durée de votre conversation avec François
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl">
            {[2, 5, 8, 10].map((duration) => (
              <button
                key={duration}
                onClick={() => startSession(duration)}
                className="group p-8 bg-gray-800 border-2 border-gray-700 rounded-xl hover:border-brand-green hover:bg-gray-700 transition-all duration-300 flex flex-col items-center gap-3"
              >
                <div className="text-5xl font-bold text-brand-green group-hover:scale-110 transition-transform">
                  {duration}
                </div>
                <div className="text-sm text-gray-400 group-hover:text-white transition-colors">
                  minute{duration > 1 ? 's' : ''}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 text-center text-gray-500 text-sm">
            💡 Conseil : Commencez par 2-5 minutes pour vous familiariser
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 font-sans text-white relative overflow-hidden">
      {showToolboxNotification && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-fade-in">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="font-medium">Ajouté à votre boîte à outils !</span>
        </div>
      )}

      <header className="relative z-10 p-4 border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-green rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-brand-green/50">
              LC
            </div>
            <div>
              <h1 className="text-xl font-bold">
                Lingua<span className="text-brand-green">Compagnon</span>
              </h1>
              <p className="text-xs text-gray-400">Mode Oral - Semaine {week.id}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-brand-green">{formatTime(timeRemaining)}</div>
            </div>
            <button 
              onClick={() => { endSession(); onClose(); }}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Terminer
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-400">
          <span className="font-semibold text-gray-300">Objectif :</span> {week.description}
        </p>
      </header>

      <main className="flex-1 overflow-y-auto p-4 flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        {connectionState === ConnectionState.CONNECTING && (
          <div className="flex flex-col items-center gap-4 animate-pulse">
            <div className="w-16 h-16 border-4 border-brand-green border-t-transparent rounded-full animate-spin"></div>
            <span className="text-lg font-medium text-gray-300">Connexion...</span>
          </div>
        )}

        {connectionState === ConnectionState.ERROR && (
          <div className="flex flex-col items-center gap-4 text-red-400">
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-lg text-center px-4">{errorMsg}</span>
            <button onClick={() => setShowDurationSelector(true)} className="mt-4 px-6 py-2 bg-red-500 rounded-full hover:bg-red-600 transition-colors">
              Réessayer
            </button>
          </div>
        )}

        {connectionState === ConnectionState.CONNECTED && (
          <div className="relative">
            <div className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-500 ${
              isAiSpeaking 
                ? 'bg-brand-green shadow-xl shadow-brand-green/30' 
                : 'bg-white border-4 border-gray-200 shadow-lg'
            }`}>
              {isAiSpeaking ? (
                <div className="flex flex-col items-center text-white">
                  <svg className="w-10 h-10 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                  <span className="text-xs font-medium mt-2">François parle...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2 h-12">
                    {[...Array(5)].map((_, i) => (
                      <div 
                        key={i} 
                        className="w-2 bg-brand-green rounded-full transition-all duration-75"
                        style={{ 
                          height: isMicMuted ? '6px' : `${Math.max(6, Math.min(48, volumeLevel * ((i+1)/1.5)))}px`,
                          opacity: isMicMuted ? 0.3 : 1 
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500 font-medium mt-3 uppercase tracking-wide">
                    {isMicMuted ? '🎤 Micro coupé' : '👂 À vous'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {allCorrections.length > 0 && (
        <div className="bg-white border-t border-gray-200 p-4 max-h-64 overflow-y-auto rounded-t-lg">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-gray-800 uppercase">📝 Corrections ({allCorrections.length})</h3>
            <button
              onClick={() => {
                const content = allCorrections.map((c, i) => 
                  `CORRECTION ${i+1}\n` +
                  `Vous avez dit : ${c.originalSentence}\n` +
                  `Correction : ${c.correctedSentence}\n` +
                  `Explication : ${c.explanation}\n\n`
                ).join('---\n\n');
                const blob = new Blob([`CORRECTIONS - LinguaCompagnon\nSemaine ${week.id}\n\n${content}`], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `corrections-semaine-${week.id}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 px-3 py-1 bg-brand-green hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Télécharger
            </button>
          </div>
          <div className="space-y-3">
            {allCorrections.map((correction, index) => (
              <div key={index} className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded">#{index + 1}</span>
                  <div className="flex-1">
                    <div className="text-sm text-gray-500 line-through mb-1">{correction.originalSentence}</div>
                    <div className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-1">
                      <span className="text-brand-green">→</span>
                      {correction.correctedSentence}
                    </div>
                    <p className="text-xs text-gray-600 italic">💡 {correction.explanation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </main>
    </div>
  );
};

export default LiveTutorOral;