"use client";
// components/ChatBot.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Full working chatbot with:
// - Continuous quick-action suggestion buttons that refresh after each answer
// - Streaming-style typewriter effect for answers
// - Remembers last 6 messages for context
// - Farming-specific suggestions based on current language
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from "react";
import { useAuth } from '../app/context/AuthContext';
import { useLanguage } from '../app/context/LanguageContext';

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

// Suggestions that rotate based on conversation
const SUGGESTION_SETS: Record<string, string[][]> = {
  en: [
    ["How many valves are open?", "What is today's water usage?", "Is the temperature safe for crops?", "How is my battery?"],
    ["Should I water now?", "Which valve is using most water?", "When should I close the valves?", "Battery health status?"],
    ["Set a watering schedule", "How to save water today?", "Temperature advice for wheat", "Check all valve status"],
    ["Is the soil moist enough?", "How much water is left in tank?", "Valve 1 status", "Power outage alert?"],
  ],
  hi: [
    ["कितने वाल्व खुले हैं?", "आज का पानी उपयोग?", "तापमान फसल के लिए सुरक्षित है?", "बैटरी कैसी है?"],
    ["अभी पानी देना चाहिए?", "कौन सा वाल्व सबसे ज्यादा पानी ले रहा है?", "वाल्व कब बंद करें?", "बैटरी की स्थिति?"],
  ],
  mr: [
    ["किती झडपा उघड्या आहेत?", "आजचा पाणी वापर?", "तापमान पिकासाठी सुरक्षित आहे का?", "बॅटरी कशी आहे?"],
    ["आत्ता पाणी द्यावे का?", "टाकीत किती पाणी शिल्लक आहे?", "झडप 1 ची स्थिती", "वीज खंडित झाली का?"],
  ],
};

function getSuggestions(language: string, index: number): string[] {
  const sets = SUGGESTION_SETS[language] ?? SUGGESTION_SETS.en;
  return sets[index % sets.length];
}

export default function ChatBot({ deviceId }: { deviceId: string }) {
  const { idToken } = useAuth();
  const { t, language } = useLanguage();

  const [messages, setMessages]     = useState<Message[]>([]);
  const [input, setInput]           = useState("");
  const [isTyping, setIsTyping]     = useState(false);
  const [suggestionSet, setSuggSet] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Welcome message on first load
  useEffect(() => {
    setMessages([{
      role: "assistant",
      content: language === "hi"
        ? "नमस्ते! मैं आपका स्मार्ट फार्म सहायक हूँ। आप मुझसे अपने वाल्व, तापमान, पानी के उपयोग या बैटरी के बारे में पूछ सकते हैं।"
        : language === "mr"
        ? "नमस्कार! मी तुमचा स्मार्ट फार्म सहाय्यक आहे. तुम्ही मला वाल्व, तापमान, पाणी वापर किंवा बॅटरीबद्दल विचारू शकता."
        : "Hello! I'm your Smart Farm assistant. Ask me about your valves, temperature, water usage, or battery health.",
      timestamp: Date.now(),
    }]);
  }, [language]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = async (text: string) => {
    const userMsg = text.trim();
    if (!userMsg || isTyping) return;
    setInput("");

    const userMessage: Message = { role: "user", content: userMsg, timestamp: Date.now() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          deviceId,
          message: userMsg,
          history: updatedMessages.slice(-6),
          language,
        }),
      });

      const data = await res.json();
      const reply = data.reply ?? "Sorry, I could not get a response. Please try again.";

      // Typewriter effect — adds characters one by one
      await typewriterEffect(reply, updatedMessages);
      setSuggSet(s => s + 1); // Rotate suggestions after each answer

    } catch {
      setMessages(m => [...m, {
        role: "assistant",
        content: "Network error. Please check your connection.",
        timestamp: Date.now(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const typewriterEffect = async (fullText: string, prevMessages: Message[]) => {
    const assistantMsg: Message = { role: "assistant", content: "", timestamp: Date.now() };
    setMessages([...prevMessages, assistantMsg]);

    for (let i = 0; i <= fullText.length; i++) {
      await new Promise(r => setTimeout(r, 12)); // 12ms per character
      setMessages(msgs => {
        const updated = [...msgs];
        updated[updated.length - 1] = {
          ...assistantMsg,
          content: fullText.slice(0, i),
        };
        return updated;
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm mr-2 flex-shrink-0 mt-1">
                🌾
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-green-600 text-white rounded-br-none"
                  : "bg-white text-gray-800 shadow-sm rounded-bl-none"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm">🌾</div>
            <div className="bg-white rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick suggestion buttons — always visible, rotate after each answer */}
      {!isTyping && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-400 mb-2">{t("chatSuggestions")}</p>
          <div className="flex flex-wrap gap-2">
            {getSuggestions(language, suggestionSet).map((s, i) => (
              <button
                key={i}
                onClick={() => sendMessage(s)}
                className="bg-green-50 border border-green-200 text-green-700 text-xs rounded-full px-3 py-1.5 hover:bg-green-100 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="p-4 bg-white border-t border-gray-100 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("chatPlaceholder")}
          disabled={isTyping}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:bg-gray-50"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={isTyping || !input.trim()}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-xl px-4 py-2.5 font-medium text-sm transition-colors"
        >
          {t("chatSend")}
        </button>
      </div>
    </div>
  );
}
