"use client";

import { useAuth } from '@/hooks/useAuth';
import { signInWithGoogle, signOut } from '@/lib/firebase';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { handleFirestoreError, OperationType } from '@/lib/firestore-utils';
import Onboarding from '@/components/Onboarding';
import JudgmentalFace from '@/components/JudgmentalFace';
import AuthScreen from '@/components/AuthScreen';
import TermsScreen from '@/components/TermsScreen';
import { AnimatePresence } from 'motion/react';

import { ai } from '@/lib/gemini';
import { auth as firebaseAuth } from '@/lib/firebase';

const model = 'gemini-2.5-flash'

export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [targetName, setTargetName] = useState('');
  const [targetGender, setTargetGender] = useState('other');
  const [targetAge, setTargetAge] = useState('');
  const [targetOccupation, setTargetOccupation] = useState('');
  const [targetBio, setTargetBio] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showPunishment, setShowPunishment] = useState(false);
  const [hasDismissedPunishment, setHasDismissedPunishment] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <h1 className="text-4xl font-bangers text-white meme-border animate-pulse tracking-widest text-center px-4">
          SNOOPING ON YOUR CRUSH...
        </h1>
      </div>
    );
  }

  if (!user) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h1 className="text-6xl md:text-8xl font-bangers text-yellow-300 meme-border drop-shadow-xl mb-4 transform -rotate-2">
          RED FLAG 🚩
          <br/> OR <br/>
          GREEN FLAG 🍏
        </h1>
        <p className="text-xl md:text-2xl font-bold max-w-lg mb-8 text-white drop-shadow-md">
          Find out if your crush is &quot;the one&quot; or just another mistake waiting to happen. AI simulates them, judges them, and gives you the brutal truth. 
        </p>
        <AuthScreen onSuccess={() => {}} />
      </main>
    );
  }

  // Verification step for email/pass users
  if (user && !user.emailVerified) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h1 className="text-5xl font-bangers text-yellow-300 mb-8">VERIFY YOURSELF 🕵️</h1>
        <AuthScreen 
          onSuccess={() => window.location.reload()} 
          initialMode="verify" 
          initialEmail={user.email || ''} 
        />
        <button 
          onClick={() => firebaseAuth.signOut()}
          className="mt-8 font-bold underline text-white"
        >
          LOG OUT & TRY AGAIN
        </button>
      </main>
    );
  }

  // Render onboarding if user hasn't finished it
  if (!profile || !profile.onboarded || isEditingProfile) {
    return <Onboarding user={user} profile={profile || {}} onCancel={profile?.onboarded ? () => setIsEditingProfile(false) : undefined} />;
  }

  // Render terms screen if they haven't accepted terms
  if (!profile.acceptedTerms) {
    return <TermsScreen user={user} />;
  }

  const startEvaluation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!targetName.trim() || !targetAge || !targetOccupation.trim()) {
      alert("Name, Age, and Occupation are REQUIRED! Don't be lazy.");
      return;
    }
    if (!targetBio.trim() && !audioFile) return;
    
    // Check usage limits
    const today = new Date().toISOString().split('T')[0];
    const userDailyCount = profile.lastCheckDate === today ? (profile.dailyCheckCount || 0) : 0;
    
    // Show punishment if they've hit the limit and haven't dismissed it yet in this session
    if (userDailyCount >= 1 && !hasDismissedPunishment) {
      setShowPunishment(true);
      setHasDismissedPunishment(true); // Don't show it again after this dismissal
      return;
    }

    setIsSubmitting(true);
    let finalBio = targetBio.trim();
    let vocalTraits = '';

    if (audioFile) {
       try {
         const reader = new FileReader();
         const base64Promise = new Promise<string>((resolve) => {
           reader.onloadend = () => {
             const base64 = (reader.result as string).split(',')[1];
             resolve(base64);
           };
         });
         reader.readAsDataURL(audioFile);
         const base64Audio = await base64Promise;

         const result = await ai.models.generateContent({
           model: model,
           contents: [
             {
               role: 'user',
               parts: [
                 { text: "AUDIO ANALYSIS: 1. Transcribe the audio exactly. 2. Analyze the 'vocal traits' (energy, speed, tone, unique vibes, slang used). Output MUST be JSON: { \"transcription\": \"...\", \"vocalTraits\": \"...\" }. Be brutal but accurate." },
                 {
                    inlineData: {
                       data: base64Audio,
                       mimeType: audioFile.type || 'audio/webm'
                    }
                 }
               ]
             }
           ],
           config: {
             responseMimeType: "application/json",
             temperature: 0.2
           }
         });

         const responseText = result.text;
         if (responseText) {
           const audioData = JSON.parse(responseText);
           if (audioData.transcription && audioData.transcription !== '...') {
             finalBio += (finalBio ? '\n\n transcribed voice note: ' : '') + audioData.transcription;
             vocalTraits = audioData.vocalTraits;
           }
         }
       } catch (e) {
         console.error('Audio processing failed', e);
         alert('Audio failed to transcribe. Proceeding with text only.');
       }
    }

    const evalId = crypto.randomUUID();
    
    try {
      await setDoc(doc(db, 'checks', evalId), {
        userId: user.uid,
        targetName: targetName.trim(),
        targetGender,
        targetAge: parseInt(targetAge),
        targetOccupation: targetOccupation.trim(),
        targetBio: finalBio,
        vocalTraits: vocalTraits,
        status: 'active',
        verdict: 'pending',
        messages: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update user usage count
      const today = new Date().toISOString().split('T')[0];
      const newCount = profile.lastCheckDate === today ? (profile.dailyCheckCount || 0) + 1 : 1;
      
      await updateDoc(doc(db, 'users', user.uid), {
        dailyCheckCount: newCount,
        lastCheckDate: today,
        updatedAt: serverTimestamp()
      });

      router.push(`/eval/${evalId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `checks/${evalId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-4 py-12 min-h-screen flex flex-col">
      <AnimatePresence>
        {showPunishment && (
          <JudgmentalFace 
            count={profile?.dailyCheckCount || 0} 
            onClose={() => {
              setShowPunishment(false);
              startEvaluation(); // Auto-start the simulation after dismissal
            }} 
          />
        )}
      </AnimatePresence>
      <header className="flex justify-between items-center mb-12">
        <h1 className="text-4xl font-bangers text-yellow-300 meme-border drop-shadow-md">
          🚩 / 🍏
        </h1>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsEditingProfile(true)}
            className="flex items-center gap-2 bg-white text-black font-bangers text-xl py-2 px-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:bg-gray-100 hover:translate-y-1 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all"
          >
            <span>{profile.name}</span>
            <span>👤</span>
          </button>
          <button 
            onClick={signOut}
            className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:bg-red-700 active:translate-y-1 active:shadow-none transition-all"
          >
            BAIL
          </button>
        </div>
      </header>

      <div className="bg-white rounded-3xl p-8 border-4 border-black shadow-[12px_12px_0px_rgba(0,0,0,1)]">
        <h2 className="text-4xl font-bangers text-center mb-6">WHO IS WITH US TODAY? 👀</h2>
        <form onSubmit={startEvaluation} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-bold text-xl mb-2">Their Name 🏷️</label>
              <input 
                required
                type="text" 
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                placeholder="Chad, Stacy, etc."
                className="w-full text-lg p-4 rounded-xl border-4 border-black focus:outline-none focus:ring-4 focus:ring-yellow-400 bg-gray-50 font-bold placeholder-gray-400"
              />
            </div>
            <div>
              <label className="block font-bold text-xl mb-2">Age 🎂</label>
              <input 
                required
                type="number" 
                value={targetAge}
                onChange={(e) => setTargetAge(e.target.value)}
                placeholder="21"
                className="w-full text-lg p-4 rounded-xl border-4 border-black focus:outline-none focus:ring-4 focus:ring-yellow-400 bg-gray-50 font-bold placeholder-gray-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-bold text-xl mb-2">Gender 👤</label>
              <select 
                value={targetGender}
                onChange={(e) => setTargetGender(e.target.value)}
                className="w-full text-lg p-4 rounded-xl border-4 border-black focus:outline-none focus:ring-4 focus:ring-yellow-400 bg-gray-50 font-bold"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-binary</option>
                <option value="other">Other / Mystery</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-xl mb-2">What do they do? 💼</label>
              <input 
                required
                type="text" 
                value={targetOccupation}
                onChange={(e) => setTargetOccupation(e.target.value)}
                placeholder="Student, CEO of Nap, etc."
                className="w-full text-lg p-4 rounded-xl border-4 border-black focus:outline-none focus:ring-4 focus:ring-yellow-400 bg-gray-50 font-bold placeholder-gray-400"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-xl mb-2">The Tea (Spill it all) 🍵</label>
            <textarea 
              required={!audioFile}
              rows={4}
              value={targetBio}
              onChange={(e) => setTargetBio(e.target.value)}
              placeholder="e.g. He likes crypto, only wears patagonia, and texts back 'k'."
              className="w-full text-lg p-4 rounded-xl border-4 border-black focus:outline-none focus:ring-4 focus:ring-yellow-400 bg-gray-50 font-bold placeholder-gray-400 resize-none"
            />
          </div>
          
          <div>
            <label className="block font-bold text-xl mb-2">Voice Sample (Audio Files Only) 🎤</label>
            <input 
              type="file" 
              accept="audio/*"
              onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
              className="w-full text-lg p-4 rounded-xl border-4 border-black focus:outline-none focus:ring-4 focus:ring-yellow-400 bg-gray-50 font-bold"
            />
          </div>
          
          <button 
            disabled={isSubmitting}
            type="submit"
            className="w-full bg-green-500 text-black font-bangers text-3xl py-4 rounded-xl border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:bg-green-400 hover:translate-y-1 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] disabled:opacity-50 transition-all mt-4"
          >
            {isSubmitting ? 'Analyzing specimen 🧪' : 'START THE SIMULATION 🧑‍💻'}
          </button>
        </form>
      </div>
    </main>
  );
}
