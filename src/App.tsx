
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { Chat, GenerateContentResponse } from '@google/genai';
import type { ChatMessage } from './types';
import { getSystemPrompt } from './services/geminiService';
import ChatMessageComponent from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import WeekSelector from './components/WeekSelector';

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize chat when week changes
  useEffect(() => {
    startNewChat(currentWeek);
  }, [currentWeek]);

  const startNewChat = (week: number) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const systemInstruction = getSystemPrompt(week);

    chatSessionRef.current = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    setMessages([{
      id: 'init',
      role: 'model',
      text: getInitialGreeting(week),
    }]);
  };

  const getInitialGreeting = (week: number) => {
    return `Bonjour ! Nous sommes à la semaine ${week}. Comment allez-vous aujourd'hui ?`;
  };

  const handleSendMessage = async (text: string) => {
    if (!chatSessionRef.current) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: text,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const result = await chatSessionRef.current.sendMessageStream({ message: text });

      const botMessageId = (Date.now() + 1).toString();
      let fullText = '';

      // Add placeholder message
      setMessages(prev => [...prev, {
        id: botMessageId,
        role: 'model',
        text: '',
      }]);

      for await (const chunk of result) {
        const content = chunk as GenerateContentResponse;
        const chunkText = content.text || '';
        fullText += chunkText;

        let displayText = fullText;
        let currentHasPractice = false;

        if (displayText.includes('[PRATIQUE]')) {
             displayText = displayText.replace('[PRATIQUE]', '').trim();
             currentHasPractice = true;
        }

        setMessages(prev => prev.map(msg =>
          msg.id === botMessageId
            ? { ...msg, text: displayText, hasPractice: currentHasPractice }
            : msg
        ));
      }

    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "Désolé, une erreur s'est produite. Veuillez réessayer.",
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePractice = (messageId: string) => {
    handleSendMessage("C'est noté. Pourriez-vous me donner un exercice de 5 phrases pour pratiquer ce point de grammaire ou de conjugaison ?");
  };

  const handleSpeak = (text: string, messageId: string) => {
    if (isSpeaking && speakingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    };

    setIsSpeaking(true);
    setSpeakingMessageId(messageId);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-md mx-auto shadow-2xl overflow-hidden border-x border-gray-200">
      <header className="bg-brand-green text-white p-4 shadow-md z-10">
        <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-brand-green font-bold text-xl shadow-sm">
                LC
            </div>
            <div>
                <h1 className="text-lg font-bold">LinguaCompagnon</h1>
                <p className="text-xs opacity-90">Votre tuteur de français IA</p>
            </div>
        </div>
        <WeekSelector currentWeek={currentWeek} onWeekChange={setCurrentWeek} />
      </header>

      <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50 scroll-smooth">
        {messages.map((msg) => (
          <ChatMessageComponent
            key={msg.id}
            message={msg}
            onSpeak={handleSpeak}
            onPractice={handlePractice}
            isSpeaking={isSpeaking && speakingMessageId === msg.id}
          />
        ))}
        {isLoading && (
            <div className="flex items-center gap-2 text-gray-500 text-sm ml-2 animate-pulse">
                <span>LinguaCompagnon est en train d'écrire...</span>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};

export default App;
