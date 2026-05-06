/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Modality } from "@google/genai";

// Standard PCM 16-bit Mono @ 24kHz (as specified by Gemini TTS service)
const SAMPLE_RATE = 24000;

export interface SpeechSegment {
  speaker: 'Customer' | 'Agent';
  text: string;
  tone?: string;
  pauseAfter: number; // in milliseconds
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Converts a base64 PCM string to an AudioBuffer
 */
function base64ToAudioBuffer(base64: string, ctx: AudioContext): Promise<AudioBuffer> {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // PCM 16-bit means 2 bytes per sample
  const floatData = new Float32Array(len / 2);
  const view = new DataView(bytes.buffer);
  
  for (let i = 0; i < floatData.length; i++) {
    // Read 16-bit signed integer and normalize to [-1, 1]
    const pcmSample = view.getInt16(i * 2, true);
    floatData[i] = pcmSample / 32768;
  }
  
  const buffer = ctx.createBuffer(1, floatData.length, SAMPLE_RATE);
  buffer.getChannelData(0).set(floatData);
  return Promise.resolve(buffer);
}

export async function generateSpeech(text: string, speaker: 'Customer' | 'Agent'): Promise<AudioBuffer> {
  const voiceName = speaker === 'Agent' ? 'Kore' : 'Puck'; // Kore (Female-ish), Puck (Male-ish/Youthful)
  
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-tts-preview",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new Error("No audio data received from Gemini API");
  }

  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return base64ToAudioBuffer(base64Audio, audioCtx);
}

export const conversationScript: SpeechSegment[] = [
  {
    speaker: 'Customer',
    tone: 'slightly frustrated but calm',
    text: "Hi, I want to cancel my subscription. I’m not really using it anymore, so just go ahead and cancel it for me.",
    pauseAfter: 1000
  },
  {
    speaker: 'Agent',
    tone: 'calm, professional',
    text: "I can definitely help you with that. Let me pull up your account and process the cancellation request for you.",
    pauseAfter: 1500
  },
  {
    speaker: 'Agent',
    tone: 'reading screen',
    text: "Alright, I can see your subscription here. I’m going to submit a cancellation request now. This will send a secure cancellation link to your email on file.",
    pauseAfter: 3500 // combined pauses from the prompt [0.8 + 1.5 + 1.5 + system action 2s]
  },
  {
    speaker: 'Agent',
    tone: 'clear explanation',
    text: "Just so you’re aware, for security reasons we don’t cancel subscriptions directly on the call. Instead, you’ll receive an email with a secure link. Once you click that link and confirm, your subscription will be canceled immediately.",
    pauseAfter: 1800
  },
  {
    speaker: 'Customer',
    tone: 'slightly confused',
    text: "Oh… okay. So I have to do something after this call?",
    pauseAfter: 1000
  },
  {
    speaker: 'Agent',
    tone: 'reassurance',
    text: "Yes, exactly. It only takes a few seconds. It’s just a confirmation step to make sure the cancellation is authorized by the account holder.",
    pauseAfter: 1800
  },
  {
    speaker: 'Customer',
    text: "Alright, I understand.",
    pauseAfter: 1000
  },
  {
    speaker: 'Agent',
    tone: 'closing tone',
    text: "Perfect. You should receive that email shortly. Once you complete it, your subscription will be fully canceled. Is there anything else I can help you with today?",
    pauseAfter: 1500
  },
  {
    speaker: 'Customer',
    text: "No, that’s it.",
    pauseAfter: 1000
  },
  {
    speaker: 'Agent',
    tone: 'professional close',
    text: "Alright, thank you for calling. Have a great day.",
    pauseAfter: 0
  }
];
