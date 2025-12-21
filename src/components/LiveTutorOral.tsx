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
3. ✅ Corriger UNIQUEMENT les VRAIES erreurs importantes

TYPES D'ERREURS À CORRIGER :
✅ GRAMMAIRE : articles, accords, structure de phrase incorrecte
✅ CONJUGAISON : temps verbal erroné, auxiliaire incorrect
✅ VOCABULAIRE : mot inexistant ou très mal prononcé/écrit
✅ PRONONCIATION : UNIQUEMENT liaisons interdites (ex: "les_haricots" → "les haricots")

❌ NE PAS CORRIGER :
- Liaisons facultatives ou obligatoires bien prononcées
- Phrases déjà correctes
- Petits accents étrangers acceptables
- Approximations de prononciation si le sens est clair

EXEMPLES CONCRETS :
✅ Corriger : "Je suis allé à la Paris" → "Je suis allé à Paris" (grammaire)
✅ Corriger : "Hier je mange" → "Hier j'ai mangé" (conjugaison)
✅ Corriger : "les_haricots" [liaison interdite] → "les haricots" (prononciation)
❌ NE PAS corriger : "Ils sont lourds" → "Ils sont lourds" (IDENTIQUE !)
❌ NE PAS corriger : "avec mes amis" → "avec mes_amis" (liaison facultative OK)`,
  
  parameters: {
    type: Type.OBJECT,
    properties: {
      originalSentence: { 
        type: Type.STRING, 
        description: "La phrase EXACTE prononcée par l'apprenant AVEC l'erreur. Si aucune vraie erreur, NE PAS appeler cet outil." 
      },
      correctedSentence: { 
        type: Type.STRING, 
        description: "La version CORRIGÉE. DOIT être DIFFÉRENTE de originalSentence. Si identique, NE PAS appeler cet outil." 
      },
      explanation: { 
        type: Type.STRING, 
        description: "Explication TRÈS BRÈVE (max 10 mots). Format obligatoire : 'Type : explication courte'. Exemples : 'Grammaire : pas d'article devant les villes', 'Conjugaison : hier nécessite le passé composé'" 
      },
      errorType: {
        type: Type.STRING,
        description: "Le type d'erreur détecté. Choisir parmi : pronunciation, grammar, vocabulary, conjugation",
        enum: ["pronunciation", "grammar", "vocabulary", "conjugation"]
      },
      mispronouncedWord: {
        type: Type.STRING,
        description: "UNIQUEMENT si errorType='pronunciation' : indiquer le ou les mots mal prononcés (ex: 'beaucoup', 'été'). Laisser VIDE pour grammar, vocabulary, conjugation."
      }
    },
    required: ["originalSentence", "correctedSentence", "explanation", "errorType"],
  },
};

const LiveTutorOral: React.FC<LiveTutorOralProps> = ({ weekNumber, onClose }) => {
  const week = getOralWeekConfig(weekNumber);
  
  // ✅ NOUVEAU : Sélecteur de durée
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

  // ✅ NOUVEAU : Boîte à outils
  const [showToolboxNotification, setShowToolboxNotification] = useState(false);
  const { addItem } = useToolBox();

  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ Timer
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

  // ✅ Boîte à outils
const addCorrectionToToolbox = useCallback((correction: Correction & { errorType?: string; mispronouncedWord?: string }) => {
  // ✅ PRIORITÉ 1 : Utiliser errorType si fourni par l'IA
  let category: 'grammar' | 'vocabulary' | 'conjugation' | 'pronunciation' = 'grammar';
  
  if (correction.errorType) {
    // L'IA a explicitement dit le type d'erreur
    category = correction.errorType as any;
  } else {
    // ✅ PRIORITÉ 2 : Détecter par le contenu de l'explication
    const explanation = correction.explanation.toLowerCase();
    
    if (explanation.startsWith('prononciation') || explanation.includes('prononciation :') || 
        explanation.includes('mal prononcé') || explanation.includes('son ')) {
      category = 'pronunciation';
    } else if (explanation.startsWith('conjugaison') || explanation.includes('conjugaison :') || 
               explanation.includes('temps ')) {
      category = 'conjugation';
    } else if (explanation.startsWith('vocabulaire') || explanation.includes('vocabulaire :') || 
               explanation.includes('mot ')) {
      category = 'vocabulary';
    } else if (explanation.startsWith('grammaire') || explanation.includes('grammaire :')) {
      category = 'grammar';
    }
    
    // ✅ PRIORITÉ 3 : Si phrases identiques à l'écrit → c'est de la prononciation
    if (correction.originalSentence.toLowerCase().trim() === correction.correctedSentence.toLowerCase().trim()) {
      category = 'pronunciation';
    }
  }

  // ✅ Construire le titre selon la catégorie
  let title = correction.explanation.length > 50 
    ? correction.explanation.substring(0, 50) + '...'
    : correction.explanation;

  // ✅ Pour prononciation : ajouter le mot mal prononcé dans le titre si disponible
  if (category === 'pronunciation' && correction.mispronouncedWord) {
    title = `Prononciation : "${correction.mispronouncedWord}"`;
  }

  // ✅ Construire l'exemple
  let example = `❌ ${correction.originalSentence}\n✅ ${correction.correctedSentence}`;
  
  // ✅ Pour prononciation : indiquer explicitement le mot problématique
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

    if (inputAudioContextRef.current?.state !== 'closed') inputAudioContextRef.current?.close();
    if (outputAudioContextRef.current?.state !== 'closed') outputAudioContextRef.current?.close();
    
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
          },
          onmessage: async (message: LiveServerMessage) => {
            // Tool calls
            if (message.toolCall) {
               const functionCalls = message.toolCall.functionCalls;
               if (functionCalls && functionCalls.length > 0) {
                 const call = functionCalls[0];
                 if (call.name === 'displayCorrection') {
                   const correctionData = call.args as unknown as Correction;
                   console.log("📝 Correction reçue:", correctionData);
                   if (message.serverContent?.modelTurn?.parts) {
  message.serverContent.modelTurn.parts.forEach(part => {
    if (part.functionCall?.name === "displayCorrection") {
      const args = part.functionCall.args as any;
      const correction: Correction = {
        originalSentence: args.originalSentence || "",
        correctedSentence: args.correctedSentence || "",
        explanation: args.explanation || "",
        errorType: args.errorType,
        mispronouncedWord: args.mispronouncedWord
      };
      
      // ✅ VALIDATION AVANT AJOUT
      if (isValidCorrection(correction)) {
        setAllCorrections(prev => [...prev, correction]);
        setShowToolboxNotification(true);
        setTimeout(() => setShowToolboxNotification(false), 3000);
      } else {
        console.log('❌ Correction rejetée car invalide');
      }
    }
  });
}

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

            // Audio
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

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsAiSpeaking(false);
            }

            if (message.serverContent?.turnComplete) {
              setIsAiSpeaking(false);
            }
          },
          onclose: () => {
            console.log("❌ Connexion fermée");
            setConnectionState(ConnectionState.DISCONNECTED);
          },
          onerror: (err: any) => {
            console.error("❌ Erreur:", err);
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
          systemInstruction: week.systemPrompt
        }
      };

      sessionPromiseRef.current = ai.live.connect(config);
      
    } catch (err: any) {
      console.error("❌ Erreur:", err);
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
    sessionPromiseRef.current = null;
    onClose();
  };

const handleReportDoubtOral = () => {
  console.log('🔍 handleReportDoubtOral appelé');
  console.log('📊 allCorrections:', allCorrections);
  console.log('📅 week:', week);
  console.log('⏱️ timeRemaining:', timeRemaining);
  console.log('🎯 initialDuration:', initialDuration);
  
  try {
    // Créer le contenu de l'email
    const subject = encodeURIComponent('🚨 Doute sur correction - Mode ORAL - LinguaCompagnon');
    
    // Générer les corrections enregistrées
    let correctionsText = '=== CORRECTIONS REÇUES PENDANT LA SESSION ===\n\n';
    if (allCorrections.length === 0) {
      correctionsText += '(Aucune correction enregistrée)\n\n';
    } else {
      allCorrections.forEach((correction, index) => {
        correctionsText += `[${index + 1}] Type: ${correction.errorType || 'non spécifié'}\n`;
        correctionsText += `   Original : ${correction.originalSentence}\n`;
        correctionsText += `   Corrigé  : ${correction.correctedSentence}\n`;
        correctionsText += `   Explication : ${correction.explanation}\n`;
        if (correction.mispronouncedWord) {
          correctionsText += `   Mot concerné : ${correction.mispronouncedWord}\n`;
        }
        correctionsText += '\n';
      });
    }
    
    // Calculer la durée écoulée
    const elapsedTime = initialDuration * 60 - timeRemaining;
    
    // Corps de l'email
    const body = encodeURIComponent(`Bonjour Marion,

