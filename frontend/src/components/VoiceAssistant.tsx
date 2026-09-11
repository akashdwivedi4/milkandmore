import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { api } from '../services/api';
import { parseVoiceCommand } from '../utils/voiceParser';
import {
  Mic,
  MicOff,
  Sparkles,
  X,
  Send,
  ShieldAlert,
  Volume2,
  VolumeX,
  CheckCircle2,
  Clock,
  FileText,
  Tag,
  Scan,
  Users,
  Package,
  IndianRupee,
  Languages,
} from 'lucide-react';

interface PendingSafetyAction {
  type: string;
  description: string;
  action: () => void;
}

export interface QuickCommandItem {
  label: string;
  cmd: string;
  icon: React.ComponentType<any>;
  colorClass: string;
  iconClass: string;
}

export const QUICK_COMMANDS: QuickCommandItem[] = [
  {
    label: "Today's Deliveries",
    cmd: 'Aaj ki delivery',
    icon: Clock,
    colorClass: 'text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200/70',
    iconClass: 'text-blue-600',
  },
  {
    label: 'Bills & Invoices',
    cmd: 'Bills kholo',
    icon: FileText,
    colorClass: 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200/70',
    iconClass: 'text-emerald-600',
  },
  {
    label: 'Blank QR Tags',
    cmd: 'Blank QR kholo',
    icon: Tag,
    colorClass: 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200/70',
    iconClass: 'text-amber-600',
  },
  {
    label: 'QR Scanner',
    cmd: 'QR scanner kholo',
    icon: Scan,
    colorClass: 'text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200/70',
    iconClass: 'text-purple-600',
  },
  {
    label: 'Customers',
    cmd: 'Customers kholo',
    icon: Users,
    colorClass: 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200/70',
    iconClass: 'text-indigo-600',
  },
  {
    label: 'Products & Rates',
    cmd: 'Products and rates kholo',
    icon: Package,
    colorClass: 'text-orange-700 bg-orange-50 hover:bg-orange-100 border-orange-200/70',
    iconClass: 'text-orange-600',
  },
  {
    label: 'Customer Payments',
    cmd: 'Customer payments kholo',
    icon: IndianRupee,
    colorClass: 'text-teal-700 bg-teal-50 hover:bg-teal-100 border-teal-200/70',
    iconClass: 'text-teal-600',
  },
];

