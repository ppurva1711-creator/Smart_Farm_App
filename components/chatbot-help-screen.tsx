"use client";
// components/chatbot-help-screen.tsx — Updated with Android bridge

import { useState, useRef, useEffect } from "react";
import { useLanguage } from "../app/context/LanguageContext";
import { useAndroidBridge } from "../hooks/useAndroidBridge";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

const SUGGESTION_SETS: Record<string, string[][]> = {
  en: [
    ["How many valves are open?", "Today's water usage?", "Is temperature safe?", "Battery health?"],
    ["Should I water now?", "Which valve uses most water?", "Tank level?", "Power status?"],
    ["How to save water?", "Temperature advice", "All valve status", "Check battery"],
  ],
  hi: [
    ["कितने वाल्व खुले हैं?", "आज का पानी उपयोग?", "तापमान सुरक्षित है?", "बैटरी कैसी है?"],
    ["अभी पानी देना चाहिए?", "टंकी में कितना पानी?", "सभी वाल्व स्थिति?", "बैटरी जांचें"],
  ],
  mr: [
    ["किती झडपा उघड्या?", "आजचा पाणी वापर?", "तापमान सुरक्षित आहे का?", "बॅटरी कशी आहे?"],
    ["आत्ता पाणी द्यावे का?", "टाकीत किती पाणी?", "सर्व झडप स्थिती?", "बॅटरी तपासा"],
  ],
  pa: [
    ["ਕਿੰਨੇ ਵਾਲਵ ਖੁੱਲ੍ਹੇ?", "ਅੱਜ ਪਾਣੀ ਵਰਤੋਂ?", "ਤਾਪਮਾਨ ਸੁਰੱਖਿਅਤ?", "ਬੈਟਰੀ ਸਥਿਤੀ?"],
  ],
  te: [
    ["ఎన్ని వాల్వులు తెరిచి?", "నేటి నీటి వినియోగం?", "ఉష్ణోగ్రత సురక్షితమా?", "బ్యాటరీ ఆరోగ్యం?"],
  ],
  ta: [
    ["எத்தனை வால்வுகள் திறந்த?", "இன்றைய நீர் பயன்பாடு?", "வெப்பநிலை பாதுகாப்பானதா?", "பேட்டரி நிலை?"],
  ],
};

function getSuggestions(language: string, index: number): string[] {
  const sets = SUGGESTION_SETS[language] ?? SUGGESTION_SETS.en;
  return sets[index % sets.length];
}

export default function ChatbotHelpScreen() {
  const { t, language } = useLanguage();
  const bridge          = useAndroidBridge();

  const deviceId = typeof window !== 'undefined'
    ? (localStorage.getItem('sf_device_id') || bridge.getAndroidDeviceId())
    : '';

  const [messages, setMessages]   = useState<Message[]>([]);
  const [input,    setInput]      = useState("");
  const [isTyping, setIsTyping]   = useState(false);
  const [suggSet,  setSuggSet]    = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const welcome: Record<string, string> = {
      en: "Hello! I'm your Smart Farm assistant. Ask about valves, temperature, water usage, or battery.",
      hi: "नमस्ते! मैं आपका स्मार्ट फार्म सहायक हूँ। वाल्व, तापमान, पानी या बैटरी के बारे में पूछें।",
      mr: "नमस्कार! मी तुमचा स्मार्ट फार्म सहाय्यक आहे. झडप, तापमान, पाणी किंवा बॅटरीबद्दल विचारा.",
      pa: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਤੁਹਾਡਾ ਸਮਾਰਟ ਫਾਰਮ ਸਹਾਇਕ ਹਾਂ।",
      te: "నమస్కారం! నేను మీ స్మార్ట్ ఫార్మ్ సహాయకుడిని.",
      ta: "வணக்கம்! நான் உங்கள் ஸ்மார்ட் ஃபார்ம் உதவியாளர்.",
    };
    setMessages([{ role: "assistant", content: welcome[language] ?? welcome.en, timestamp: Date.now() }]);
  }, [language]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = async (text: string) => {
    const userMsg = text.trim();
    if (!userMsg || isTyping) return;
    setInput("");

    const userMessage: Message = { role: "user", content: userMsg, timestamp: Date.now() };
    const updated = [...messages, userMessage];
    setMessages(updated);
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, message: userMsg, history: updated.slice(-6), language }),
      });
      const data  = await res.json();
      const reply = data.reply ?? "Sorry, try again.";
      await typewriter(reply, updated);
      setSuggSet(s => s + 1);
    } catch {
      setMessages(m => [...m, { role: "assistant", content: "Network error. Check your connection.", timestamp: Date.now() }]);
    } finally {
      setIsTyping(false);
    }
  };

  const typewriter = async (fullText: string, prev: Message[]) => {
    const msg: Message = { role: "assistant", content: "", timestamp: Date.now() };
    setMessages([...prev, msg]);
    for (let i = 0; i <= fullText.length; i++) {
      await new Promise(r => setTimeout(r, 12));
      setMessages(msgs => {
        const copy = [...msgs];
        copy[copy.length - 1] = { ...msg, content: fullText.slice(0, i) };
        return copy;
      });
    }
  };

  // Share last assistant message via Android share sheet
  const handleShare = () => {
    const lastAssistant = [...messages].reverse().find(m => m.role === "assistant");
    if (lastAssistant) bridge.shareText(`Smart Farm: ${lastAssistant.content}`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-[#2E7D32] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌾</span>
          <div>
            <p className="font-semibold text-sm">{t("chat")}</p>
            <p className="text-green-200 text-xs">Smart Farm AI</p>
          </div>
        </div>
        {bridge.isAndroid && messages.length > 1 && (
          <button onClick={handleShare} className="text-white/80 text-xs border border-white/30 rounded-lg px-2 py-1">
            Share
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm mr-2 flex-shrink-0 mt-1">🌾</div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-green-600 text-white rounded-br-none"
                : "bg-white text-gray-800 shadow-sm rounded-bl-none"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white">🌾</div>
            <div className="bg-white rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex gap-1">
              {[0, 150, 300].map(d => (
                <span key={d} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {!isTyping && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-2">{t("chatSuggestions")}</p>
          <div className="flex flex-wrap gap-2">
            {getSuggestions(language, suggSet).map((s, i) => (
              <button key={i} onClick={() => sendMessage(s)}
                className="bg-green-50 border border-green-200 text-green-700 text-xs rounded-full px-3 py-1.5 hover:bg-green-100">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-100 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("chatPlaceholder")}
          disabled={isTyping}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 disabled:bg-gray-50"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={isTyping || !input.trim()}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-xl px-4 py-2.5 font-medium text-sm"
        >
          {t("chatSend")}
        </button>
      </div>
    </div>
  );
}