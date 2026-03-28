'use client';

import { useState } from 'react';
import { Globe, Check } from 'lucide-react';
import { languages, Language } from '@/lib/i18n';
import { useLanguage } from '@/app/context/LanguageContext';

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
    setIsOpen(false);
  };

  return (
    <div>
      {/* Language Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors duration-200"
        aria-label="Select Language"
        title="Select Language"
      >
        <Globe className="w-6 h-6 text-white" />
      </button>

      {/* Language Selector Modal */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal */}
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-lg z-50 animate-in slide-in-from-bottom-5 duration-300">
            <div className="max-w-md mx-auto p-6">
              {/* Header */}
              <h2 className="text-xl font-bold text-[#263238] mb-6">Select Language</h2>

              {/* Language List */}
              <div className="space-y-3">
                {(Object.entries(languages) as [Language, typeof languages[Language]][]).map(
                  ([code, lang]) => (
                    <button
                      key={code}
                      onClick={() => handleLanguageSelect(code)}
                      className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all duration-200 ${
                        language === code
                          ? 'bg-[#E8F5E9] border-2 border-[#2E7D32]'
                          : 'bg-[#F4F8F4] border-2 border-transparent hover:bg-[#E8EFE8]'
                      }`}
                    >
                      <div className="text-left">
                        <p className="font-semibold text-[#263238]">{lang.nativeName}</p>
                        <p className="text-sm text-[#90A4AE]">{lang.name}</p>
                      </div>
                      {language === code && (
                        <Check className="w-6 h-6 text-[#2E7D32]" />
                      )}
                    </button>
                  )
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="w-full mt-6 py-3 bg-[#2E7D32] text-white rounded-xl font-semibold hover:bg-[#1B5E20] transition-colors duration-200"
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