export const VoiceAssistant: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastActionFeedback, setLastActionFeedback] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [lang, setLang] = useState<'hi-IN' | 'en-IN'>('hi-IN');
  const [voiceFeedbackEnabled, setVoiceFeedbackEnabled] = useState(true);
  const [suggestedExamples, setSuggestedExamples] = useState<string[]>([
    'Aaj ki delivery',
    'Bills kholo',
    'Rahul ki profile kholo',
  ]);
  const [pendingSafetyAction, setPendingSafetyAction] = useState<PendingSafetyAction | null>(null);

  const recognitionRef = useRef<any>(null);

  // Initialize SpeechRecognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = lang;

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('');
      };

      recognition.onresult = (event: any) => {
        let current = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          current += event.results[i][0].transcript;
        }
        setTranscript(current);

        // If result is final
        if (event.results[0].isFinal) {
          handleVoiceCommand(current);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          showToast('Microphone access was denied. You can type commands below.', 'error');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.error('Failed to initialize SpeechRecognition:', err);
      setSpeechSupported(false);
    }
  }, [lang]);

  // Text-To-Speech audio feedback
  const speakFeedback = (text: string) => {
    if (!voiceFeedbackEnabled) return;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Speech synthesis error:', e);
      }
    }
  };

  const toggleListening = () => {
    if (!speechSupported || !recognitionRef.current) {
      showToast('Speech recognition is not supported in this browser. Please type commands.', 'info');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setLastActionFeedback(null);
      setPendingSafetyAction(null);
      try {
        recognitionRef.current.lang = lang;
        recognitionRef.current.start();
      } catch (e) {
        console.error('Error starting recognition:', e);
      }
    }
  };

  const handleVoiceCommand = async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    setTranscript(trimmed);

    // Parse intent, entities, and actions
    const parsed = parseVoiceCommand(trimmed);

    // 1. Safety check: sensitive / destructive action confirmation
    if (parsed.requiresConfirmation && parsed.confirmationDetails) {
      setPendingSafetyAction({
        type: parsed.confirmationDetails.type,
        description: parsed.confirmationDetails.description,
        action: () => {
          if (parsed.navigationPath) {
            navigate(parsed.navigationPath);
          }
          setLastActionFeedback(parsed.feedbackText);
          showToast(parsed.feedbackText, 'info');
          speakFeedback(parsed.feedbackSpeech);
        },
      });
      setLastActionFeedback(parsed.confirmationDetails.description);
      speakFeedback(parsed.feedbackSpeech);
      return;
    }

    // 2. Customer Profile Intent (Dynamic customer resolution)
    if (parsed.intent === 'VIEW_CUSTOMER_PROFILE' && parsed.customerName) {
      try {
        const custRes = await api.getCustomers({ search: parsed.customerName, limit: 5 });
        if (custRes.success && custRes.data.length > 0) {
          const match =
            custRes.data.find(
              (c: any) => c.name.toLowerCase() === parsed.customerName!.toLowerCase()
            ) || custRes.data[0];
          navigate(`/customers/${match.id}`);
          const msg = `${match.name} की profile खोल रहा हूँ.`;
          setLastActionFeedback(msg);
          showToast(msg, 'success');
          speakFeedback(parsed.feedbackSpeech);
          return;
        }
      } catch (e) {
        console.warn('Failed to query customer for profile:', e);
      }
      navigate(`/customers?search=${encodeURIComponent(parsed.customerName)}`);
      setLastActionFeedback(`Searching customers for "${parsed.customerName}"`);
      showToast(`Searching for "${parsed.customerName}"`, 'success');
      speakFeedback(parsed.feedbackSpeech);
      return;
    }

    // 3. Customer Search Intent
    if (parsed.intent === 'SEARCH_CUSTOMER' && parsed.customerName) {
      navigate(`/customers?search=${encodeURIComponent(parsed.customerName)}`);
      setLastActionFeedback(`Searching customers for "${parsed.customerName}"`);
      showToast(`Searching for "${parsed.customerName}"`, 'success');
      speakFeedback(parsed.feedbackSpeech);
      return;
    }

    // 4. Delivery Intent without specific item details (e.g. "Rahul ko delivery do")
    if (parsed.intent === 'RECORD_DELIVERY' && parsed.customerName) {
      try {
        const custRes = await api.getCustomers({ search: parsed.customerName, limit: 5 });
        if (custRes.success && custRes.data.length > 0) {
          const match =
            custRes.data.find(
              (c: any) => c.name.toLowerCase() === parsed.customerName!.toLowerCase()
            ) || custRes.data[0];
          navigate(`/customers/${match.id}`);
          const msg = `${match.name} की delivery खोल रहा हूँ.`;
          setLastActionFeedback(msg);
          showToast(msg, 'success');
          speakFeedback(parsed.feedbackSpeech);
          return;
        }
      } catch (e) {
        console.warn('Failed to resolve customer for delivery:', e);
      }
      navigate(`/customers?search=${encodeURIComponent(parsed.customerName)}`);
      setLastActionFeedback(parsed.feedbackText);
      showToast(parsed.feedbackText, 'info');
      speakFeedback(parsed.feedbackSpeech);
      return;
    }

    // 5. Standard Navigation Intents
    if (parsed.navigationPath && parsed.intent !== 'UNKNOWN') {
      navigate(parsed.navigationPath);
      setLastActionFeedback(parsed.feedbackText);
      showToast(parsed.feedbackText, 'success');
      speakFeedback(parsed.feedbackSpeech);
      return;
    }

    // 6. Fallback for Unrecognized Commands
    setLastActionFeedback(parsed.feedbackText);
    setSuggestedExamples(parsed.examples || ['Aaj ki delivery', 'Bills kholo', 'Rahul ki profile kholo']);
    speakFeedback(parsed.feedbackSpeech);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    handleVoiceCommand(textInput);
    setTextInput('');
  };

  const executeSafetyAction = () => {
    if (pendingSafetyAction) {
      pendingSafetyAction.action();
      setPendingSafetyAction(null);
    }
  };

  return (
    <>
      {/* Floating Microphone Trigger Button */}
      <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 print:hidden">
        <button
          onClick={() => {
            setIsOpen(true);
            if (!isOpen && speechSupported) {
              setTimeout(() => toggleListening(), 200);
            }
          }}
          className={`relative p-3.5 sm:p-4 rounded-full shadow-xl transition-all flex items-center justify-center ${
            isListening
              ? 'bg-rose-600 text-white animate-pulse shadow-rose-500/40 ring-4 ring-rose-400/30'
              : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/30 hover:scale-105 active:scale-95'
          }`}
          title="Milk & More Voice Control (Hindi/English)"
          aria-label="Voice Assistant"
        >
          {isListening ? (
            <Mic className="w-5 h-5 sm:w-6 sm:h-6 animate-bounce" />
          ) : (
            <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-sky-400" />
          )}

          {/* Online badge */}
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
        </button>
      </div>

      {/* Voice Assistant Modal Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 print:hidden animate-in fade-in duration-150">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 space-y-4 border border-slate-200 shadow-2xl animate-in slide-in-from-bottom-6 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-sky-400 flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Milk & More Voice Assistant</h3>
                  <p className="text-[11px] text-slate-500">
                    Hindi, Hinglish & English natural commands
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Language Switcher Badge (hi-IN / en-IN) */}
                <button
                  type="button"
                  onClick={() => {
                    const nextLang = lang === 'hi-IN' ? 'en-IN' : 'hi-IN';
                    setLang(nextLang);
                    if (recognitionRef.current) {
                      recognitionRef.current.lang = nextLang;
                    }
                    showToast(
                      nextLang === 'hi-IN'
                        ? 'Switched speech input to Hindi / Hinglish (hi-IN)'
                        : 'Switched speech input to Indian English (en-IN)',
                      'info'
                    );
                  }}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  title="Switch recognition language"
                >
                  <Languages className="w-3.5 h-3.5 text-slate-500" />
                  <span>{lang === 'hi-IN' ? 'हिन्दी' : 'EN'}</span>
                </button>

                {/* Voice Audio Feedback Mute Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    const nextMute = !voiceFeedbackEnabled;
                    setVoiceFeedbackEnabled(nextMute);
                    showToast(
                      nextMute ? 'Voice audio response enabled' : 'Voice audio response muted',
                      'info'
                    );
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  title={voiceFeedbackEnabled ? 'Mute voice replies' : 'Unmute voice replies'}
                >
                  {voiceFeedbackEnabled ? (
                    <Volume2 className="w-4 h-4 text-sky-600" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {/* Close Button */}
                <button
                  onClick={() => {
                    if (isListening && recognitionRef.current) {
                      recognitionRef.current.stop();
                    }
                    setIsOpen(false);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mic Pulse Center */}
            <div className="flex flex-col items-center justify-center py-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
              <div className="relative">
                {isListening && (
                  <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping" />
                )}
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                    isListening
                      ? 'bg-rose-600 text-white ring-4 ring-rose-400/40 shadow-lg shadow-rose-600/30'
                      : 'bg-slate-900 text-white hover:bg-slate-800 shadow-md shadow-slate-900/20'
                  }`}
                  aria-label={isListening ? 'Stop listening' : 'Start listening'}
                >
                  {isListening ? (
                    <Mic className="w-8 h-8 animate-pulse" />
                  ) : (
                    <Mic className="w-8 h-8 text-sky-400" />
                  )}
                </button>
              </div>

              <div className="text-center px-4">
                <p className="text-xs font-bold text-slate-800">
                  {isListening ? 'Listening... Speak now' : 'Tap microphone to speak'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 max-w-sm mx-auto truncate">
                  {transcript
                    ? `"${transcript}"`
                    : 'Try: "Aaj ki delivery", "Bills kholo", "Blank QR", "Search Rahul"'}
                </p>
              </div>
            </div>

            {/* Action Feedback */}
            {lastActionFeedback && (
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-800 flex items-start gap-2 animate-in fade-in duration-150">
                <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div className="leading-snug space-y-1.5 flex-1">
                  <div>{lastActionFeedback}</div>
                  {/* If fallback guidance examples are present */}
                  {suggestedExamples.length > 0 && lastActionFeedback.includes("didn't understand") && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {suggestedExamples.map((ex) => (
                        <button
                          key={ex}
                          type="button"
                          onClick={() => handleVoiceCommand(ex)}
                          className="px-2 py-0.5 bg-white border border-sky-200 hover:bg-sky-100 text-[10px] font-semibold text-sky-800 rounded-md transition-colors"
                        >
                          "{ex}"
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Safety Confirmation Modal for Destructive / Sensitive Actions */}
            {pendingSafetyAction && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  Confirm Sensitive Action
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  {pendingSafetyAction.description}
                </p>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPendingSafetyAction(null)}
                    className="px-3 py-1.5 bg-white border border-amber-200 text-amber-800 font-semibold text-xs rounded-lg hover:bg-amber-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={executeSafetyAction}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-xs"
                  >
                    Yes, Proceed
                  </button>
                </div>
              </div>
            )}

            {/* Quick Commands Grid UI (Clean, Accessible, No "svg" text) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-bold text-slate-400 block tracking-wider">
                  Quick Commands
                </span>
                <span className="text-[10px] text-slate-400">Tap to run</span>
              </div>
              <div
                className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto"
                role="group"
                aria-label="Quick Commands"
              >
                {QUICK_COMMANDS.map((chip) => {
                  const IconComp = chip.icon;
                  return (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => handleVoiceCommand(chip.cmd)}
                      className={`px-2.5 py-2 border rounded-xl transition-all duration-150 flex items-center gap-2 text-left active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1 min-h-[40px] ${chip.colorClass}`}
                      aria-label={chip.label}
                    >
                      <IconComp
                        className={`w-4 h-4 shrink-0 ${chip.iconClass}`}
                        aria-hidden="true"
                        focusable="false"
                      />
                      <span className="text-xs font-semibold text-slate-800 truncate leading-tight">
                        {chip.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Text Input Fallback */}
            <form onSubmit={handleTextSubmit} className="pt-2 border-t border-slate-100">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Or type command: 'Bills kholo', 'Search Rahul'..."
                  className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!textInput.trim()}
                  className="absolute right-1.5 p-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-white rounded-lg transition-colors"
                  aria-label="Submit command"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
