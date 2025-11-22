import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { float32ToInt16, base64ToArrayBuffer, arrayBufferToBase64 } from '../utils/audioUtils';
import { BotIcon, EndIcon } from './Icons';

interface LiveSessionProps {
  systemInstruction: string;
  onClose: () => void;
}

const LiveSession: React.FC<LiveSessionProps> = ({ systemInstruction, onClose }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const isCleanupRef = useRef(false);

  useEffect(() => {
    const startSession = async () => {
      try {
        // ✅ VÉRIFICATION 1 : Vérifier que getUserMedia existe
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error(
            "Votre navigateur ne supporte pas l'accès au microphone. " +
            "Assurez-vous d'utiliser HTTPS ou localhost, et un navigateur moderne (Chrome, Firefox, Edge)."
          );
        }

        // ✅ VÉRIFICATION 2 : Vérifier l'API Key
        const apiKey = import.meta.env.VITE_API_KEY;
        
        if (!apiKey) {
          throw new Error("VITE_API_KEY environment variable not set. Please check your .env.local file.");
        }

        const ai = new GoogleGenAI({ apiKey });
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
            sampleRate: 16000,
        });
        audioContextRef.current = audioContext;
        
        const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
            sampleRate: 24000,
        });

        // ✅ VÉRIFICATION 3 : Demander l'accès au microphone
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Setup Live API Session
        sessionPromiseRef.current = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          config: {
            systemInstruction,
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
            },
          },
          callbacks: {
            onopen: () => {
              console.log('Live session connected');
              setIsConnected(true);

              // Process Input Audio
              const source = audioContext.createMediaStreamSource(stream);
              inputSourceRef.current = source;
              
              const processor = audioContext.createScriptProcessor(4096, 1, 1);
              processorRef.current = processor;

              processor.onaudioprocess = (e) => {
                if (isCleanupRef.current) return;
                const inputData = e.inputBuffer.getChannelData(0);
                
                // Simple volume meter
                let sum = 0;
                for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
                setVolume(Math.sqrt(sum / inputData.length));

                const int16Data = float32ToInt16(inputData);
                const base64Data = arrayBufferToBase64(int16Data.buffer);
                
                sessionPromiseRef.current?.then(session => {
                    session.sendRealtimeInput({
                        media: {
                            mimeType: 'audio/pcm;rate=16000',
                            data: base64Data
                        }
                    });
                });
              };

              source.connect(processor);
              processor.connect(audioContext.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
                 if (isCleanupRef.current) return;

                const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (audioData) {
                    const audioBufferChunk = await outputAudioContext.decodeAudioData(base64ToArrayBuffer(audioData));
                    
                    const source = outputAudioContext.createBufferSource();
                    source.buffer = audioBufferChunk;
                    source.connect(outputAudioContext.destination);
                    
                    const currentTime = outputAudioContext.currentTime;
                    if (nextStartTimeRef.current < currentTime) {
                        nextStartTimeRef.current = currentTime;
                    }
                    
                    source.start(nextStartTimeRef.current);
                    nextStartTimeRef.current += audioBufferChunk.duration;
                    
                    sourcesRef.current.add(source);
                    source.onended = () => sourcesRef.current.delete(source);
                }
                
                if (message.serverContent?.interrupted) {
                    sourcesRef.current.forEach(s => s.stop());
                    sourcesRef.current.clear();
                    nextStartTimeRef.current = 0;
                }
            },
            onclose: () => {
              console.log('Live session closed');
              setIsConnected(false);
            },
            onerror: (err) => {
              console.error('Live session error', err);
              setError('Une erreur est survenue avec la connexion vocale.');
            }
          }
        });

      } catch (err) {
        console.error("Failed to initialize live session", err);
        
        // ✅ Messages d'erreur spécifiques selon le type d'erreur
        if (err instanceof Error) {
          if (err.message.includes('getUserMedia')) {
            setError(
              "⚠️ Accès au microphone impossible.\n\n" +
              "Solutions :\n" +
              "• Utilisez Chrome, Firefox ou Edge\n" +
              "• Assurez-vous d'être en HTTPS ou sur localhost\n" +
              "• Vérifiez que votre microphone est branché"
            );
          } else if (err.message.includes('VITE_API_KEY')) {
            setError(
              "⚠️ Clé API manquante.\n\n" +
              "Créez un fichier .env.local avec :\n" +
              "VITE_API_KEY=votre_clé_google"
            );
          } else if (err.message.includes('navigator')) {
            setError(
              "⚠️ Votre navigateur ne supporte pas l'accès au microphone.\n\n" +
              "Utilisez un navigateur moderne :\n" +
              "• Chrome (recommandé)\n" +
              "• Firefox\n" +
              "• Edge"
            );
          } else {
            setError(`❌ Erreur : ${err.message}`);
          }
        } else {
          setError("Une erreur inattendue est survenue.");
        }
      }
    };

    startSession();

    return () => {
        isCleanupRef.current = true;
        sessionPromiseRef.current?.then(session => session.close());
        
        inputSourceRef.current?.disconnect();
        processorRef.current?.disconnect();
        audioContextRef.current?.close();
        
        sourcesRef.current.forEach(s => s.stop());
    };
  }, [systemInstruction]);

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-95 z-50 flex flex-col items-center justify-center text-white p-4">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold mb-2">Mode Conversation Orale</h2>
        <p className="text-gray-300">Parlez naturellement avec votre tuteur.</p>
      </div>

      {error ? (
          <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded mb-6 max-w-md">
              {error}
          </div>
      ) : (
        <div className="relative w-48 h-48 flex items-center justify-center mb-12">
            {/* Animated circles based on volume/connection */}
            <div className={`absolute inset-0 rounded-full border-2 border-brand-green opacity-50 transition-all duration-100`}
                 style={{ transform: `scale(${1 + volume * 5})` }} />
            <div className={`absolute inset-4 rounded-full border-2 border-brand-green opacity-30 transition-all duration-200`} 
                 style={{ transform: `scale(${1 + volume * 3})` }} />
            
            <div className={`w-32 h-32 rounded-full bg-gray-800 flex items-center justify-center shadow-lg z-10 border-4 ${isConnected ? 'border-brand-green' : 'border-gray-600'}`}>
                 <BotIcon className={`w-16 h-16 ${isConnected ? 'text-brand-green' : 'text-gray-500'}`} />
            </div>
            
            {isConnected && (
                 <div className="absolute -bottom-12 text-sm font-medium text-brand-green animate-pulse">
                     Écoute en cours...
                 </div>
            )}
             {!isConnected && !error && (
                 <div className="absolute -bottom-12 text-sm font-medium text-gray-400">
                     Connexion...
                 </div>
            )}
        </div>
      )}

      <button
        onClick={onClose}
        className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-full font-semibold transition-colors shadow-lg"
      >
        <EndIcon className="w-6 h-6" />
        Terminer la session
      </button>
    </div>
  );
};

export default LiveSession;


