"use client";

import { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { handleFirestoreError, OperationType } from '@/lib/firestore-utils';

export default function TermsScreen({ user }: { user: any }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAccept = async () => {
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        acceptedTerms: true,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      setIsSubmitting(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto p-4 py-8 min-h-screen flex flex-col items-center justify-center relative">
      <div className="bg-white rounded-3xl p-8 border-4 border-black shadow-[12px_12px_0px_rgba(0,0,0,1)] w-full max-w-2xl mt-12">
        <h1 className="text-5xl font-bangers text-center mb-6 text-red-600 uppercase break-words">
          WAIT A MINUTE 🛑
        </h1>
        <div className="text-xl font-bold mb-8 text-gray-800 flex flex-col gap-4">
          <p>Before we let you loose to judge people and their red flags, you need to agree to some ground rules.</p>
          
          <div className="bg-gray-100 p-6 rounded-xl border-2 border-black text-lg space-y-4">
            <h2 className="font-bangers text-3xl mb-2">THE SERIOUS STUFF</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>AI Makes Mistakes:</strong> Do NOT trust blindly on AI generated content. The AI can and will hallucinate, misinterpret things, and give terrible dating advice.</li>
              <li><strong>It&apos;s Just for Fun:</strong> This is a meme app. Don&apos;t use this AI&apos;s verdict to make actual, real-life relationship decisions. If the AI tells you to break up with your partner because they breathe too loud, maybe don&apos;t listen to it.</li>
              <li><strong>Respect Privacy:</strong> Don&apos;t upload real sensitive data, real voice notes of people without their consent, or PII.</li>
              <li><strong>Emotional Impact:</strong> The AI judge is designed to be harsh, toxic, and judgmental. Don&apos;t take it personally.</li>
            </ul>
          </div>
        </div>

        <button 
          disabled={isSubmitting}
          onClick={handleAccept}
          className="w-full bg-green-500 text-black font-bangers text-3xl py-4 rounded-xl border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:bg-green-400 hover:translate-y-1 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] disabled:opacity-50 transition-all font-bold tracking-widest uppercase"
        >
          {isSubmitting ? 'ACCEPTING...' : 'I UNDERSTAND THE RISKS'}
        </button>
      </div>
    </main>
  );
}