J'ai un doute concernant une ou plusieurs corrections reçues pendant ma session orale avec François.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ SESSION MODE ORAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONTEXTE :
- Semaine : ${week.title}
- Date : ${new Date().toLocaleString('fr-FR')}
- Durée session : ${formatTime(elapsedTime)}
- Nombre de corrections : ${allCorrections.length}

${correctionsText}

COMMENTAIRE LIBRE :
(Ajoutez vos commentaires ici pour préciser votre doute)

Merci de vérifier ces corrections.

Cordialement,
Un apprenant`);

    console.log('📧 Email généré, ouverture...');
    
    // Ouvrir le client email avec mailto
    window.location.href = `mailto:marionviz@hotmail.com?subject=${subject}&body=${body}`;
    
  } catch (error) {
    console.error('❌ Erreur dans handleReportDoubtOral:', error);
  }
};

const isValidCorrection = (correction: Correction): boolean => {
  // 1. Vérifier que les phrases ne sont pas identiques
  const original = correction.originalSentence.trim().toLowerCase();
  const corrected = correction.correctedSentence.trim().toLowerCase();
  
  if (original === corrected) {
    console.warn('⚠️ Correction rejetée : phrases identiques', correction);
    return false;
  }
  
  // 2. Vérifier que la différence est significative (au moins 2 caractères)
  const difference = Math.abs(original.length - corrected.length);
  if (difference === 0 && original === corrected) {
    console.warn('⚠️ Correction rejetée : aucune différence', correction);
    return false;
  }
  
  // 3. Pour les erreurs de prononciation, vérifier qu'il y a vraiment une différence
  if (correction.errorType === 'pronunciation') {
    // Enlever les underscores pour comparer
    const originalClean = original.replace(/_/g, ' ');
    const correctedClean = corrected.replace(/_/g, ' ');
    
    if (originalClean === correctedClean) {
      console.warn('⚠️ Correction prononciation rejetée : identique sans underscores', correction);
      return false;
    }
  }
  
  return true;
};

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ✅ ÉCRAN SÉLECTEUR
  if (showDurationSelector) {
  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white font-sans">
      <header className="p-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
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
          <button onClick={onClose} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-600 rounded-lg transition-colors">
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
              className="group p-8 bg-white rounded-xl border-2 border-gray-200 hover:border-brand-green hover:shadow-xl transition-all duration-300 flex flex-col items-center gap-3"
            >
              <div className="text-5xl font-bold text-brand-green group-hover:scale-110 transition-transform">
                {duration}
              </div>
              <div className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">
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
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white font-sans">
      {showToolboxNotification && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-fade-in">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="font-medium">Ajouté à votre boîte à outils !</span>
        </div>
      )}
      
<header className="p-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
  <div className="flex justify-between items-center mb-2">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-brand-green rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">
        <img src="/francois.jpg" alt="François" className="w-10 h-10 rounded-full shadow-sm object-cover" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-gray-800">Lingua<span className="text-brand-green">Compagnon</span></h1>
        <p className="text-xs text-gray-500">Mode Oral - {week.title}</p>
      </div>
    </div>
    
    {/* ✅ BOUTONS À DROITE (Timer + Un doute + Terminer) */}
    <div className="flex items-center gap-2">
      {/* Timer */}
      <div className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg">
        <div className="text-2xl font-bold text-brand-green">{formatTime(timeRemaining)}</div>
      </div>
      
      {/* ✅ NOUVEAU : Bouton Un doute */}
      <button 
        onClick={handleReportDoubtOral}
        className="flex items-center gap-1.5 px-3 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 hover:text-orange-800 text-xs font-medium rounded-lg transition-all border border-orange-300"
        title="Signaler un doute sur une correction à Marion"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Un doute ?
      </button>
      
      {/* Bouton Terminer */}
      <button 
        onClick={handleEndCall} 
        className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        Terminer
      </button>
    </div>
  </div>
  <p className="text-sm text-gray-600">
    <span className="font-semibold text-gray-900">Objectif :</span> {week.description}
  </p>
</header>

      <main className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        {connectionState === ConnectionState.CONNECTING && (
          <div className="flex flex-col items-center gap-4 animate-pulse">
            <div className="w-16 h-16 border-4 border-brand-green border-t-transparent rounded-full animate-spin"></div>
            <span className="text-lg font-medium text-gray-700">Connexion...</span>
          </div>
        )}

        {connectionState === ConnectionState.ERROR && (
          <div className="flex flex-col items-center gap-4 text-red-500">
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-lg">{errorMsg}</span>
            <button onClick={() => setShowDurationSelector(true)} className="mt-4 px-6 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors">
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
        <div className="bg-white border-t border-gray-200 p-4 max-h-64 overflow-y-auto">
          <h3 className="text-sm font-bold text-gray-800 uppercase mb-3">📝 Corrections ({allCorrections.length})</h3>
          <div className="space-y-3">
            {allCorrections.map((correction, index) => (
              <div key={index} className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded">#{index + 1}</span>
                  <div className="flex-1">
                    <div className="text-sm text-gray-500 line-through mb-1">{correction.originalSentence}</div>
                    <div className="text-sm font-semibold text-gray-800 mb-1">→ {correction.correctedSentence}</div>
                    <p className="text-xs text-gray-600 italic">💡 {correction.explanation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </main>

      {/* Pavé Boîte à outils */}
<div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
  <button
    onClick={() => setShowToolbox(!showToolbox)}
    className="w-full flex items-center justify-between px-4 py-3 bg-brand-green hover:bg-green-700 text-white rounded-lg transition-colors"
  >
    <div className="flex items-center gap-3">
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
      <span className="font-semibold">Ma Boîte à Outils</span>
    </div>
    <svg className={`w-5 h-5 transition-transform ${showToolbox ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  {showToolbox && (
    <div className="mt-4">
      <ToolBox />
    </div>
  )}
</div>
    </div>
  );
};

export default LiveTutorOral;