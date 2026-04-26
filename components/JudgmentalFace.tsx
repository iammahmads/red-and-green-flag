'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface JudgmentalFaceProps {
  onClose: () => void;
  count: number;
}

const EXPRESSIONS = [
  { eyes: '👀', mouth: '👄', bg: 'bg-yellow-400' },
  { eyes: '🤨', mouth: '😐', bg: 'bg-orange-400' },
  { eyes: '🙄', mouth: '😒', bg: 'bg-red-400' },
  { eyes: '💀', mouth: '😶', bg: 'bg-black' },
  { eyes: '👁️', mouth: '👅', bg: 'bg-purple-600' },
];

export default function JudgmentalFace({ onClose, count }: JudgmentalFaceProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % EXPRESSIONS.length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const current = EXPRESSIONS[index];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center p-8 transition-colors duration-1000 ${current.bg}`}
    >
      <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')] pointer-events-none" />

      <div className="relative flex flex-col items-center max-h-[90vh] overflow-y-auto scrollbar-hide py-4 px-2">
        <motion.div 
          key={index}
          initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="text-[120px] sm:text-[150px] md:text-[250px] leading-none mb-6 sm:mb-12 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center"
        >
          <div className="flex gap-4">
            <span>{current.eyes}</span>
          </div>
          <div className="text-center mt-[-15px] sm:mt-[-20px]">{current.mouth}</div>
        </motion.div>

        <motion.h2 
          animate={{ 
            x: [0, -5, 5, -5, 5, 0],
            scale: [1, 1.05, 1]
          }}
          transition={{ repeat: Infinity, duration: 0.3 }}
          className="text-white font-bangers text-4xl sm:text-5xl md:text-8xl text-center uppercase drop-shadow-[3px_3px_0px_rgba(0,0,0,1)] md:drop-shadow-[5px_5px_0px_rgba(0,0,0,1)] px-4"
        >
          Khud ko check kar le pehle 💀
        </motion.h2>

        <p className="mt-6 sm:mt-8 text-white/80 font-bold text-lg sm:text-xl md:text-2xl text-center max-w-lg bg-black/40 p-4 rounded-xl backdrop-blur-sm border-2 border-white mx-4">
            You&apos;ve judged {count} people today. <br/>
            Your social battery is cooked. Go touch grass.
        </p>

        <button
          onClick={onClose}
          className="mt-8 sm:mt-12 bg-white text-black font-bangers text-2xl sm:text-3xl px-8 sm:px-12 py-4 sm:py-6 rounded-2xl border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] hover:bg-yellow-300 hover:translate-y-1 hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all active:scale-95"
        >
          FINE... ONE LAST TIME 🙄
        </button>
      </div>

      {/* Floating judging hands or something */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ y: '100%', x: `${i * 20}%` }}
            animate={{ y: '-20%' }}
            transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.5 }}
            className="absolute text-8xl opacity-10"
          >
            👇
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
