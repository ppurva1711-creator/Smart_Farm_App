'use client';
import { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, Zap, Droplet, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '../app/context/LanguageContext';
import type { Language } from '../app/context/LanguageContext';

// All text in all 6 languages
const T: Record<string, Record<Language, string>> = {
  title:          { en: "Notifications",              hi: "सूचनाएं",              mr: "सूचना",                pa: "ਸੂਚਨਾਵਾਂ",             te: "నోటిఫికేషన్లు",        ta: "அறிவிப்புகள்" },
  subtitle:       { en: "System alerts and updates",  hi: "सिस्टम अलर्ट",         mr: "सिस्टम अलर्ट",         pa: "ਸਿਸਟਮ ਅਲਰਟ",            te: "సిస్టమ్ హెచ్చరికలు",   ta: "கணினி எச்சரிக்கைகள்" },
  clearAll:       { en: "Clear All Notifications",    hi: "सभी सूचनाएं हटाएं",    mr: "सर्व सूचना हटवा",      pa: "ਸਾਰੀਆਂ ਸੂਚਨਾਵਾਂ ਹਟਾਓ", te: "అన్ని నోటిఫికేషన్లు",  ta: "அனைத்தையும் அழி" },
  noAlerts:       { en: "No alerts",                  hi: "कोई अलर्ट नहीं",       mr: "कोणते अलर्ट नाहीत",    pa: "ਕੋਈ ਅਲਰਟ ਨਹੀਂ",         te: "హెచ్చరికలు లేవు",      ta: "எச்சரிக்கைகள் இல்லை" },
  allNormal:      { en: "All systems normal",         hi: "सभी सिस्टम सामान्य",   mr: "सर्व प्रणाली सामान्य", pa: "ਸਾਰੇ ਸਿਸਟਮ ਸਾਧਾਰਨ",    te: "అన్నీ సాధారణంగా ఉన్నాయి", ta: "அனைத்தும் சாதாரணம்" },
  minsAgo:        { en: "minutes ago",                hi: "मिनट पहले",            mr: "मिनिटांपूर्वी",         pa: "ਮਿੰਟ ਪਹਿਲਾਂ",           te: "నిమిషాల క్రితం",       ta: "நிமிடங்கள் முன்பு" },
  hourAgo:        { en: "hour ago",                   hi: "घंटे पहले",            mr: "तास पूर्वी",            pa: "ਘੰਟਾ ਪਹਿਲਾਂ",           te: "గంట క్రితం",           ta: "மணி நேரம் முன்பு" },
  hoursAgo:       { en: "hours ago",                  hi: "घंटे पहले",            mr: "तास पूर्वी",            pa: "ਘੰਟੇ ਪਹਿਲਾਂ",           te: "గంటల క్రితం",          ta: "மணி நேரங்கள் முன்பு" },
  dayAgo:         { en: "day ago",                    hi: "दिन पहले",             mr: "दिवसापूर्वी",           pa: "ਦਿਨ ਪਹਿਲਾਂ",            te: "రోజు క్రితం",          ta: "நாள் முன்பு" },
  daysAgo:        { en: "days ago",                   hi: "दिन पहले",             mr: "दिवसांपूर्वी",          pa: "ਦਿਨ ਪਹਿਲਾਂ",            te: "రోజుల క్రితం",         ta: "நாட்கள் முன்பு" },
  // Alert titles
  powerCut:       { en: "Power Cut Alert",            hi: "बिजली कटौती अलर्ट",    mr: "वीज कपात अलर्ट",       pa: "ਬਿਜਲੀ ਕੱਟ ਅਲਰਟ",        te: "విద్యుత్ కోత హెచ్చరిక", ta: "மின்சார வெட்டு எச்சரிக்கை" },
  powerCutMsg:    { en: "System on battery backup",   hi: "बैटरी बैकअप पर चल रहा", mr: "बॅटरी बॅकअपवर चालू",  pa: "ਬੈਟਰੀ ਬੈਕਅੱਪ ਤੇ",       te: "బ్యాటరీ బ్యాకప్‌లో",   ta: "பேட்டரி காப்புப்பிரதியில்" },
  valveError:     { en: "Valve Error - North Field",  hi: "वाल्व त्रुटि - उत्तर",  mr: "झडप त्रुटी - उत्तर",   pa: "ਵਾਲਵ ਗਲਤੀ - ਉੱਤਰ",      te: "వాల్వ్ లోపం - ఉత్తరం",  ta: "வால்வு பிழை - வடக்கு" },
  valveErrorMsg:  { en: "Valve 1 not responding",     hi: "वाल्व 1 प्रतिक्रिया नहीं", mr: "झडप 1 प्रतिसाद देत नाही", pa: "ਵਾਲਵ 1 ਜਵਾਬ ਨਹੀਂ",   te: "వాల్వ్ 1 స్పందించడం లేదు", ta: "வால்வு 1 பதிலளிக்கவில்லை" },
  battCycle:      { en: "Battery Cycle Limit",        hi: "बैटरी साइकिल सीमा",     mr: "बॅटरी सायकल मर्यादा",  pa: "ਬੈਟਰੀ ਸਾਈਕਲ ਸੀਮਾ",      te: "బ్యాటరీ చక్రం పరిమితి", ta: "பேட்டரி சுழற்சி வரம்பு" },
  battCycleMsg:   { en: "3 of 4 daily cycles used",   hi: "4 में से 3 चक्र हुए",   mr: "4 पैकी 3 चक्र झाले",   pa: "4 ਵਿੱਚੋਂ 3 ਚੱਕਰ ਹੋਏ",   te: "4లో 3 చక్రాలు వాడారు",  ta: "4 இல் 3 சுழற்சிகள் பயன்படுத்தப்பட்டன" },
  soilMoisture:   { en: "High Soil Moisture",         hi: "अधिक मिट्टी नमी",       mr: "जास्त माती आर्द्रता",  pa: "ਜ਼ਿਆਦਾ ਮਿੱਟੀ ਨਮੀ",      te: "అధిక నేల తేమ",          ta: "அதிக மண் ஈரப்பதம்" },
  soilMsg:        { en: "East Field moisture high",   hi: "पूर्व खेत में नमी अधिक", mr: "पूर्व शेतात आर्द्रता जास्त", pa: "ਪੂਰਬੀ ਖੇਤ ਵਿੱਚ ਨਮੀ ਜ਼ਿਆਦਾ", te: "తూర్పు పొలంలో తేమ ఎక్కువ", ta: "கிழக்கு வயலில் ஈரப்பதம் அதிகம்" },
  valveActiv:     { en: "Valve Activated",            hi: "वाल्व सक्रिय",          mr: "झडप सक्रिय",           pa: "ਵਾਲਵ ਸਕਿਰਿਆ",           te: "వాల్వ్ యాక్టివేట్",     ta: "வால்வு இயக்கப்பட்டது" },
  valveActivMsg:  { en: "South Field valve activated", hi: "दक्षिण खेत वाल्व सक्रिय", mr: "दक्षिण शेत झडप सक्रिय", pa: "ਦੱਖਣੀ ਖੇਤ ਵਾਲਵ ਸਕਿਰਿਆ", te: "దక్షిణ పొలం వాల్వ్",   ta: "தெற்கு வயல் வால்வு" },
  sysUpdate:      { en: "System Update",              hi: "सिस्टम अपडेट",          mr: "सिस्टम अपडेट",          pa: "ਸਿਸਟਮ ਅਪਡੇਟ",           te: "సిస్టమ్ అప్‌డేట్",      ta: "கணினி புதுப்பிப்பு" },
  sysUpdateMsg:   { en: "Firmware updated to v2.5.1", hi: "फर्मवेयर v2.5.1 अपडेट", mr: "फर्मवेअर v2.5.1 अपडेट", pa: "ਫਰਮਵੇਅਰ v2.5.1 ਅਪਡੇਟ", te: "ఫర్మ్‌వేర్ v2.5.1",      ta: "ஃபார்ம்வேர் v2.5.1" },
};

function tl(key: string, lang: Language): string {
  return T[key]?.[lang] ?? T[key]?.en ?? key;
}

interface Alert {
  id: number;
  type: 'error' | 'warning' | 'info';
  titleKey: string;
  messageKey: string;
  timestampKey: string;
  timestampNum: string;
  icon: React.ReactNode;
  iconBg: string;
}

export function AlertsScreen() {
  const { language } = useLanguage();

  const [alerts, setAlerts] = useState<Alert[]>([
    { id: 1, type: 'error',   titleKey: 'powerCut',    messageKey: 'powerCutMsg',   timestampKey: 'minsAgo',  timestampNum: '2',  icon: <AlertTriangle className="w-6 h-6" />, iconBg: 'bg-[#FFEBEE]' },
    { id: 2, type: 'error',   titleKey: 'valveError',  messageKey: 'valveErrorMsg', timestampKey: 'hourAgo',  timestampNum: '1',  icon: <Droplet className="w-6 h-6" />,       iconBg: 'bg-[#FCE4EC]' },
    { id: 3, type: 'warning', titleKey: 'battCycle',   messageKey: 'battCycleMsg',  timestampKey: 'hoursAgo', timestampNum: '3',  icon: <Zap className="w-6 h-6" />,           iconBg: 'bg-[#FFF3E0]' },
    { id: 4, type: 'warning', titleKey: 'soilMoisture',messageKey: 'soilMsg',       timestampKey: 'hoursAgo', timestampNum: '5',  icon: <AlertCircle className="w-6 h-6" />,   iconBg: 'bg-[#FFF3E0]' },
    { id: 5, type: 'info',    titleKey: 'valveActiv',  messageKey: 'valveActivMsg', timestampKey: 'dayAgo',   timestampNum: '1',  icon: <Info className="w-6 h-6" />,          iconBg: 'bg-[#E3F2FD]' },
    { id: 6, type: 'info',    titleKey: 'sysUpdate',   messageKey: 'sysUpdateMsg',  timestampKey: 'daysAgo',  timestampNum: '2',  icon: <Info className="w-6 h-6" />,          iconBg: 'bg-[#E3F2FD]' },
  ]);

  const getAlertStyles = (type: 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'error':   return { border: 'border-[#FFCDD2]', iconColor: 'text-[#E53935]' };
      case 'warning': return { border: 'border-[#FFE0B2]', iconColor: 'text-[#F57C00]' };
      case 'info':    return { border: 'border-[#BBDEFB]', iconColor: 'text-[#1565C0]' };
    }
  };

  const deleteAlert = (id: number) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const clearAll = () => setAlerts([]);

  return (
    <div className="bg-[#F4F8F4] min-h-screen pb-24">
      {/* Header */}
      <div className="bg-[#2E7D32] text-white px-6 py-6">
        <h1 className="text-2xl font-bold">{tl("title", language)}</h1>
        <p className="text-white text-opacity-80 text-sm mt-1">{tl("subtitle", language)}</p>
      </div>

      {/* Alerts List */}
      <div className="px-4 py-6">
        {alerts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center">
            <Info className="w-12 h-12 text-[#90A4AE] mx-auto mb-3" />
            <p className="text-[#263238] font-medium">{tl("noAlerts", language)}</p>
            <p className="text-[#90A4AE] text-sm mt-1">{tl("allNormal", language)}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const styles = getAlertStyles(alert.type);
              return (
                <div key={alert.id} className={`bg-white border-l-4 rounded-2xl p-4 ${styles.border}`}>
                  <div className="flex items-start gap-4">
                    <div className={`rounded-xl p-3 flex-shrink-0 ${alert.iconBg}`}>
                      <div className={styles.iconColor}>{alert.icon}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#263238] text-sm">
                        {tl(alert.titleKey, language)}
                      </h3>
                      <p className="text-[#90A4AE] text-xs mt-1">
                        {tl(alert.messageKey, language)}
                      </p>
                      <p className="text-[#90A4AE] text-xs mt-2">
                        {alert.timestampNum} {tl(alert.timestampKey, language)}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteAlert(alert.id)}
                      className="text-[#90A4AE] hover:text-[#E53935] flex-shrink-0 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Clear All */}
      {alerts.length > 0 && (
        <div className="px-4 pb-24">
          <Button
            onClick={clearAll}
            className="w-full bg-white border-2 border-[#E8EFE8] text-[#263238] hover:bg-[#F4F8F4] h-12 rounded-2xl font-semibold"
          >
            {tl("clearAll", language)}
          </Button>
        </div>
      )}
    </div>
  );
}
