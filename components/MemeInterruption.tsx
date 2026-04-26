'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';

interface MemeInterruptionProps {
  onComplete: () => void;
}

const duration = 10;

const MEMES = [
  '/memes/sample.jpg',
  'https://picsum.photos/seed/meme1/600/600',
  'https://picsum.photos/seed/meme2/600/600',
  'https://picsum.photos/seed/meme3/600/600',
];

export default function MemeInterruption({ onComplete }: MemeInterruptionProps) {
  const [memeUrl, setMemeUrl] = useState(() => MEMES[Math.floor(Math.random() * MEMES.length)]);
  const [timeLeft, setTimeLeft] = useState(duration);

  const [bubbles] = useState(() => [...Array(10)].map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    duration: 5 + Math.random() * 5,
    delay: Math.random() * 5,
    size: Math.random() * 100 + 50
  })));

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, duration * 1000);

    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4 overflow-hidden"
    >
      <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
      
      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center">
        <motion.h2 
          animate={{ scale: [1, 1.1, 1], rotate: [0, -2, 2, 0] }}
          transition={{ repeat: Infinity, duration: 0.5 }}
          className="text-yellow-400 font-bangers text-5xl md:text-7xl mb-8 text-center uppercase drop-shadow-[4px_4px_0px_rgba(255,0,0,1)]"
        >
          WAIT A SECOND... ✋
        </motion.h2>

        <div className="relative bg-white p-4 border-8 border-yellow-400 rounded-3xl shadow-[20px_20px_0px_rgba(255,0,0,1)] rotate-3">
          <div className="relative w-full aspect-square md:aspect-video max-h-[60vh] overflow-hidden rounded-xl bg-gray-200">
            <Image 
              src={memeUrl} 
              alt="Meme Interruption" 
              fill
              className="object-contain"
              referrerPolicy="no-referrer"
              onError={() => {
                  setMemeUrl('https://picsum.photos/seed/error/600/400');
              }}
            />
          </div>
          <div className="absolute -bottom-6 -right-6 bg-red-600 text-white font-bangers text-3xl px-6 py-2 rounded-xl border-4 border-black -rotate-6">
             {timeLeft}s
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onComplete}
          className="mt-16 bg-white text-black font-bangers text-3xl px-10 py-5 rounded-2xl border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] hover:bg-yellow-300 transition-colors flex items-center gap-4"
        >
          JUST KIDDING 😭
        </motion.button>

        <p className="mt-8 text-white/60 font-bold animate-pulse text-center">
          The Judge is checking his bank account before roasting you...
        </p>
      </div>
      
      {/* Cartoon bubbles background effect */}
      <div className="absolute inset-0 pointer-events-none">
        {bubbles.map((bubble) => (
          <motion.div
            key={bubble.id}
            initial={{ y: '110vh', x: `${bubble.x}vw` }}
            animate={{ y: '-10vh' }}
            transition={{ 
                duration: bubble.duration, 
                repeat: Infinity,
                delay: bubble.delay
            }}
            className="absolute rounded-full bg-white/10"
            style={{ width: `${bubble.size}px`, height: `${bubble.size}px` }}
          />
        ))}
      </div>
    </motion.div>
  );
}
