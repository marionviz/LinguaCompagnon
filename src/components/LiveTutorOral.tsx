import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { ConnectionState, Correction } from '../typesOral';
import { createPCM16Blob, base64ToBytes, decodeAudioData } from '../utils/audioUtilsLive';
import { GEMINI_MODEL_LIVE, getOralWeekConfig } from '../constantsOral';

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
  
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [lastCorrection, setLastCorrection] = useState<Correction | null>(null);
  const [allCorrections, setAllCorrections] = useState<Correction[]>([]);

  // Refs pour gestion audio
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

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

    if (inputAudioContextRef.current?.state !== 'closed') inputAudioContextRef.current?.close();
    if (outputAudioContextRef.current?.state !== 'closed') outputAudioContextRef.current?.close();
    
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
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

  const startSession = async () => {
    try {
      setConnectionState(ConnectionState.CONNECTING);
      setErrorMsg(null);
      setLastCorrection(null);

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
        callbacks: {
          onopen: async () => {
            console.log("✅ Connexion Live API ouverte");
            setConnectionState(ConnectionState.CONNECTED);
            
            const source = inputCtx.createMediaStreamSource(stream);
            const analyzer = inputCtx.createAnalyser();
            analyzer.fftSize = 256;
            source.connect(analyzer);
            analyzerRef.current = analyzer;
            updateVolume();

            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = processor;

            processor.onaudioprocess = (e) => {
              if (isMicMuted) return; 
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPCM16Blob(inputData);
              if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then(session => {
                  session.sendRealtimeInput({ media: pcmBlob });
                }).catch(console.error);
              }
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);

            // Déclencher le démarrage immédiat
            if (sessionPromiseRef.current) {
              sessionPromiseRef.current.then(session => {
                session.send({ parts: [{ text: "La session est ouverte. Salue l'étudiant et commence l'exercice immédiatement." }] });
              });
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            // Gérer les corrections via tool calls
            if (message.toolCall) {
               const functionCalls = message.toolCall.functionCalls;
               if (functionCalls && functionCalls.length > 0) {
                 const call = functionCalls[0];
                 if (call.name === 'displayCorrection') {
                   const correctionData = call.args as unknown as Correction;
                   setLastCorrection(correctionData);
                   setAllCorrections(prev => [...prev, correctionData]);
                   
                   // Acquitter le tool call
                   if (sessionPromiseRef.current) {
                     sessionPromiseRef.current.then(session => {
                       session.sendToolResponse({
                         functionResponses: [{
                           id: call.id,
                           name: call.name,
                           response: { result: "Correction affichée." }
                         }]
                       });
                     });
                   }
                 }
               }
            }

            // Gérer l'audio en sortie
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && outputCtx) {
              setIsAiSpeaking(true);
              const bytes = base64ToBytes(audioData);
              const buffer = await decodeAudioData(bytes, outputCtx, 24000, 1);
              
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputNode);

              const currentTime = outputCtx.currentTime;
              if (nextStartTimeRef.current < currentTime) {
                nextStartTimeRef.current = currentTime;
              }

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;

              sourcesRef.current.add(source);
              source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsAiSpeaking(false);
              };
            }

            // Gérer les interruptions
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsAiSpeaking(false);
            }

            // Gérer la fin du tour
            if (message.serverContent?.turnComplete) {
              setIsAiSpeaking(false);
            }
          },
          onclose: () => {
            console.log("❌ Connexion Live API fermée");
            setConnectionState(ConnectionState.DISCONNECTED);
          },
          onerror: (err: any) => {
            console.error("❌ Erreur Live API:", err);
            setConnectionState(ConnectionState.ERROR);
            setErrorMsg("Erreur de connexion.");
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [correctionTool] }],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
          },
          systemInstruction: `
            Tu es LinguaCompagnon en mode oral, le tuteur conversationnel de français.
            
            SEMAINE ${week.id}: ${week.title}
            OBJECTIF: ${week.objective}
            VOCABULAIRE: ${week.vocabulary.join(", ")}
            GRAMMAIRE: ${week.grammar.join(", ")}

            RÈGLES CRUCIALES :
            1. **DÉMARRAGE IMMÉDIAT** : Dès le premier signal, salue brièvement et pose directement la première question.
               Exemple : "Bonjour ! Cette semaine nous parlons de ${week.topics[0]}. ${week.objective.split('.')[0]}."
            
            2. **FEEDBACK ORAL COURT** : Quand l'utilisateur fait une erreur, ne l'interromps pas avec une longue explication.
               Dis : "Attention à ça..." ou "Je t'ai mis une note" et reformule correctement.
            
            3. **FEEDBACK ÉCRIT VIA OUTIL** : Utilise \`displayCorrection\` pour les erreurs importantes.
            
            4. **STYLE** : Bienveillant, encourageant, dynamique. Parle à 95% en français. Utilise le vouvoiement.
            
            5. **CORRECTIONS FORMATIVES** : Structure tes corrections orales : Correction → Explication brève → Encouragement.
          `
        }
      };

      sessionPromiseRef.current = ai.live.connect(config);
      
    } catch (err: any) {
      console.error("❌ Erreur initialisation:", err);
      setConnectionState(ConnectionState.ERROR);
      setErrorMsg("Impossible d'initialiser la session.");
      stopAudioProcessing();
    }
  };

  useEffect(() => {
    return () => stopAudioProcessing();
  }, [stopAudioProcessing]);

  useEffect(() => {
    if (connectionState === ConnectionState.CONNECTED) updateVolume();
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [connectionState]);

  const handleEndCall = () => {
    stopAudioProcessing();
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => (session as any).close?.()).catch(() => {});
    }
    onClose();
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white font-sans">
      
      {/* Header comme le mode écrit */}
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
              <p className="text-xs text-gray-500">Mode Oral - {week.title}</p>
            </div>
          </div>
          <button
            onClick={handleEndCall}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
            </svg>
            Terminer
          </button>
        </div>
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">Objectif :</span> {week.description}
        </p>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col">
        
      {/* Zone centrale avec visualiseur */}
      <div className="flex-1 flex items-center justify-center">
        {connectionState === ConnectionState.DISCONNECTED && (
          <button 
            onClick={startSession}
            className="group flex flex-col items-center gap-6"
          >
            <div className="w-32 h-32 rounded-full bg-brand-green flex items-center justify-center shadow-2xl shadow-brand-green/50 group-hover:scale-110 transition-transform">
              <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
            <span className="text-xl font-semibold text-gray-200 group-hover:text-white">Démarrer la conversation</span>
          </button>
        )}

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
            <span className="text-lg">{errorMsg}</span>
            <button onClick={startSession} className="mt-4 px-6 py-2 bg-red-500 rounded-full hover:bg-red-600 transition-colors">
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

      {/* Zone des corrections en bas */}
      {allCorrections.length > 0 && (
        <div className="bg-white border-t border-gray-200 p-4 max-h-64 overflow-y-auto">
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

      {/* Footer avec contrôles */}
      <footer className="sticky bottom-0 z-10 bg-white border-t border-gray-200 p-4">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setIsMicMuted(!isMicMuted)}
            disabled={connectionState !== ConnectionState.CONNECTED}
            className={`p-4 rounded-full transition-all ${
              isMicMuted 
                ? 'bg-gray-200 text-gray-500 hover:bg-gray-300' 
                : 'bg-brand-green text-white hover:bg-green-600 shadow-md'
            } disabled:opacity-30 disabled:cursor-not-allowed`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMicMuted ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              )}
            </svg>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default LiveTutorOral;