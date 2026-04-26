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

      <div className="relative flex flex-col items-center">
        <motion.div 
          key={index}
          initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="text-[150px] md:text-[250px] leading-none mb-12 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        >
          <div className="flex gap-4">
            <span>{current.eyes}</span>
          </div>
          <div className="text-center mt-[-20px]">{current.mouth}</div>
        </motion.div>

        <motion.h2 
          animate={{ 
            x: [0, -10, 10, -10, 10, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ repeat: Infinity, duration: 0.3 }}
          className="text-white font-bangers text-5xl md:text-8xl text-center uppercase drop-shadow-[5px_5px_0px_rgba(0,0,0,1)]"
        >
          Khud ko check kar le pehle 💀
        </motion.h2>

        <p className="mt-8 text-white/80 font-bold text-xl md:text-2xl text-center max-w-lg bg-black/40 p-4 rounded-xl backdrop-blur-sm border-2 border-white">
            You&apos;ve judged {count} people today. <br/>
            Your social battery is cooked. Go touch grass.
        </p>

        <button
          onClick={onClose}
          className="mt-12 bg-white text-black font-bangers text-3xl px-12 py-6 rounded-2xl border-4 border-black shadow-[10px_10px_0px_rgba(0,0,0,1)] hover:bg-yellow-300 hover:translate-y-1 hover:shadow-[5px_5px_0px_rgba(0,0,0,1)] transition-all"
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
