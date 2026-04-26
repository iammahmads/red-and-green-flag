"use client";

import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AlertOctagon, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { handleFirestoreError, OperationType } from '@/lib/firestore-utils';
import MemeInterruption from '@/components/MemeInterruption';
import { AnimatePresence } from 'motion/react';

export default function ResultPage() {
  const { id } = useParams();
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [evaluation, setEvaluation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showMeme, setShowMeme] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user || (profile && !profile.onboarded)) {
      router.push('/');
      return;
    }

    const fetchEval = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'checks', id as string));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.userId !== user.uid) {
            router.push('/');
            return;
          }
          if (data.status !== 'completed') {
            router.push(`/eval/${id}`);
            return;
          }
          setEvaluation(data);
        } else {
          router.push('/');
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `checks/${id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchEval();
  }, [user, profile, authLoading, id, router]);

  if (loading || authLoading) return <div className="text-center mt-20 text-4xl font-bangers text-white">BRACING IMPACT...</div>;
  if (!evaluation) return null;

  const isRed = evaluation.verdict === 'red_flag';

  return (
    <>
      <AnimatePresence>
        {showMeme && (
          <MemeInterruption onComplete={() => setShowMeme(false)} />
        )}
      </AnimatePresence>

      <div className={`min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-1000 ${isRed ? 'bg-red-600' : 'bg-green-500'}`}>
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-black to-transparent" />
      
      <div className={`bg-white rounded-3xl p-8 md:p-12 border-8 border-black shadow-[16px_16px_0px_rgba(0,0,0,1)] max-w-2xl text-center z-10`}>
        <div className="flex justify-center mb-6">
          {isRed ? (
             <AlertOctagon size={120} className="text-red-500 drop-shadow-xl" />
          ) : (
             <CheckCircle2 size={120} className="text-green-500 drop-shadow-xl" />
          )}
        </div>
        
        <h1 className="text-6xl md:text-8xl font-bangers text-black mb-4 uppercase meme-border px-4 py-2">
          {isRed ? 'GIGANTIC RED FLAG 🚩' : 'GREEN FLAG 🍏'}
        </h1>
        
        <div className="text-2xl md:text-3xl font-bold mb-4 italic">
          &quot;{evaluation.targetName}&quot;
        </div>
        
        <div className="flex flex-wrap justify-center gap-2 mb-8 font-bold text-sm">
           <span className="bg-black text-white px-3 py-1 rounded-full">{evaluation.targetAge} y/o</span>
           <span className="bg-black text-white px-3 py-1 rounded-full uppercase">{evaluation.targetGender}</span>
           <span className="bg-black text-white px-3 py-1 rounded-full uppercase">{evaluation.targetOccupation}</span>
        </div>
        
        <div className="bg-gray-100 p-6 rounded-2xl border-4 border-black text-left mb-8 shadow-[inset_4px_4px_0px_rgba(0,0,0,0.1)]">
          <h3 className="font-bangers text-2xl mb-2 text-gray-500">JUDGE&apos;S FEEDBACK:</h3>
          <div className="text-xl font-bold leading-relaxed prose prose-sm prose-black">
            <ReactMarkdown>
              {evaluation.judgeFeedback}
            </ReactMarkdown>
          </div>

        </div>

        <button 
          onClick={() => router.push('/')}
          className="bg-black text-white font-bangers text-3xl py-4 px-8 rounded-xl border-4 border-white shadow-[8px_8px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] active:translate-y-2 active:shadow-none transition-all w-full md:w-auto"
        >
          ANALYZE ANOTHER VICTIM
        </button>
      </div>
    </div>
    </>
  );
}
