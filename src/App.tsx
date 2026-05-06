/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Phone, 
  PhoneOff, 
  User, 
  Headphones, 
  Play, 
  RotateCcw, 
  Loader2, 
  CheckCircle2, 
  Mail,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { conversationScript, generateSpeech, SpeechSegment } from './services/speechService';

export default function App() {
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playTimeoutRef = useRef<number | null>(null);

  // Initialize AudioContext
  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  };

  const stopCurrent = () => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch (e) {
        // Already stopped
      }
      currentSourceRef.current = null;
    }
    if (playTimeoutRef.current) {
      window.clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
    }
  };

  const playSegment = async (index: number) => {
    if (index >= conversationScript.length) {
      setIsPlaying(false);
      setCompleted(true);
      return;
    }

    setCurrentIndex(index);
    setIsLoading(true);
    setError(null);

    try {
      const segment = conversationScript[index];
      const buffer = await generateSpeech(segment.text, segment.speaker);
      
      setIsLoading(false);
      const ctx = getAudioCtx();
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      
      currentSourceRef.current = source;
      
      source.onended = () => {
        if (!isPlaying) return;
        
        playTimeoutRef.current = window.setTimeout(() => {
          playSegment(index + 1);
        }, segment.pauseAfter);
      };
      
      source.start();
    } catch (err: any) {
      console.error(err);
      setError("Failed to generate speech. Please check your API key.");
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  const startConversation = () => {
    setCompleted(false);
    setIsPlaying(true);
    playSegment(0);
  };

  const resetConversation = () => {
    stopCurrent();
    setIsPlaying(false);
    setCurrentIndex(null);
    setCompleted(false);
    setError(null);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => stopCurrent();
  }, []);

  const currentSegment = currentIndex !== null ? conversationScript[currentIndex] : null;

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-slate-900 font-sans selection:bg-blue-100 p-4 md:p-8 flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-4xl mb-8 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-200">
            <Phone className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">SpeechFlow</h1>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Billing Support Simulator</p>
          </div>
        </div>
        
        {error && (
          <div className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-sm border border-red-100 animate-pulse">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
      </header>

      <main className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Call Status & Controls */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50 blur-2xl" />
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 relative">
                {isPlaying ? (
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }} 
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 bg-blue-100 rounded-full opacity-50"
                  />
                ) : null}
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-md relative z-10">
                  {currentSegment?.speaker === 'Agent' ? (
                    <Headphones className="w-10 h-10 text-blue-600" />
                  ) : currentSegment?.speaker === 'Customer' ? (
                    <User className="w-10 h-10 text-slate-600" />
                  ) : (
                    <Phone className="w-10 h-10 text-slate-300" />
                  )}
                </div>
              </div>

              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-800">
                  {isPlaying ? (isLoading ? 'Connecting...' : 'Active Call') : completed ? 'Call Ended' : 'Ready to Start'}
                </h2>
                <p className="text-slate-500 font-medium">Session ID: #REF-9921-X</p>
              </div>

              <div className="w-full bg-slate-50 rounded-2xl p-4 mb-8 flex items-center justify-between border border-slate-100">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Active Participant</span>
                  <span className="font-semibold text-slate-700">
                    {currentSegment ? (currentSegment.speaker === 'Agent' ? 'Sarah (Billing)' : 'Mr. Jackson') : 'None'}
                  </span>
                </div>
                {isPlaying && !isLoading && (
                  <div className="flex gap-1 h-4 items-end">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <motion.div 
                        key={i}
                        animate={{ height: [4, Math.random() * 16 + 4, 4] }}
                        transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                        className="w-1 bg-blue-500 rounded-full"
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-4 w-full">
                {!isPlaying ? (
                  <button 
                    onClick={startConversation}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 group"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>{completed ? 'Replay Scene' : 'Start Call'}</span>
                  </button>
                ) : (
                  <button 
                    onClick={resetConversation}
                    className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-2"
                  >
                    <PhoneOff className="w-5 h-5 fill-current" />
                    <span>End Call</span>
                  </button>
                )}
                {completed && (
                  <button 
                    onClick={resetConversation}
                    className="bg-white border-2 border-slate-200 p-4 rounded-2xl hover:bg-slate-50 transition-colors"
                  >
                    <RotateCcw className="w-5 h-5 text-slate-500" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Call Metadata/Details */}
          <div className="bg-slate-900 rounded-3xl p-6 text-white overflow-hidden relative">
             <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-semibold">Voice Security Enabled</span>
             </div>
             <p className="text-sm text-slate-400 leading-relaxed">
               This simulation uses 16-bit PCM high-fidelity synthesis to model real-world customer support interactions.
             </p>
             {/* Abstract circle decoration */}
             <div className="absolute -bottom-8 -right-8 w-24 h-24 border-4 border-slate-800 rounded-full opacity-50" />
          </div>
        </section>

        {/* Right Column: Dynamic Transcript */}
        <section className="lg:col-span-7 flex flex-col gap-4 h-[calc(100vh-200px)] lg:h-[700px]">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-bold text-slate-700 flex items-center gap-2 uppercase text-xs tracking-widest">
              Live Transcript
              {isLoading && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
            </h3>
            {currentIndex !== null && (
              <span className="text-[10px] bg-white px-2 py-1 rounded-md border border-slate-200 font-mono text-slate-500">
                SEG_{String(currentIndex + 1).padStart(2, '0')} / {conversationScript.length}
              </span>
            )}
          </div>

          <div className="flex-1 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 overflow-y-auto space-y-4 scroll-smooth custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {conversationScript.map((segment, idx) => {
                const isActive = currentIndex === idx;
                const isPast = currentIndex !== null && idx < currentIndex;
                const isFuture = currentIndex === null || idx > currentIndex;

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ 
                      opacity: isFuture ? 0.3 : 1, 
                      scale: isActive ? 1.02 : 1,
                      x: isActive ? 0 : (isPast ? 0 : 0)
                    }}
                    className={`p-4 rounded-2xl transition-all duration-500 ${
                      isActive 
                        ? 'bg-blue-50 border border-blue-100 ring-2 ring-blue-50' 
                        : 'bg-white border border-transparent'
                    } ${isPast ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`mt-1 p-2 rounded-xl ${
                        segment.speaker === 'Agent' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {segment.speaker === 'Agent' ? <Headphones size={16} /> : <User size={16} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[11px] font-bold uppercase tracking-wider ${
                            segment.speaker === 'Agent' ? 'text-blue-600' : 'text-slate-600'
                          }`}>
                            {segment.speaker}
                          </span>
                          {segment.tone && (
                            <span className="text-[10px] text-slate-400 italic">
                             Tone: {segment.tone}
                            </span>
                          )}
                          {isPast && !isActive && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                        </div>
                        <p className={`text-sm leading-relaxed ${isActive ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>
                          {segment.text}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {completed && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-8 p-6 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col items-center text-center gap-3"
              >
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-800">Email Sent Successfully</h4>
                  <p className="text-xs text-emerald-700 mt-1 max-w-xs ring-offset-emerald-50">
                    A secure cancellation link has been dispatched to jacknabvoip@gmail.com.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Empty state when not started */}
            {currentIndex === null && !completed && (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-50">
                <Phone className="w-12 h-12" />
                <p className="text-sm font-medium">Start the call to generate the conversation</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* CSS for custom scrollbar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #CBD5E1;
        }
      `}</style>
    </div>
  );
}

