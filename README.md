# Red Green Flag 🚩🍏

A meme-style AI dating analyzer where an AI simulates your crush and a Judge AI gives you the ultimate Red Flag or Green Flag verdict.

## Features

- **AI Target Simulation**: Simulates a crush/dating prospect based on a profile you describe.
- **Voice & Text Chat**: Talk to the simulated AI target using speech-to-text and text-to-speech, simulating a real call.
- **Judge AI**: A brutal, unhinged "best friend" AI that roasts the target and gives a red flag/green flag verdict based on the conversation.
- **Punishment System**: A meme punishment screen if the user talks too much or hits the daily usage limits.
- **Voice Sample Analysis**: Upload an audio file and let Gemini analyze the voice traits for the simulation.
- **Authentication & Persistence**: Powered by Firebase Auth and Firestore to track user profiles and evaluation limits.


## Tech Stack

- **Frontend**: Next.js (App Router), React, Tailwind CSS
- **AI Services**: Google Gemini API (`@google/genai`)
- **Backend & Storage**: Firebase Authentication, Cloud Firestore
- **Animations**: Motion (Framer Motion)
