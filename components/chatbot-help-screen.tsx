'use client';

import { useState } from 'react';
import { Send, MessageCircle, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Message {
  id: number;
  type: 'user' | 'bot';
  text: string;
  timestamp: string;
}

export function ChatbotHelpScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      type: 'bot',
      text: 'Namaste! Welcome to Smart Farm Help. How can I assist you today?',
      timestamp: '10:30 AM',
    },
  ]);

  const [inputValue, setInputValue] = useState('');
  const [language, setLanguage] = useState<'en' | 'hi' | 'mr'>('en');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const quickQuestions = {
    en: [
      'How to control valves?',
      'Check battery status',
      'Why is there a power cut alert?',
      'How to schedule irrigation?',
    ],
    hi: [
      'वाल्व को कैसे नियंत्रित करें?',
      'बैटरी स्थिति जांचें',
      'पावर कट अलर्ट क्यों है?',
      'सिंचाई कैसे शेड्यूल करें?',
    ],
    mr: [
      'व्हॉल्व्हस कसे नियंत्रित करायचे?',
      'बॅटरी स्थिती तपासा',
      'पॉवर कट अलर्ट का आहे?',
      'सिंचन कसे शेड्यूल करायचे?',
    ],
  };

  const botResponses: Record<string, Record<string, string>> = {
    en: {
      'How to control valves?': 'Go to the Valves tab to toggle individual valves on or off. Each valve can be controlled independently.',
      'Check battery status': 'Visit the Battery tab to view the current battery percentage, daily cycles used, and charging status.',
      'Why is there a power cut alert?': 'The system is running on battery backup due to a power outage. The system will switch back to main power when available.',
      'How to schedule irrigation?': 'Use the scheduling feature in Settings to set automatic irrigation times for each field.',
    },
    hi: {
      'वाल्व को कैसे नियंत्रित करें?': 'वाल्वेस टैब में जाएं और प्रत्येक वाल्व को व्यक्तिगत रूप से चालू या बंद करें।',
      'बैटरी स्थिति जांचें': 'बैटरी टैब पर जाएं और वर्तमान बैटरी प्रतिशत देखें।',
      'पावर कट अलर्ट क्यों है?': 'सिस्टम पावर आउटेज के कारण बैटरी बैकअप पर चल रहा है।',
      'सिंचाई कैसे शेड्यूल करें?': 'सेटिंग्स में शेड्यूलिंग फीचर का उपयोग करें।',
    },
    mr: {
      'व्हॉल्व्हस कसे नियंत्रित करायचे?': 'व्हॉल्व्हस टॅब वर जाऊन प्रत्येक व्हॉल्व्ह चालू किंवा बंद करा।',
      'बॅटरी स्थिती तपासा': 'बॅटरी टॅब वर जाऊन वर्तमान बॅटरी टक्के पहा।',
      'पॉवर कट अलर्ट का आहे?': 'पॉवर आउटेजमुळे सिस्टम बॅटरी बॅकअपवर चालू आहे।',
      'सिंचन कसे शेड्यूल करायचे?': 'सेटिंग्समध्ये शेड्यूलिंग फीचर वापरा।',
    },
  };

  const handleQuickQuestion = (question: string) => {
    const newUserMessage: Message = {
      id: messages.length + 1,
      type: 'user',
      text: question,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([...messages, newUserMessage]);

    setTimeout(() => {
      const response = botResponses[language][question as keyof typeof botResponses['en']] || 'I understand your question. How can I help you further?';
      const newBotMessage: Message = {
        id: messages.length + 2,
        type: 'bot',
        text: response,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, newBotMessage]);
    }, 500);

    setInputValue('');
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const newUserMessage: Message = {
      id: messages.length + 1,
      type: 'user',
      text: inputValue,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([...messages, newUserMessage]);

    setTimeout(() => {
      const newBotMessage: Message = {
        id: messages.length + 2,
        type: 'bot',
        text: 'Thank you for your question. Our support team will respond shortly.',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, newBotMessage]);
    }, 500);

    setInputValue('');
  };

  return (
    <div className="bg-[#F4F8F4] flex flex-col h-screen pb-24">
      {/* Header */}
      <div className="bg-[#2E7D32] text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Help Center</h1>
          <p className="text-white text-opacity-80 text-xs mt-1">AI-Powered Support</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-xl px-3 py-2 flex items-center gap-1"
          >
            <Globe className="w-4 h-4" />
            <span className="text-sm font-medium">{language.toUpperCase()}</span>
          </button>

          {showLanguageMenu && (
            <div className="absolute right-0 mt-2 bg-white rounded-xl shadow-lg z-10">
              {(['en', 'hi', 'mr'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    setLanguage(lang);
                    setShowLanguageMenu(false);
                  }}
                  className={`block w-full text-left px-4 py-2 text-sm ${
                    language === lang ? 'bg-[#E8F5E9] text-[#2E7D32] font-semibold' : 'text-[#263238]'
                  } hover:bg-[#F4F8F4]`}
                >
                  {lang === 'en' ? 'English' : lang === 'hi' ? 'हिंदी' : 'मराठी'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs rounded-2xl px-4 py-3 ${
                message.type === 'user'
                  ? 'bg-[#2E7D32] text-white rounded-br-none'
                  : 'bg-white text-[#263238] border border-[#E8EFE8] rounded-bl-none'
              }`}
            >
              <p className="text-sm">{message.text}</p>
              <p
                className={`text-xs mt-1 ${
                  message.type === 'user' ? 'text-white text-opacity-70' : 'text-[#90A4AE]'
                }`}
              >
                {message.timestamp}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Questions */}
      {messages.length === 1 && (
        <div className="px-4 py-4 bg-white border-t border-[#E8EFE8]">
          <p className="text-xs font-semibold text-[#90A4AE] mb-3 uppercase">Frequently Asked</p>
          <div className="space-y-2">
            {quickQuestions[language].map((question, index) => (
              <button
                key={index}
                onClick={() => handleQuickQuestion(question)}
                className="w-full text-left bg-[#F4F8F4] hover:bg-[#E8EFE8] rounded-xl px-4 py-3 text-sm text-[#263238] font-medium transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-[#E8EFE8] bg-white px-4 py-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
            placeholder="Ask a question..."
            className="flex-1 bg-[#F4F8F4] rounded-full px-4 py-3 text-sm text-[#263238] outline-none placeholder-[#90A4AE]"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            className="bg-[#2E7D32] hover:bg-[#1B5E20] disabled:bg-[#E8EFE8] text-white disabled:text-[#90A4AE] rounded-full p-3 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
