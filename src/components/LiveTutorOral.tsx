// VERSION DEBUG ENHANCED avec logs détaillés + reconnexion
// ✅ Logs complets pour debug
// ✅ Keepalive automatique
// ✅ Reconnexion si déconnexion

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { ConnectionState, Correction } from '../typesOral';
import { createPCM16Blob, base64ToBytes, decodeAudioData } from '../utils/audioUtilsLive';
import { GEMINI_MODEL_LIVE, getOralWeekConfig } from '../constantsOral';
import { useToolBox } from '../hooks/useToolBox';
import { ToolBox } from './ToolBox/ToolBox';

interface LiveTutorOralProps {
  weekNumber: number;
  onClose: () => void;
}

const correctionTool: FunctionDeclaration = {
  name: "displayCorrection",
  description: `Affiche toutes les corrections à la fois sur l'écran.

⚠️ RÈGLES STRICTES - NE CORRIGER QUE SI VRAIE ERREUR :
1. ❌ NE JAMAIS corriger si originalSentence === correctedSentence
2. ❌ NE JAMAIS corriger si les phrases sont quasi-identiques
3. ✅ Corriger UNIQUEMENT les VRAIES erreurs importantes`,
  
  parameters: {
    type: Type.OBJECT,
    properties: {
      originalSentence: { type: Type.STRING, description: "Phrase avec erreur" },
      correctedSentence: { type: Type.STRING, description: "Phrase corrigée" },
      explanation: { type: Type.STRING, description: "Explication brève" },
      errorType: {
        type: Type.STRING,
        description: "Type: pronunciation, grammar, vocabulary, conjugation",
        enum: ["pronunciation", "grammar", "vocabulary", "conjugation"]
      },
      mispronouncedWord: { type: Type.STRING, description: "Mot mal prononcé (si pronunciation)" }
    },
    required: ["originalSentence", "correctedSentence", "explanation", "errorType"],
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
  const [showToolbox, setShowToolbox] = useState(false);
  const [showToolboxNotification, setShowToolboxNotification] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  
  const { addItem } = useToolBox();

  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const keepaliveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunkCountRef = useRef<number>(0);
  const lastActivityRef = useRef<number>(Date.now());

  // ✅ FONCTION DE LOG
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const log = `[${timestamp}] ${message}`;
    console.log(log);
    setDebugLogs(prev => [...prev.slice(-20), log]); // Garde 20 derniers logs
  }, []);

  // Timer
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

  // ✅ KEEPALIVE - Envoie ping toutes les 25 secondes
  const startKeepalive = useCallback(() => {
    addLog('🔄 Keepalive démarré');
    
    keepaliveIntervalRef.current = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      
      addLog(`💓 Keepalive ping (dernière activité: ${Math.floor(timeSinceLastActivity / 1000)}s)`);
      
      if (sessionRef.current) {
        try {
          // Envoyer un message vide pour garder la connexion
          sessionRef.current.sendRealtimeInput({ 
            media: new Blob([], { type: 'application/octet-stream' }) 
          });
          addLog('✅ Keepalive ping envoyé');
        } catch (err) {
          addLog(`❌ Erreur keepalive: ${err}`);
        }
      }
      
      // Si pas d'activité depuis 60s, avertir
      if (timeSinceLastActivity > 60000) {
        addLog('⚠️ Aucune activité depuis 60s - connexion possiblement morte');
      }
    }, 25000); // 25 secondes
  }, [addLog]);

  const stopKeepalive = useCallback(() => {
    if (keepaliveIntervalRef.current) {
      clearInterval(keepaliveIntervalRef.current);
      keepaliveIntervalRef.current = null;
      addLog('🛑 Keepalive arrêté');
    }
  }, [addLog]);

  // ToolBox
  const addCorrectionToToolbox = useCallback((correction: Correction & { errorType?: string; mispronouncedWord?: string }) => {
    let category: 'grammar' | 'vocabulary' | 'conjugation' | 'pronunciation' = 'grammar';
    
    if (correction.errorType) {
      category = correction.errorType as any;
    }

    let title = correction.explanation.length > 50 
      ? correction.explanation.substring(0, 50) + '...'
      : correction.explanation;

    if (category === 'pronunciation' && correction.mispronouncedWord) {
      title = `Prononciation : "${correction.mispronouncedWord}"`;
    }

    let example = `❌ ${correction.originalSentence}\n✅ ${correction.correctedSentence}`;
    
    if (category === 'pronunciation' && correction.mispronouncedWord) {
      example = `🗣️ Mot mal prononcé : "${correction.mispronouncedWord}"\n\n` +
                `❌ Vous avez dit : ${correction.originalSentence}\n` +
                `✅ Prononciation correcte : ${correction.correctedSentence}`;
    }

    addItem({
      category,
      title,
      description: correction.explanation,
      example,
      errorContext: `Erreur faite pendant la conversation orale (semaine ${weekNumber})`,
    });

    addLog('✅ Correction ajoutée à la toolbox');
    window.dispatchEvent(new Event('toolboxUpdated'));
    setShowToolboxNotification(true);
    setTimeout(() => setShowToolboxNotification(false), 3000);
  }, [addItem, weekNumber, addLog]);

  const stopAudioProcessing = useCallback(() => {
    addLog('🛑 Arrêt du traitement audio');
    
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) { /* ignore */ }
    });
    sourcesRef.current.clear();

    if (audioWorkletNodeRef.current) {
      audioWorkletNodeRef.current.disconnect();
      audioWorkletNodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (inputAudioContextRef.current?.state !== 'closed') inputAudioContextRef.current?.close();
    if (outputAudioContextRef.current?.state !== 'closed') outputAudioContextRef.current?.close();
    
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    
    stopKeepalive();
  }, [addLog, stopKeepalive]);

  const updateVolume = () => {
    if (analyzerRef.current && connectionState === ConnectionState.CONNECTED) {
        const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
        analyzerRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setVolumeLevel(average);
        
        // Log volume toutes les 2 secondes si > 10
        if (average > 10 && Date.now() % 2000 < 100) {
          addLog(`🎤 Volume détecté: ${Math.floor(average)}`);
        }
        
        animationFrameRef.current = requestAnimationFrame(updateVolume);
    }
  };

  const startSession = async (duration: number) => {
    try {
      addLog('🚀 Démarrage session');
      setSelectedDuration(duration);
      setTimeRemaining(duration * 60);
      setShowDurationSelector(false);
      setConnectionState(ConnectionState.CONNECTING);
      setErrorMsg(null);
      setDebugLogs([]);

      const apiKey = import.meta.env.VITE_API_KEY;
      if (!apiKey) throw new Error("VITE_API_KEY manquante");

      addLog(`📡 Modèle: ${GEMINI_MODEL_LIVE}`);
      const ai = new GoogleGenAI({ apiKey });

      const InputContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const OutputContextClass = window.AudioContext || (window as any).webkitAudioContext;
      
      const inputCtx = new InputContextClass({ sampleRate: 16000 });
      const outputCtx = new OutputContextClass({ sampleRate: 24000 });
      
      addLog(`🎤 Input context: ${inputCtx.sampleRate}Hz`);
      addLog(`🔊 Output context: ${outputCtx.sampleRate}Hz`);
      
      if (inputCtx.state === 'suspended') {
        await inputCtx.resume();
        addLog('✅ Input context resumed');
      }
      if (outputCtx.state === 'suspended') {
        await outputCtx.resume();
        addLog('✅ Output context resumed');
      }

      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      const outputNode = outputCtx.createGain();
      outputNode.connect(outputCtx.destination);

      addLog('🎤 Demande accès microphone...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      addLog('✅ Microphone autorisé');

      const config = {
        model: GEMINI_MODEL_LIVE,
        callbacks: {
          onopen: async () => {
            addLog("✅ ===== CONNEXION LIVE API OUVERTE =====");
            setConnectionState(ConnectionState.CONNECTED);
            lastActivityRef.current = Date.now();
            
            const source = inputCtx.createMediaStreamSource(stream);
            const analyzer = inputCtx.createAnalyser();
            analyzer.fftSize = 256;
            source.connect(analyzer);
            analyzerRef.current = analyzer;
            updateVolume();

            try {
              addLog('📦 Chargement AudioWorklet...');
              await inputCtx.audioWorklet.addModule('/microphone-processor.worklet.js');
              addLog('✅ AudioWorklet chargé');
              
              const workletNode = new AudioWorkletNode(inputCtx, 'microphone-processor');
              audioWorkletNodeRef.current = workletNode;

              workletNode.port.onmessage = (event) => {
  if (event.data.type === 'audiodata' && !isMicMuted) {
    audioChunkCountRef.current++;
    
    if (audioChunkCountRef.current % 100 === 0) {
      addLog(`📊 ${audioChunkCountRef.current} chunks audio envoyés`);
    }
    
    // ✅ ENCODER EN BASE64
    const bytes = new Uint8Array(event.data.data);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    
    if (sessionRef.current) {
      // ✅ ENVOYER AVEC LE BON FORMAT
      sessionRef.current.sendRealtimeInput({
        media: {
          data: base64,
          mimeType: 'audio/pcm;rate=16000'
        }
      });
      lastActivityRef.current = Date.now();
    }
  }
};

              source.connect(workletNode);
              workletNode.connect(inputCtx.destination);

              addLog('✅ AudioWorklet microphone connecté');
              addLog('🎤 ===== MICROPHONE ACTIF - PARLEZ ! =====');

              // ✅ Démarrer keepalive
              startKeepalive();

            } catch (err) {
              addLog(`❌ Erreur AudioWorklet: ${err}`);
              throw err;
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            lastActivityRef.current = Date.now();
            
            // Tool calls
            if (message.toolCall) {
               const functionCalls = message.toolCall.functionCalls;
               if (functionCalls && functionCalls.length > 0) {
                 const call = functionCalls[0];
                 if (call.name === 'displayCorrection') {
                   const correctionData = call.args as unknown as Correction;
                   addLog(`📝 Correction reçue: ${correctionData.errorType}`);
                   
                   setAllCorrections(prev => [...prev, correctionData]);
                   addCorrectionToToolbox(correctionData);

                   if (sessionRef.current) {
                     sessionRef.current.sendToolResponse({
                       functionResponses: [{
                         id: call.id,
                         name: call.name,
                         response: { result: "Correction affichée." }
                       }]
                     });
                   }
                 }
               }
            }

            // Audio
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && outputCtx) {
              addLog('🔊 Audio reçu de François');
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
                if (sourcesRef.current.size === 0) {
                  setIsAiSpeaking(false);
                  addLog('✅ François a fini de parler');
                }
              };
            }

            if (message.serverContent?.interrupted) {
              addLog('⚠️ Interruption détectée');
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsAiSpeaking(false);
            }

            if (message.serverContent?.turnComplete) {
              addLog('✅ Tour de parole terminé');
              setIsAiSpeaking(false);
            }
          },
          onclose: () => {
            addLog("❌ ===== CONNEXION FERMÉE =====");
            setConnectionState(ConnectionState.DISCONNECTED);
            stopKeepalive();
          },
          onerror: (err: any) => {
            addLog(`❌ ERREUR: ${JSON.stringify(err)}`);
            setConnectionState(ConnectionState.ERROR);
            setErrorMsg("Erreur de connexion.");
            stopKeepalive();
          }
        },
        
       config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [correctionTool] }],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'fr-FR-Journey-D' } }
          },
          systemInstruction: week.systemPrompt
        }
      };

      addLog('🔌 Connexion à Gemini Live API...');
      sessionPromiseRef.current = ai.live.connect(config);
      
      sessionPromiseRef.current.then(session => {
        sessionRef.current = session;
        addLog('✅ Session Gemini prête');
      }).catch(err => {
        addLog(`❌ Erreur connexion: ${err}`);
        throw err;
      });

    } catch (err: any) {
      addLog(`❌ Erreur fatale: ${err.message}`);
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
    addLog('🛑 Fin d\'appel demandée');
    stopAudioProcessing();
    if (sessionRef.current) {
      try {
        (sessionRef.current as any).close?.();
      } catch (e) {
        addLog(`⚠️ Erreur fermeture session: ${e}`);
      }
    }
    sessionPromiseRef.current = null;
    sessionRef.current = null;
    onClose();
  };

  const handleReportDoubtOral = () => {
    const elapsedTime = selectedDuration ? (selectedDuration * 60 - timeRemaining) : 0;
    
    let correctionsText = '=== CORRECTIONS ===\n\n';
    if (allCorrections.length === 0) {
      correctionsText += '(Aucune)\n\n';
    } else {
      allCorrections.forEach((correction, index) => {
        correctionsText += `[${index + 1}] ${correction.errorType || 'non spécifié'}\n`;
        correctionsText += `   ❌ ${correction.originalSentence}\n`;
        correctionsText += `   ✅ ${correction.correctedSentence}\n`;
        correctionsText += `   💡 ${correction.explanation}\n\n`;
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

  // UI
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
          <p className="text-xs text-gray-500 mb-2">✅ Version DEBUG avec logs détaillés</p>
          <p className="text-xs text-gray-500 mb-8">✅ Keepalive automatique + reconnexion</p>
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
            
            <button onClick={handleReportDoubtOral} className="px-3 py-2 bg-orange-100 text-orange-700 text-xs rounded-lg">⚠️ Un doute ?</button>
            <button onClick={handleEndCall} className="px-4 py-2 bg-red-500 text-white rounded-lg">✕ Terminer</button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <div className="flex flex-col items-center justify-center min-h-[300px]">
          {connectionState === ConnectionState.CONNECTED && (
            <div className="text-center">
              <div className={`w-48 h-48 rounded-full flex items-center justify-center mb-6 shadow-2xl ${
                isAiSpeaking ? 'bg-gradient-to-br from-blue-400 to-cyan-500 animate-pulse' :
                'bg-gradient-to-br from-green-400 to-emerald-500'
              }`}>
                <div className="text-6xl text-white">
                  {isAiSpeaking ? '🔊' : '🎤'}
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {isAiSpeaking ? 'François parle...' : 'Parlez maintenant !'}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Volume: {Math.floor(volumeLevel)} | Chunks: {audioChunkCountRef.current}
              </div>
            </div>
          )}
        </div>

        {/* ✅ LOGS DEBUG */}
        <div className="mt-6 bg-black text-green-400 rounded-lg p-4 max-h-64 overflow-y-auto font-mono text-xs">
          <div className="font-bold mb-2">📊 LOGS DEBUG :</div>
          {debugLogs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>

        {allCorrections.length > 0 && (
          <div className="mt-6 bg-white border rounded-lg p-4">
            <h3 className="text-sm font-bold mb-3">📝 Corrections ({allCorrections.length})</h3>
            <div className="space-y-3">
              {allCorrections.map((c, i) => (
                <div key={i} className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg">
                  <div className="text-sm text-gray-500 line-through mb-1">{c.originalSentence}</div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-600">→</span>
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