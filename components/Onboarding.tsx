"use client";

import { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { handleFirestoreError, OperationType } from '@/lib/firestore-utils';

import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

export default function Onboarding({ user, profile, onCancel }: { user: any, profile: any, onCancel?: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: profile?.name || user.displayName || '',
    age: profile?.age?.toString() || '',
    gender: profile?.gender || '',
    education: profile?.education || '',
    profession: profile?.profession || '',
    likes: profile?.likes || '',
    dislikes: profile?.dislikes || '',
    preferredPartnerAttributes: profile?.preferredPartnerAttributes || ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Validate age
    const ageNum = parseInt(formData.age);
    if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
      alert("Bruh, drop a real age. (13-120)");
      setIsSubmitting(false);
      return;
    }

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: formData.name.trim(),
        age: ageNum,
        gender: formData.gender,
        education: formData.education.trim(),
        profession: formData.profession.trim(),
        likes: formData.likes.trim(),
        dislikes: formData.dislikes.trim(),
        preferredPartnerAttributes: formData.preferredPartnerAttributes.trim(),
        onboarded: true,
        updatedAt: serverTimestamp()
      });
      if (onCancel) onCancel();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto p-4 py-8 min-h-screen flex flex-col items-center justify-center relative">
      <div className="absolute top-4 right-4">
        <button 
          onClick={handleSignOut}
          className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:bg-red-700 active:translate-y-1 active:shadow-none transition-all"
        >
          BAIL (LOGOUT)
        </button>
      </div>
      <div className="bg-white rounded-3xl p-8 border-4 border-black shadow-[12px_12px_0px_rgba(0,0,0,1)] w-full max-w-2xl mt-12">
        <h1 className="text-5xl font-bangers text-center mb-2 uppercase break-words">
          {profile?.onboarded ? 'Edit Profile ✍️' : 'Hold Up 🛑'}
        </h1>
        <p className="text-xl font-bold text-center mb-8 text-gray-600">
          {profile?.onboarded ? 'Update your stats before the Judge sees them.' : 'The Judge needs to know who you are before weighing your terrible dating choices.'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <label className="block font-bold text-xl mb-2">Your Name 📛</label>
              <input 
                required
                name="name"
                type="text" 
                value={formData.name}
                onChange={handleChange}
                placeholder="What do people call you?"
                className="w-full text-lg p-4 rounded-xl border-4 border-black focus:outline-none focus:ring-4 focus:ring-yellow-400 bg-gray-50 font-bold"
              />
            </div>
            <div className="w-full md:w-32 flex-shrink-0">
              <label className="block font-bold text-xl mb-2">Age 👴</label>
              <input 
                required
                name="age"
                type="number" 
                min="13"
                max="120"
                value={formData.age}
                onChange={handleChange}
                placeholder="21?"
                className="w-full text-lg p-4 rounded-xl border-4 border-black focus:outline-none focus:ring-4 focus:ring-yellow-400 bg-gray-50 font-bold"
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <label className="block font-bold text-xl mb-2">Gender 🚻</label>
              <select 
                required
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full text-lg p-4 rounded-xl border-4 border-black focus:outline-none focus:ring-4 focus:ring-yellow-400 bg-gray-50 font-bold appearance-none cursor-pointer"
              >
                <option value="" disabled>Select...</option>
                <option value="male">Male 🧔</option>
                <option value="female">Female 👩</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <label className="block font-bold text-xl mb-2">Education 🎓</label>
              <input 
                required
                name="education"
                type="text" 
                value={formData.education}
                onChange={handleChange}
                placeholder="e.g. Harvard / Hustlers University"
                className="w-full text-lg p-4 rounded-xl border-4 border-black focus:outline-none focus:ring-4 focus:ring-yellow-400 bg-gray-50 font-bold"
              />
            </div>
            <div className="flex-1">
              <label className="block font-bold text-xl mb-2">Hustle / Job 💼</label>
              <input 
                required
                name="profession"
                type="text" 
                value={formData.profession}
                onChange={handleChange}
                placeholder="e.g. Unemployed / DJ"
                className="w-full text-lg p-4 rounded-xl border-4 border-black focus:outline-none focus:ring-4 focus:ring-yellow-400 bg-gray-50 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-xl mb-2">What do you LIKE? 🍕</label>
            <input 
              required
              name="likes"
              type="text" 
              value={formData.likes}
              onChange={handleChange}
              placeholder="e.g. TikTok, Iced Coffee, Drama"
              className="w-full text-lg p-4 rounded-xl border-4 border-black focus:outline-none focus:ring-4 focus:ring-yellow-400 bg-gray-50 font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-xl mb-2">What do you DISLIKE? 🤢</label>
            <input 
              required
              name="dislikes"
              type="text" 
              value={formData.dislikes}
              onChange={handleChange}
              placeholder="e.g. Reply guys, Android bubbles"
              className="w-full text-lg p-4 rounded-xl border-4 border-black focus:outline-none focus:ring-4 focus:ring-yellow-400 bg-gray-50 font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-xl mb-2">Ideal Partner Traits</label>
            <textarea 
              required
              name="preferredPartnerAttributes"
              rows={3}
              value={formData.preferredPartnerAttributes}
              onChange={handleChange}
              placeholder="e.g. Needs to be 6ft tall, finance bro, etc."
              className="w-full text-lg p-4 rounded-xl border-4 border-black focus:outline-none focus:ring-4 focus:ring-yellow-400 bg-gray-50 font-bold resize-none"
            />
          </div>
          
          <div className="flex flex-col gap-4 mt-4">
            <button 
              disabled={isSubmitting}
              type="submit"
              className="w-full bg-purple-500 text-black font-bangers text-3xl py-4 rounded-xl border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:bg-purple-400 hover:translate-y-1 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'SAVING DATA...' : (profile?.onboarded ? 'SAVE CHANGES' : 'LET ME COOK 👨‍🍳')}
            </button>
            {profile?.onboarded && onCancel && (
              <button 
                type="button"
                onClick={onCancel}
                className="w-full bg-gray-200 text-black font-bangers text-2xl py-3 rounded-xl border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:bg-gray-300 hover:translate-y-1 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all"
              >
                CANCEL
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
