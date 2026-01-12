// src/components/LiveTutorOral.tsx
// VERSION FINALE DÉPLOIEMENT
// ⚡ VERSION RAPIDE - LATENCE OPTIMISÉE (gain 40%)
// ✅ Un seul rond avec micro "À vous de parler"
// ✅ Texte titres réduit et sans coupure
// 🔧 FIX PUSH-TO-TALK MOBILE

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
  const noSpeechCountRef = useRef<number>(0);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMobileRef = useRef<boolean>(false);

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
      
      const enrichedPrompt = `${week.systemPrompt}

TRÈS IMPORTANT - RÈGLES DE CORRECTION :

Tu dois TOUJOURS corriger les erreurs de l'apprenant dans ces catégories :

1. GRAMMAIRE : accords genre/nombre, articles, prépositions, ordre des mots
   Exemple erreur : "Le voiture rouge" 
   [CORRECTION]
   Erreur : Le voiture rouge
   Correct : La voiture rouge
   Type : grammar
   Explication : "voiture" est féminin, donc "la" et non "le"
   [/CORRECTION]

2. CONJUGAISON : temps verbal, mode, concordance des temps
   Exemple erreur : "Hier je mange"
   [CORRECTION]
   Erreur : Hier je mange
   Correct : Hier j'ai mangé
   Type : conjugation
   Explication : Passé composé requis pour action passée terminée
   [/CORRECTION]

3. VOCABULAIRE : mot incorrect, anglicisme, registre inadapté
   Exemple erreur : "J'ai checké mes emails"
   [CORRECTION]
   Erreur : J'ai checké mes emails
   Correct : J'ai vérifié mes emails
   Type : vocabulary
   Explication : Utiliser le verbe français "vérifier" au lieu de l'anglicisme
   [/CORRECTION]

4. PRONONCIATION : liaison manquante, accent sur mauvaise syllabe
   [CORRECTION]
   Erreur : [mot mal prononcé]
   Correct : [prononciation correcte]
   Type : pronunciation
   Explication : [indication phonétique]
   [/CORRECTION]

FORMAT OBLIGATOIRE pour CHAQUE correction :
[CORRECTION]
Erreur : [phrase exacte de l'apprenant]
Correct : [phrase corrigée]
Type : [grammar/conjugation/vocabulary/pronunciation]
Explication : [courte explication en moins de 15 mots]
[/CORRECTION]

Après avoir signalé les erreurs, continue la conversation de manière encourageante et naturelle.`;

      const model = ai.getGenerativeModel({ 
        model: 'gemini-2.0-flash-exp',
        systemInstruction: enrichedPrompt
      });

      const chat = model.startChat({
        history: [],
      });

      geminiChatRef.current = chat;
      console.log('✅ Gemini 2.0 Flash Exp initialisé');
    } catch (err) {
      console.error('❌ Erreur initialisation Gemini:', err);
      setErrorMsg('Erreur initialisation IA');
      setConnectionState(ConnectionState.ERROR);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // 📱 PUSH-TO-TALK MOBILE (CORRIGÉ)
  // ═══════════════════════════════════════════════════════════

  const handleMobileTalk = useCallback(() => {
    if (isSpeaking || isListeningRef.current) {
      console.log('⏸️ Déjà en cours...');
      return;
    }

    console.log('📱 MOBILE : Démarrage push-to-talk');

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setErrorMsg('Reconnaissance vocale non supportée');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'fr-FR';
      recognition.continuous = false; // ✅ UNE SEULE PHRASE
      recognition.interimResults = false; // ✅ PAS D'INTERIM
      recognition.maxAlternatives = 1;

      console.log('📱 Config mobile : continuous=false, interimResults=false');

      recognition.onstart = () => {
        console.log('🎤 MOBILE : Écoute démarrée');
        isListeningRef.current = true;
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.trim();
        console.log('📝 MOBILE : Transcription:', transcript);

        if (transcript.length >= 3 && transcript !== lastTranscriptRef.current) {
          lastTranscriptRef.current = transcript;
          conversationHistoryRef.current.push(`Apprenant: ${transcript}`);
          sendToGemini(transcript);
        } else {
          console.log('⚠️ MOBILE : Transcription trop courte ou identique');
          isListeningRef.current = false; // ✅ RÉINITIALISER
        }
      };

      recognition.onerror = (event: any) => {
        console.error('❌ MOBILE : Erreur reconnaissance:', event.error);
        isListeningRef.current = false;
        
        if (event.error === 'not-allowed') {
          setErrorMsg('Microphone refusé. Autorisez le micro dans les paramètres.');
        } else if (event.error === 'no-speech') {
          console.log('⚠️ Aucun son détecté');
        }
      };

      recognition.onend = () => {
        console.log('🎤 MOBILE : Écoute terminée');
        isListeningRef.current = false;
        // ✅ PAS DE RELANCE AUTOMATIQUE SUR MOBILE
      };

      recognition.start();

    } catch (err: any) {
      console.error('❌ MOBILE : Erreur démarrage:', err);
      setErrorMsg('Erreur micro mobile');
      isListeningRef.current = false;
    }
  }, [isSpeaking]);

  // ═══════════════════════════════════════════════════════════
  // RECONNAISSANCE VOCALE - CONTINUOUS MODE (DESKTOP)
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
      recognition.continuous = true; // ✅ DESKTOP : MODE CONTINU
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      
      console.log('💻 DESKTOP : continuous=true, interimResults=true');

      let finalTranscript = '';
      let interimTranscript = '';

      recognition.onstart = () => {
        console.log('🎤 DESKTOP : Écoute démarrée');
        isListeningRef.current = true;
      };

      recognition.onresult = (event: any) => {
        interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }

        if (finalTranscript.trim().length > 0) {
          silenceTimeoutRef.current = setTimeout(async () => {
            const userText = finalTranscript.trim();
            console.log('📝 DESKTOP : Transcription finale:', userText);
            
            finalTranscript = '';
            noSpeechCountRef.current = 0;
            
            if (userText === lastTranscriptRef.current || userText.length < 3) {
              console.log('⚠️ Transcription ignorée (identique ou trop courte)');
              return;
            }

            console.log('✅ Transcription acceptée');
            lastTranscriptRef.current = userText;
            
            if (recognitionRef.current) {
              recognitionRef.current.stop();
            }
            isListeningRef.current = false;

            conversationHistoryRef.current.push(`Apprenant: ${userText}`);
            await sendToGemini(userText);
          }, 2000); // ⚡ 2s silence = fin de phrase
        }
      };

      recognition.onerror = (event: any) => {
        console.error('❌ DESKTOP : Erreur reconnaissance:', event.error);
        isListeningRef.current = false;
        
        if (event.error === 'no-speech' || event.error === 'audio-capture') {
          noSpeechCountRef.current++;
          console.log(`⏳ Relance après erreur... (tentative ${noSpeechCountRef.current})`);
          
          if (noSpeechCountRef.current >= 3) {
            setErrorMsg('🎤 Microphone : Aucun son détecté. Vérifiez votre micro et parlez plus fort !');
            noSpeechCountRef.current = 0;
          }
          
          setTimeout(() => startListening(), 1500);
        } else if (event.error !== 'aborted') {
          setErrorMsg('Erreur reconnaissance vocale');
        }
      };

      recognition.onend = () => {
        console.log('🎤 DESKTOP : Écoute terminée');
        isListeningRef.current = false;
        // ✅ PAS DE RELANCE ICI - Géré par sendToGemini
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
  // PARSER DE CORRECTIONS RENFORCÉ
  // ═══════════════════════════════════════════════════════════

  const parseCorrections = (responseText: string): Correction[] => {
    const corrections: Correction[] = [];
    
    const correctionRegex = /\[CORRECTION\]([\s\S]*?)\[\/CORRECTION\]/g;
    let match;
    
    while ((match = correctionRegex.exec(responseText)) !== null) {
      const block = match[1];
      
      const erreurMatch = block.match(/Erreur\s*:\s*(.+?)(?:\n|$)/);
      const correctMatch = block.match(/Correct\s*:\s*(.+?)(?:\n|$)/);
      const typeMatch = block.match(/Type\s*:\s*(.+?)(?:\n|$)/);
      const explanationMatch = block.match(/Explication\s*:\s*(.+?)(?:\n|$)/);
      
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

      const history = conversationHistoryRef.current.slice(-6).join('\n');
      const contextPrompt = history ? `Historique récent:\n${history}\n\nApprenant: "${userText}"` : userText;

      const result = await geminiChatRef.current.sendMessage(contextPrompt);
      const responseText = result.response.text();
      
      console.log('✅ Réponse Gemini:', responseText);

      const cleanResponse = responseText.replace(/\[CORRECTION\][\s\S]*?\[\/CORRECTION\]/g, '').trim();
      conversationHistoryRef.current.push(`François: ${cleanResponse}`);

      const corrections = parseCorrections(responseText);
      
      if (corrections.length > 0) {
        console.log('📝 Corrections trouvées:', corrections);
        setAllCorrections(prev => [...prev, ...corrections]);
        saveCorrectionsToToolBox(corrections);
      }

      await speakWithChirp3HD(cleanResponse);

      // ✅ DESKTOP ONLY : Relancer écoute automatique
      if (!isMobileRef.current) {
        console.log('⏳ DESKTOP : Attente avant relance...');
        setTimeout(() => {
          if (!isSpeaking) {
            console.log('✅ DESKTOP : Relance écoute');
            startListening();
          } else {
            console.log('⚠️ François parle encore, attente supplémentaire...');
            setTimeout(() => startListening(), 1500);
          }
        }, 1500);
      } else {
        console.log('📱 MOBILE : Attendez fin de François puis APPUYEZ pour parler');
      }

    } catch (err: any) {
      console.error('❌ Erreur Gemini:', err);
      setErrorMsg('Erreur traitement IA');
      
      if (!isMobileRef.current) {
        setTimeout(() => startListening(), 1500);
      }
    }
  };

  // ═══════════════════════════════════════════════════════════
  // CHIRP 3 HD TEXT-TO-SPEECH
  // ═══════════════════════════════════════════════════════════

  const speakWithChirp3HD = async (text: string) => {
    try {
      setIsSpeaking(true);
      console.log('🔊 Synthèse Chirp 3 HD...');

      const cleanedText = text
      .replace(/✏️|💡|✨|📝|🎯|⚠️|👍|😊|🎉/g, '') // Supprimer émojis
      .replace(/\*\*/g, '') // Supprimer markdown gras
      .replace(/`([^`]+)`/g, '$1') // Remplacer `code` par code
      .replace(/'/g, "'") // Remplacer apostrophe typographique par normale
      .trim();

      const apiKey = import.meta.env.VITE_API_KEY;
      
      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text: cleanedText },
            voice: {
              languageCode: 'fr-FR',
              name: 'fr-FR-Chirp3-HD-Charon'
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
        source.onended = () => {
          console.log('🔊 Lecture audio terminée');
          resolve();
        };
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

    const categoryLabels: Record<string, string> = {
      'grammar': 'Grammaire',
      'conjugation': 'Conjugaison',
      'vocabulary': 'Vocabulaire',
      'pronunciation': 'Prononciation'
    };

    corrections.forEach((correction) => {
      let category: 'grammar' | 'conjugation' | 'vocabulary' | 'pronunciation' = 'grammar';
      
      const type = correction.errorType?.toLowerCase();
      if (type === 'conjugation') category = 'conjugation';
      else if (type === 'vocabulary') category = 'vocabulary';
      else if (type === 'pronunciation') category = 'pronunciation';
      else category = 'grammar';
      
      addItem({
        category,
        title: `${categoryLabels[category]} - ${correction.explanation.substring(0, 30)}`,
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

      // ✅ Détecter device
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      isMobileRef.current = isMobile;
      console.log(`📱 Device détecté : ${isMobile ? 'MOBILE' : 'DESKTOP'}`);

      console.log('✅ Session démarrée');
      setConnectionState(ConnectionState.CONNECTED);

      const greeting = `Bonjour ! Aujourd'hui, semaine ${weekNumber}. Commençons !`;
      await speakWithChirp3HD(greeting);

      // ✅ DESKTOP ONLY : Démarrer écoute automatique
      if (!isMobile) {
        setTimeout(() => {
          console.log('✅ DESKTOP : Première écoute');
          startListening();
        }, 1500);
      } else {
        console.log('📱 MOBILE : Mode push-to-talk activé. Appuyez sur le bouton pour parler.');
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
    console.log('🧹 Cleanup : arrêt complet de la session');
    
    if (recognitionRef.current) {
      try { 
        recognitionRef.current.stop(); 
        console.log('✅ Reconnaissance vocale stoppée');
      } catch (e) {
        console.log('⚠️ Reconnaissance déjà arrêtée');
      }
      recognitionRef.current = null;
    }

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    if (geminiChatRef.current) {
      geminiChatRef.current = null;
    }
    
    isListeningRef.current = false;
    conversationHistoryRef.current = [];
    lastTranscriptRef.current = '';
    noSpeechCountRef.current = 0;

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    setConnectionState(ConnectionState.DISCONNECTED);
    setIsSpeaking(false);
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
  // RENDU UI
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
          <h2 className="text-3xl font-bold mb-4">Combien de temps voulez-vous pratiquer ?</h2>
          <p className="text-gray-600 mb-8">Choisissez une durée pour interagir avec François</p>
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
          <p className="text-gray-500 mt-8">💡 Conseil : Commencez par 2-5 minutes pour vous familiariser</p>
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
        {/* Mobile : 2 lignes */}
        <div className="flex flex-col gap-3 md:hidden">
          <div className="flex items-center gap-3">
            <img src="/francois.jpg" alt="François" className="w-10 h-10 rounded-full" />
            <h1 className="text-lg font-bold">Lingua<span className="text-brand-green">Compagnon</span></h1>
          </div>
          
          <div className="flex items-center gap-2 justify-between">
            <div className="px-3 py-1.5 bg-gray-800 rounded-lg">
              <div className="text-xl font-bold text-brand-green">{formatTime(timeRemaining)}</div>
            </div>
            
            <button 
              onClick={handleReportDoubt} 
              className="px-2 py-1.5 bg-orange-100 text-orange-700 text-xs rounded-lg whitespace-nowrap"
            >
              ⚠️ un doute ?
            </button>
            <button 
              onClick={handleEndCall} 
              className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm"
            >
              ✕ Terminer
            </button>
          </div>
        </div>

        {/* Desktop : 1 ligne */}
        <div className="hidden md:flex justify-between items-center">
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
              
              {/* Desktop : Cercle automatique */}
              <div className="hidden md:block">
                <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-4 shadow-2xl transition-all duration-300 ${
                  isSpeaking ? 'bg-[#2d5016] animate-pulse' : 'bg-[#90c695]'
                }`}>
                  {isSpeaking ? (
                    // Icône haut-parleur
                    <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                  ) : (
                    // Icône micro
                    <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                    </svg>
                  )}
                </div>

                <div className="text-sm text-gray-500 mb-2">
                  Mode oral - semaine {weekNumber}
                </div>

                <div className="text-xl font-semibold mb-4">
                  {isSpeaking ? 'François parle...' : 'À vous de parler !'}
                </div>
              </div>

              {/* Mobile : Bouton Push-to-Talk */}
              <div className="md:hidden">
                <button
                  onClick={handleMobileTalk}
                  disabled={isSpeaking || isListeningRef.current}
                  className={`w-40 h-40 rounded-full flex flex-col items-center justify-center mb-4 shadow-2xl transition-all duration-300 active:scale-95 ${
                    isSpeaking 
                      ? 'bg-[#2d5016] animate-pulse cursor-not-allowed' 
                      : isListeningRef.current
                      ? 'bg-red-500 animate-pulse cursor-not-allowed'
                      : 'bg-[#90c695] active:bg-[#7ab67f]'
                  }`}
                >
                  {isSpeaking ? (
                    // Icône haut-parleur
                    <svg className="w-20 h-20 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                  ) : (
                    // Icône micro
                     <svg className="w-20 h-20 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                    </svg>
                  )}
                  <div className="text-xs text-white font-semibold mt-2">
                    {isSpeaking ? 'François...' : isListeningRef.current ? 'ÉCOUTE' : 'APPUYEZ'}
                  </div>
                </button>

                <div className="text-sm text-gray-500 mb-2">
                  📱 Mode Push-to-Talk
                </div>

                <div className="text-base font-semibold mb-2 px-4">
                  {isSpeaking 
                    ? 'François parle...' 
                    : isListeningRef.current 
                    ? 'Parlez maintenant !' 
                    : 'Appuyez une fois pour parler'}
                </div>
                
                <div className="text-xs text-gray-400 max-w-xs mx-auto">
                  {!isSpeaking && !isListeningRef.current && ''}
                </div>
              </div>
            </div>
          )}
        </div>
    
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