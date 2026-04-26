"use client";
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDocFromServer, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Validate connection to Firestore as mentioned in instructions
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();

    let profileUnsub: () => void;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Ensure user document exists in firestore
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDocFromServer(userRef);
          if (!userDoc.exists()) {
             await setDoc(userRef, {
               email: currentUser.email || '',
               name: currentUser.displayName || 'Unknown Meme Lord',
               createdAt: serverTimestamp()
             });
          }
        } catch (err) {
           // We might get a permission error if trying to overwrite or get existing, handle carefully
           try {
             handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
           } catch {
             // caught error
           }
        } finally {
          const userRef = doc(db, 'users', currentUser.uid);
          profileUnsub = onSnapshot(userRef, (snap) => {
            if (snap.exists()) {
              setProfile(snap.data());
            } else {
              setProfile({});
            }
            setLoading(false);
          }, (error) => {
             console.error("Profile snap error", error);
             setLoading(false);
          });
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  return { user, profile, loading };
}
