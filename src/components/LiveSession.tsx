import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { BotIcon, EndIcon } from './Icons';

interface LiveSessionProps {
  systemInstruction: string;
  onClose: () => void;
  currentWeek?: number;
}

/**
 * VERSION ALTERNATIVE SANS LIVE API
 * 
 * Cette version utilise :
 * - Web Speech API pour la reconnaissance vocale
 * - Gemini API standard pour les réponses
 * - SpeechSynthesis API pour la lecture vocale
 * 
 * Avantages : Plus simple, fonctionne partout
 * Inconvénients : Qualité audio moindre, latence plus élevée
 */
const LiveSessionAlternative: React.FC<LiveSessionProps> = ({ systemInstruction, onClose, currentWeek = 1 }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{role: 'user' | 'model', text: string}>>([]);
  
  const recognitionRef = useRef<any>(null);
  const chatRef = useRef<any>(null);

  useEffect(() => {
    // Initialiser Gemini Chat
    const initChat = async () => {
      try {
        const apiKey = import.meta.env.VITE_API_KEY;
        if (!apiKey) {
          throw new Error("VITE_API_KEY manquante dans .env.local");
        }

        const ai = new GoogleGenAI({ apiKey });
        chatRef.current = ai.chats.create({
          model: 'gemini-2.5-flash',
          config: { systemInstruction },
        });

        // Message de bienvenue COURT avec objectif
        const weekObjective = systemInstruction.split('CONTEXTE ACTUEL DE L\'APPRENANT')[1]?.split('---')[0]?.trim() || `Semaine ${currentWeek}`;
        const welcome = `Bonjour ! Aujourd'hui, nous travaillons sur : ${weekObjective}. À vous !`;
        setMessages([{ role: 'model', text: welcome }]);
        await speak(welcome);

      } catch (err) {
        console.error("Failed to init chat", err);
        setError("Impossible d'initialiser la conversation.");
      }
    };

    initChat();

    // Initialiser Web Speech API
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError(
        "⚠️ Votre navigateur ne supporte pas la reconnaissance vocale.\n\n" +
        "Utilisez Chrome, Edge ou Safari sur Mac."
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = 'fr-FR';
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);

      // Si phrase finale détectée, envoyer à Gemini
      if (finalTranscript) {
        handleUserSpeech(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      
      if (event.error === 'not-allowed') {
        setError(
          "⚠️ Accès au microphone refusé.\n\n" +
          "Autorisez le microphone dans votre navigateur."
        );
      } else if (event.error === 'no-speech') {
        // Relancer automatiquement
        recognition.start();
      }
    };

    recognition.onend = () => {
      if (isListening) {
        recognition.start(); // Relancer automatiquement
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      window.speechSynthesis.cancel();
    };
  }, [systemInstruction]);

  // Démarrer l'écoute automatiquement après le message de bienvenue
  useEffect(() => {
    if (messages.length > 0 && !isListening && recognitionRef.current) {
      setTimeout(() => {
        startListening();
      }, 2000); // 2 secondes après le message de bienvenue
    }
  }, [messages]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Erreur démarrage reconnaissance", err);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleUserSpeech = async (userText: string) => {
    if (!userText.trim() || !chatRef.current) return;

    // Arrêter l'écoute pendant la réponse
    stopListening();
    setTranscript('');

    // Ajouter message utilisateur
    setMessages(prev => [...prev, { role: 'user', text: userText }]);

    try {
      // Envoyer à Gemini
      const result = await chatRef.current.sendMessageStream({ message: userText });
      
      let fullResponse = '';
      for await (const chunk of result) {
        fullResponse += chunk.text;
      }

      // Nettoyer la réponse
      fullResponse = fullResponse.replace(/\[PRATIQUE\]/g, '').trim();

      // Ajouter réponse du modèle
      setMessages(prev => [...prev, { role: 'model', text: fullResponse }]);

      // Parler la réponse
      await speak(fullResponse);

      // Redémarrer l'écoute
      setTimeout(() => {
        startListening();
      }, 500);

    } catch (err) {
      console.error("Erreur Gemini", err);
      setError("Erreur lors de la génération de la réponse.");
      startListening(); // Redémarrer quand même
    }
  };

  const speak = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      window.speechSynthesis.cancel();
      
      const cleanText = text.replace(/\*\*/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'fr-FR';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Essayer de trouver une voix française
      const voices = window.speechSynthesis.getVoices();
      const frenchVoice = voices.find(v => v.lang === 'fr-FR') || voices[0];
      if (frenchVoice) utterance.voice = frenchVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        resolve();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-95 z-50 flex flex-col items-center justify-center text-white p-4">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold mb-2">🎤 Conversation Orale</h2>
        <p className="text-gray-300 text-lg">Pratiquez le français à l'oral avec LinguaCompagnon</p>
        <p className="text-sm text-gray-400 mt-2">
          💡 L'agent va vous parler, puis vous écouter. Conversez naturellement !
        </p>
      </div>

      {error ? (
          <div className="bg-red-500/20 border border-red-500 text-red-100 px-6 py-4 rounded mb-6 max-w-md text-center whitespace-pre-line">
              {error}
          </div>
      ) : (
        <div className="flex flex-col items-center">
          {/* Animation visuelle */}
          <div className="relative w-48 h-48 flex items-center justify-center mb-8">
            {isListening && (
              <>
                <div className="absolute inset-0 rounded-full border-2 border-brand-green opacity-50 animate-ping" />
                <div className="absolute inset-4 rounded-full border-2 border-brand-green opacity-30 animate-pulse" />
              </>
            )}
            
            <div className={`w-32 h-32 rounded-full bg-gray-800 flex items-center justify-center shadow-lg z-10 border-4 ${
              isSpeaking ? 'border-blue-500 animate-pulse' : 
              isListening ? 'border-brand-green' : 'border-gray-600'
            }`}>
              <BotIcon className={`w-16 h-16 ${
                isSpeaking ? 'text-blue-500' : 
                isListening ? 'text-brand-green' : 'text-gray-500'
              }`} />
            </div>
          </div>

          {/* État - Plus clair */}
          <div className="text-center mb-6">
            {isSpeaking && (
              <div className="text-blue-400 font-medium text-lg animate-pulse">
                🗣️ LinguaCompagnon parle...
              </div>
            )}
            {isListening && !isSpeaking && !transcript && (
              <div className="text-brand-green font-medium text-lg animate-pulse">
                👂 J'écoute... Parlez maintenant !
              </div>
            )}
            {isListening && !isSpeaking && transcript && (
              <div className="text-yellow-400 font-medium text-lg animate-pulse">
                ✍️ Je vous entends...
              </div>
            )}
            {!isListening && !isSpeaking && (
              <div className="text-gray-400 font-medium text-lg">
                ⏸️ Session en pause
              </div>
            )}
          </div>

          {/* Transcript en temps réel - Plus visible */}
          {transcript && (
            <div className="bg-brand-green/20 border-2 border-brand-green rounded-lg p-4 mb-6 max-w-md">
              <p className="text-xs uppercase text-brand-green font-semibold mb-1">Vous dites :</p>
              <p className="text-base text-white font-medium">"{transcript}"</p>
            </div>
          )}

          {/* Historique des messages - SEULEMENT l'apprenant */}
          {messages.filter(m => m.role === 'user').length > 0 && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-6 max-w-md max-h-64 overflow-y-auto">
              <h3 className="text-xs uppercase text-gray-400 mb-3">Vos messages</h3>
              {messages.filter(m => m.role === 'user').slice(-5).map((msg, i) => (
                <div key={i} className="mb-3 text-right">
                  <div className="inline-block px-3 py-2 rounded-lg text-sm bg-brand-green text-white">
                    {msg.text}
                  </div>
                </div>
              ))}
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

export default LiveSessionAlternative;