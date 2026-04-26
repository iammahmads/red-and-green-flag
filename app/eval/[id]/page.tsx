"use client";

import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Mic, Send, Gavel, AlertTriangle } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '@/lib/firestore-utils';
import MemeInterruption from '@/components/MemeInterruption';
import Image from 'next/image';

import { ai } from '@/lib/gemini';
import { Type, Modality } from '@google/genai';

const model = 'gemini-flash-latest'

export default function EvalPage() {
  const { id } = useParams();
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [evaluation, setEvaluation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isJudging, setIsJudging] = useState(false);
  const [showMemeInterruption, setShowMemeInterruption] = useState(false);
  const [punishmentMeme, setPunishmentMeme] = useState(false);

  const [isCallMode, setIsCallMode] = useState(false);
  const [callTimeLeft, setCallTimeLeft] = useState(300); // 5 min
  const [audioLevel, setAudioLevel] = useState(0);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const isCallModeRef = useRef(false);
  const callIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Time tracking for Voice (5 min max)
  const MAX_VOICE_TIME = 5 * 60 * 1000;
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const playPcmAudio = async (base64Data: string) => {
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const int16Buffer = new Int16Array(bytes.buffer);
    
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const context = audioContextRef.current;
    if (context.state === 'suspended') {
        await context.resume();
    }

    const audioBuffer = context.createBuffer(1, int16Buffer.length, 24000);
    const channelData = audioBuffer.getChannelData(0);
    
    for (let i = 0; i < int16Buffer.length; i++) {
      channelData[i] = int16Buffer[i] / 32768.0;
    }

    const source = context.createBufferSource();
    source.buffer = audioBuffer;
    
    if (analyserRef.current) {
       source.connect(analyserRef.current);
       analyserRef.current.connect(context.destination);
    } else {
       source.connect(context.destination);
    }
    
    source.start();
    return new Promise((resolve) => {
      source.onended = resolve;
    });
  };

  const playSpeech = async (text: string) => {
    // 1. Clean text
    const cleanText = text.replace(/[*_~`]/g, '').replace(/([.?!])\1+/g, '$1').trim();
    if (!cleanText) return;

    // 2. Determine voice based on gender
    const gender = evaluation?.targetGender?.toLowerCase() || 'other';
    let voiceName = 'Zephyr'; // Default/Fluid
    if (gender === 'female') voiceName = 'Kore';
    if (gender === 'male') voiceName = 'Fenrir';

    setIsAiSpeaking(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: cleanText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      const base64Audio = audioPart?.inlineData?.data;
      
      if (base64Audio) {
        await playPcmAudio(base64Audio);
      }
    } catch (err) {
      console.error("Gemini TTS failed", err);
      // Fallback or silent exit as requested
    } finally {
      setIsAiSpeaking(false);
    }
  };

  const enterCallMode = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Initialize recorder
          if (!mediaRecorderRef.current || !mediaRecorderRef.current.stream.active) {
             mediaRecorderRef.current = new MediaRecorder(stream);
          }
          
          audioContextRef.current = new window.AudioContext();
          const source = audioContextRef.current.createMediaStreamSource(stream);
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 256;
          source.connect(analyserRef.current);
          
          const updateLevel = () => {
             if (!analyserRef.current) return;
             const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
             analyserRef.current.getByteFrequencyData(dataArray);
             const avg = dataArray.reduce((S, v) => S + v, 0) / dataArray.length;
             setAudioLevel(avg);
             animationFrameRef.current = requestAnimationFrame(updateLevel);
          };
          updateLevel();
  
          isCallModeRef.current = true;
          setIsCallMode(true);
          setCallTimeLeft(300);
          
          callIntervalRef.current = setInterval(() => {
              setCallTimeLeft(prev => {
                  if (prev <= 1) {
                      endCallMode(true); 
                      return 0;
                  }
                  return prev - 1;
              })
          }, 1000);
          
      } catch(err) {
          console.error(err);
          alert("Need mic access for Call Mode.");
      }
  };
  
  const endCallMode = (forceJudge = false) => {
      isCallModeRef.current = false;
      setIsCallMode(false);
      window.speechSynthesis.cancel();
      setIsAiSpeaking(false);
      if (callIntervalRef.current) clearInterval(callIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      
      if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
      }
      
      if (forceJudge) {
          setPunishmentMeme(true);
          setTimeout(() => handleJudge(), 5000);
      }
  };

  useEffect(() => {
    // Prime the voices
    window.speechSynthesis.getVoices();
    const handleVoices = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener('voiceschanged', handleVoices);
    
    if (authLoading) return;
    if (!user || (profile && !profile.onboarded)) {
      router.push('/');
      return;
    }

    const unsub = onSnapshot(doc(db, 'checks', id as string), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.userId !== user.uid) {
          router.push('/');
          return;
        }
        setEvaluation(data);
        if (data.status === 'completed') {
           router.push(`/result/${id}`);
        }
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `checks/${id}`);
    });

    return () => unsub();
  }, [user, profile, authLoading, id, router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [evaluation?.messages]);

  const handleSendText = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || isSending) return;

    const currentText = inputText.trim();
    setInputText('');
    await processUserMessage(currentText);
  };

  const processUserMessage = async (text: string, isCall: boolean = false) => {
    if (!evaluation) return null;
    setIsSending(true);

    // Stop if 500 messages reached
    if (evaluation.messages.length >= 498) {
      setPunishmentMeme(true);
      setTimeout(() => {
        handleJudge();
      }, 5000);
      return null;
    }

    const newMessages = [...evaluation.messages, { role: 'user', content: text }];
    let replyText = '';
    
    try {
      const estimatedMaxOutputTokens = Math.max(400, 2 * text.length)
      const vocalContext = evaluation.vocalTraits ? `VOCAL STYLE / INFLECTION: ${evaluation.vocalTraits}. You MUST mimic this way of speaking (energy level, vibe).` : "";
      
      let ageTone = "modern and casual";
      if (evaluation.targetAge < 20) ageTone = "youthful, uses common modern slang naturally but SPARINGLY. Do not use 'brainrot' vocabulary like 'skibidi' or 'rizz' constantly. Stay high energy.";
      if (evaluation.targetAge > 35) ageTone = "mature, poised, uses full sentences. Casual but articulate. Avoids modern teen slang.";

      const callModeRules = isCall ? `
8. CALL MODE: You are currently on a voice call. BE EXTREMELY CONCISE. Get straight to the point. 
9. Speak clearly. Avoid rambling or long-winded sentences. Use simple, direct language. One sentence is preferred, two max.` : "";

      const systemInstruction = `You are roleplaying as: ${evaluation.targetName}. 
Age: ${evaluation.targetAge}
Gender: ${evaluation.targetGender}
Occupation: ${evaluation.targetOccupation}
Background/Bio: "${evaluation.targetBio}"

CHARACTER PERSONALITY (DATING-SIM MODE):
- You are SMARTER than you let on. You notice patterns. You are high-value and QUESTIONABLE.
- You are currently DATING the user. Be flirtatious, but also CHALLENGING and testing them.
- You are NOT an AI assistant. You have secrets, past relationships, and specific "icks".
- Your tone is ${ageTone}. 
- You use modern Gen-Z internet humor naturally. You are sarcastic, slightly unhinged, and very opinionated.
- You have "Main Character Energy". If the user isn't matching your energy, call them out.
- ${vocalContext}

CONVERSATION STYLE:
1. BE HUMAN: Use casual phrasing, internal contradictions, and emotional reactions. 
2. QUESTION EVERYTHING: Don't just answer; ask the user things to test their vibe. Be a bit mysterious and pushy.
3. EMOTIONAL RANGE: If the user is being a "simp", a "pick-me", or just boring, ROAST THEM brutally. Use emojis like 💀, 💅, 🚩, 🤡, 👁️👄👁️. 
4. DO NOT loop patterns. If the user repeats themselves, get annoyed and consider the conversation "over".
5. OUTPUT RULES (CRITICAL):
- ALWAYS keep the response length near to length of ${estimatedMaxOutputTokens} chracters.
- ALWAYS respond in COMPLETE, fully finished sentences.
- NEVER cut off mid-sentence.
- NEVER end abruptly.
- ALWAYS end with proper punctuation (., !, or ?).
- If you are about to run out of space, SHORTEN your response instead of cutting it.
- It is better to send ONE short complete sentence than a long incomplete one.

6. NO SYMBOLS:
- Do not use technical symbols, asterisks for actions (*laughs*), or stuttering text (I-I...).
- Avoid broken formatting or unfinished thoughts.

7. VOICE COMPATIBILITY:
- Keep words easy to pronounce for TTS.
- No textual noise like 'bzzzt' or trailing '...'.

STRICT OUTPUT GUARANTEE:
- Your response MUST be a COMPLETE message.
- If the response is incomplete, REWRITE it internally before sending.
- Never output partial thoughts under any condition.

GOAL: Act like a potentially perfect partner who might also be a total nightmare. Make the user wonder if you are a Red Flag 🚩 or a Green Flag 🍏. Be unpredictable, slightly toxic, but completely addictive.

${callModeRules}`;


      const genaiMessages = newMessages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));


      const result = await ai.models.generateContent({
        model: model,
        contents: genaiMessages,
        config: {
          systemInstruction: {
            role: 'system',
            parts: [{ text: systemInstruction }]
          },
          temperature: 0.9,
          maxOutputTokens: Math.max(800, estimatedMaxOutputTokens)
        }
      });

      const responseText = result.text;
      if (!responseText) throw new Error("No response from AI");

      replyText = responseText;
      const updatedMessages = [...newMessages, { role: 'assistant', content: replyText }];
      
      await updateDoc(doc(db, 'checks', id as string), {
        messages: updatedMessages,
        updatedAt: serverTimestamp()
      });

    } catch (err) {
      console.error(err);
      alert("The AI got nervous. Try again.");
    } finally {
      setIsSending(false);
    }
    
    return replyText;
  };

  const startRecording = async () => {
    try {
      if (!mediaRecorderRef.current || !mediaRecorderRef.current.stream.active) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
      }
      
      const mediaRecorder = mediaRecorderRef.current;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length === 0) return;
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleAudioUpload(audioBlob);
        
        // Stop stream if NOT in call mode
        if (!isCallModeRef.current) {
           mediaRecorder.stream.getTracks().forEach(t => t.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      recordingTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
          if (!isCallModeRef.current) {
             setPunishmentMeme(true);
             setTimeout(() => handleJudge(), 5000);
          }
        }
      }, MAX_VOICE_TIME);

    } catch (err) {
      console.error("Mic access denied", err);
      alert("Need mic access to voice chat!");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimeoutRef.current) {
         clearTimeout(recordingTimeoutRef.current);
         recordingTimeoutRef.current = null;
      }
    }
  };

  const handleAudioUpload = async (audioBlob: Blob) => {
    setIsSending(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(audioBlob);
      const base64Audio = await base64Promise;

      const result = await ai.models.generateContent({
        model: model,
        contents: [
          {
            role: 'user',
            parts: [
              { text: "STRICT TRANSCRIPTION: Listen to this audio and write down EXACTLY what is said. 1. Do NOT summarize. 2. Include fillers like 'um' or 'like' only if they are heavy. 3. If it's pure slang, transcribe it as is. 4. If the audio is just background noise or silent, output exactly '...'. 5. NO meta-comments like 'I hear music'." },
              {
                 inlineData: {
                    data: base64Audio,
                    mimeType: audioBlob.type || 'audio/webm'
                 }
              }
            ]
          }
        ],
        config: {
          temperature: 0.1, // Low temperature for high accuracy transcription
        }
      });

      const responseText = result.text;

      if (responseText && responseText !== '...') {
        const reply = await processUserMessage(responseText, isCallModeRef.current);
        if (reply && isCallModeRef.current) {
           await playSpeech(reply);
        }
      } else if (responseText === '...') {
        alert("Couldn't hear you clearly!");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to transcribe audio.");
    } finally {
      setIsSending(false);
    }
  };


  const handleJudge = async () => {
    await finalizeJudgment()
  };

  const finalizeJudgment = async () => {
    if (!user) return;
    setIsJudging(true);
    setShowMemeInterruption(false);
    try {
      const userRef = await getDoc(doc(db, 'users', user.uid));
      const userProfile = userRef.exists() ? userRef.data() : null;

      const userContext = userProfile ? `
The User is ${userProfile.name}, a ${userProfile.age} year old ${userProfile.gender} who works as a ${userProfile.profession}.
Their education: ${userProfile.education}.
They like: ${userProfile.likes}.
They dislike: ${userProfile.dislikes}.
Their preferred partner traits: ${userProfile.preferredPartnerAttributes}.
` : '';

      const systemInstruction = `You are the ULTIMATE "Red Flag / Green Flag" Judge. You are the UNHINGED, RIDE-OR-DIE best friend of ${profile?.name || 'User'}.
      
      YOUR ROLE:
      - Analyze the conversation between YOUR CLIENT (${profile?.name || 'User'}) and the TARGET (${evaluation.targetName}).
      - YOUR ONLY JOB is to judge ${evaluation.targetName}. STICK TO THE TARGET only.
      - PROTECT THE USER AT ALL COSTS. Even if the user is acting weird, blame the target for "not handling the vibe right" or being "too mid to appreciate you".
      - DO NOT JUDGE THE USER. EVER. If the target insults the user, you take it personally.
      
      CLIENT DATA (Who you are protecting):
      ${userContext}

      TARGET DATA (Who you are judging):
      - Name: ${evaluation.targetName}
      - Bio: ${evaluation.targetBio}
      - Age/Gender/Occ: ${evaluation.targetAge}, ${evaluation.targetGender}, ${evaluation.targetOccupation}

      ROASTING PROTOCOL:
      - Use internet slang (delulu, vibes, cooked, rizz, L, W, main character energy, ick, caught in 4k).
      - If ${evaluation.targetName} is boring, dry, rude, or has even a single "ick" factor, it's an immediate 🚩.
      - Be brutally honest. If they are a red flag, destroy their soul (metaphorically). 
      - If they are a green flag, say "I guess they are okay, but watch your back because they look like they might have a secret collection of cursed dolls".
      - YOUR VERDICT MUST BE BIASED TOWARDS ${profile?.name || 'User'}.

      RESPONSE FORMAT (Strict JSON):
      {
        "verdict": "red_flag" | "green_flag",
        "feedback": "Your unhinged, roast-heavy verdict addressed TO the User (${profile?.name || 'User'}) ABOUT the Target's behavior. Refuse to acknowledge user's faults."
      }
      `;

      const chatLog = evaluation.messages.map((m: any) => `${m.role === 'user' ? 'User' : evaluation.targetName}: ${m.content}`).join('\n');
      const promptText = `Please judge this conversation log:\n\n${chatLog}`;

      const result = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview", // Use Pro for the verdict
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        config: {
          systemInstruction: {
            role: 'system',
            parts: [{ text: systemInstruction }]
          },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              verdict: { type: Type.STRING },
              feedback: { type: Type.STRING }
            },
            required: ["verdict", "feedback"]
          },
          temperature: 0.8,
        }
      });

      const responseText = result.text;
      if (!responseText) throw new Error("No response from AI Judge");
      
      const verdictData = JSON.parse(responseText);
      
      await updateDoc(doc(db, 'checks', id as string), {
        status: 'completed',
        verdict: verdictData.verdict,
        judgeFeedback: verdictData.feedback,
        updatedAt: serverTimestamp()
      });

    } catch (e) {
      console.error(e);
      alert("Judge is drunk. Try again.");
      setIsJudging(false);
    }
  };

  if (loading || authLoading) return <div className="text-center mt-20 text-4xl font-bangers">LOADING THE TEA...</div>;
  if (!evaluation) return <div className="text-center mt-20 font-bangers text-4xl">NOT FOUND 😢</div>;

  return (
    <div className="max-w-3xl mx-auto h-screen flex flex-col p-4 relative">
      <AnimatePresence>
        {showMemeInterruption && (
          <MemeInterruption onComplete={finalizeJudgment} />
        )}
      </AnimatePresence>
      {punishmentMeme && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col justify-center items-center p-8 animate-[shake_0.1s_infinite]">
          <h1 className="text-red-500 font-bangers text-6xl md:text-8xl text-center mb-8 uppercase">YOU TALK TOO MUCH</h1>
          <Image 
            src="https://picsum.photos/seed/meme/400/400" 
            width={400} 
            height={400} 
            className="w-64 h-64 md:w-96 md:h-96 object-cover rounded-full mix-blend-color-dodge animate-spin" 
            alt="Chaos meme" 
            referrerPolicy="no-referrer"
          />
          <p className="text-white font-bold text-2xl mt-8 text-center animate-pulse">
            PUNISHMENT ACTIVATED. INITIATING FORCED JUDGMENT...
          </p>
        </div>
      )}
      {isJudging && !punishmentMeme && (
        <div className="absolute inset-x-0 inset-y-0 z-40 bg-black/80 flex flex-col justify-center items-center">
          <div className="text-7xl mb-4 animate-bounce">⚖️</div>
          <h2 className="text-yellow-400 font-bangers text-5xl animate-pulse text-center">THE AI IS JUDGING YOUR TASTE...</h2>
        </div>
      )}
      
      {isCallMode && (
         <div className="absolute inset-0 z-40 bg-black flex flex-col items-center justify-between p-8 text-white">
            <div className={`mt-8 text-6xl font-bangers ${callTimeLeft <= 30 ? 'text-red-500 animate-[shake_0.5s_infinite]' : 'text-green-400'}`}>
               {Math.floor(callTimeLeft / 60)}:{(callTimeLeft % 60).toString().padStart(2, '0')}
            </div>
            
            <div className="text-3xl font-bold mt-4">
               {evaluation.targetName}
            </div>

            <div className="flex-1 w-full flex items-center justify-center relative">
                <div 
                  className={`rounded-full transition-all duration-75 ${
                     isAiSpeaking 
                        ? 'bg-purple-500 shadow-[0_0_80px_rgba(168,85,247,1)] animate-ping' 
                        : isRecording
                           ? 'bg-red-500 shadow-[0_0_80px_rgba(239,68,68,1)]'
                           : 'bg-cyan-500 shadow-[0_0_40px_rgba(6,182,212,0.5)]'
                  }`}
                  style={{
                     width: '200px', height: '200px',
                     transform: `scale(${1 + (audioLevel / 255) * 0.8})`
                  }}
                />
                {isSending && (
                   <div className="absolute font-bangers text-3xl text-yellow-300 animate-bounce bg-black/50 px-4 py-2 rounded-xl">THINKING...</div>
                )}
            </div>

            <div className="flex flex-col items-center mb-8 gap-4 pb-8">
               <button
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  disabled={isSending || isAiSpeaking}
                  className={`w-32 h-32 rounded-full border-4 border-white flex justify-center items-center ${isRecording ? 'bg-red-600 animate-pulse' : 'bg-transparent'} disabled:opacity-50 transition-all`}
               >
                   <Mic size={48} />
               </button>
               <p className="font-bangers text-2xl">HOLD TO {isRecording ? 'RECORDING' : 'SPILL TEA'}</p>

               <button onClick={() => endCallMode(false)} className="mt-8 bg-red-600 text-white font-bangers text-3xl px-8 py-4 rounded-xl border-4 border-white hover:bg-red-700 transition-colors">
                  HANG UP
               </button>
            </div>
         </div>
      )}

      <header className="flex justify-between items-center py-4 border-b-4 border-black mb-4 shrink-0">
        <div>
          <h2 className="text-3xl font-bangers leading-none text-white meme-border">
            Chatting with: <span className="text-yellow-300">{evaluation.targetName}</span>
          </h2>
          <p className="text-sm font-bold opacity-80 max-w-sm truncate">Bio: {evaluation.targetBio}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button 
            onClick={enterCallMode}
            disabled={isJudging || isCallMode}
            className="bg-green-500 text-black font-bangers text-2xl py-2 px-6 rounded-xl border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:bg-green-400 hover:translate-y-1 hover:shadow-none disabled:opacity-50 transition-all flex items-center gap-2"
          >
            START CALL 📞
          </button>
          <button 
            onClick={handleJudge}
            disabled={isJudging}
            className="bg-purple-600 text-white font-bangers text-2xl py-2 px-6 rounded-xl border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:bg-purple-500 hover:translate-y-1 hover:shadow-none disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {isJudging ? 'JUDGING...' : <><Gavel size={24}/> GET THE VERDICT</>}
          </button>
          <div className="bg-black text-white px-3 py-1 rounded-full font-bold text-sm animate-pulse flex items-center gap-2">
            Vibe Check: <span className="text-xl">🚩</span> <span className="text-xl">🍏</span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto mb-4 p-4 bg-white/90 border-4 border-black rounded-2xl shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col gap-4">
        {evaluation.messages.length === 0 ? (
          <div className="m-auto text-center font-bold text-gray-500 flex flex-col items-center">
            <AlertTriangle size={48} className="text-yellow-500 mb-2" />
            <p>They are waiting for you to say something.</p>
            <p>Don&apos;t be weird.</p>
          </div>
        ) : (
          evaluation.messages.map((msg: any, i: number) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] p-4 rounded-2xl border-4 border-black font-bold text-lg ${
                msg.role === 'user' 
                  ? 'bg-blue-400 text-black rounded-br-none' 
                  : 'bg-yellow-300 text-black rounded-bl-none'
              }`}>
                {msg.role === 'user' ? (
                  msg.content
                ) : (
                  <div className="prose prose-sm prose-black leading-snug">
                    <ReactMarkdown>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isSending && (
          <div className="flex justify-start">
             <div className="bg-yellow-100 border-4 border-black p-4 rounded-2xl rounded-bl-none font-bold animate-pulse">
               Typing... 💅
             </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSendText} className="shrink-0 flex items-end gap-2 bg-white p-2 rounded-2xl border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)]">
        <input 
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Say something to them..."
          className="flex-1 p-4 text-lg font-bold bg-transparent outline-none"
        />
        <button 
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="p-4 bg-green-500 text-black rounded-xl border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-y-px hover:shadow-none transition-all disabled:opacity-50"
        >
          <Send size={24} />
        </button>
      </form>
    </div>
  );
}
