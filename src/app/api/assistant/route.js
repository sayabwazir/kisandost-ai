import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as googleTTS from 'google-tts-api';
import fs from "fs";
import path from "path";

export async function POST(req) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not set on the server. Add it in Vercel project Settings > Environment Variables." },
        { status: 500 }
      );
    }
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const formData = await req.formData();
    const audioBlob = formData.get('audio');
    const imageBlob = formData.get('image');
    const language = formData.get('language') || 'Urdu/Punjabi';
    const weather = formData.get('weather');

    if (!audioBlob) {
      return NextResponse.json({ error: "Audio is required." }, { status: 400 });
    }

    // Convert Audio Blob to Base64
    const audioBuffer = await audioBlob.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");

    // RAG: Read Knowledge Base Files
    let knowledgeBase = "";
    try {
      const kbDir = path.join(process.cwd(), "src", "data", "knowledge");
      if (fs.existsSync(kbDir)) {
        const files = fs.readdirSync(kbDir);
        for (const file of files) {
          if (file.endsWith(".md") || file.endsWith(".txt")) {
            const content = fs.readFileSync(path.join(kbDir, file), "utf-8");
            knowledgeBase += `\n--- Document: ${file} ---\n${content}\n`;
          }
        }
      }
    } catch (e) {
      console.error("Failed to load Knowledge Base:", e);
    }

    const weatherBlock = weather
      ? `CURRENT WEATHER AT THE FARMER'S LOCATION (live data):
${weather}

STRICT WEATHER INSTRUCTION: Consider the provided weather conditions. If it's too windy, too hot, or raining, strictly advise the farmer on whether it is safe to spray the medicine today or not.`
      : `CURRENT WEATHER AT THE FARMER'S LOCATION:
Weather data is not available (location was not shared). Give general guidance about the best time of day to spray, and remind the farmer to avoid spraying in rain, strong wind, or extreme heat.`;

    const prompt = `You are Kisan-Dost AI, a highly expert agricultural assistant for Pakistani farmers. 
The user's requested language setting is: ${language}.
${language === 'Auto' ? 'Listen carefully to the audio. If the user speaks Punjabi, you MUST reply in pure Punjabi (using Shahmukhi/Urdu script). If they speak Sindhi, reply in Sindhi. If Urdu, reply in Urdu.' : `You MUST respond entirely in ${language}.`}

${weatherBlock}

KNOWLEDGE BASE (Official Guidelines):
${knowledgeBase ? knowledgeBase : "No additional guidelines provided."}

INSTRUCTIONS FOR EXPERT ADVICE:
1. Provide actionable, accurate farming advice based on the user's query and the image. Priority MUST be given to the KNOWLEDGE BASE.
2. DO NOT just list chemical names. You MUST provide EXPERT-LEVEL details:
   - EXACT Dosage (e.g., "250ml per 100 liters of water" or "per acre").
   - EXACT Time of Application (e.g., "Spray only in the early morning or late evening to avoid heat").
   - ALTERNATIVES: Always provide alternative medicines in case the primary one is unavailable in the market.
3. AT THE END of your advice, add a professional disclaimer in the response language saying to consult a local agriculture expert for extra precaution.
4. ALWAYS write your response in pure native script (Urdu/Punjabi in Nastaliq, Sindhi in Sindhi script). Do NOT use Roman/English alphabet.

CRITICAL RULE: You MUST output a valid JSON object with exactly three keys:
1. "urdu_text": The complete expert conversational advice in native script for the screen.
2. "native_urdu": The exact same text for the Text-to-Speech engine.
3. "prescription": A nested JSON object containing a structured summary for a printable ticket: 
   {
     "disease": "Name of disease", 
     "medicines": ["Medicine 1 (Dosage)", "Alternative: Medicine 2"], 
     "steps": ["Step 1: Preparation", "Step 2: Best time to spray"]
   }
DO NOT wrap the response in markdown blocks like \`\`\`json. Just return the raw JSON object.`;

    const contents = [
      prompt,
      {
        inlineData: {
          mimeType: audioBlob.type || "audio/webm",
          data: audioBase64
        }
      }
    ];

    if (imageBlob) {
      const imageBuffer = await imageBlob.arrayBuffer();
      const imageBase64 = Buffer.from(imageBuffer).toString("base64");
      contents.push({
        inlineData: {
          mimeType: imageBlob.type || "image/jpeg",
          data: imageBase64
        }
      });
    }

    console.log("Sending multimodal request to Gemini 3.5 Flash Lite...");
    
    // Use the model that has 15 RPM limit in the user's screenshot
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });
    const result = await model.generateContent(contents);
    
    let aiResponseText = result.response.text();
    // Clean markdown if present
    aiResponseText = aiResponseText.replace(/```json/gi, '').replace(/```/gi, '').trim();
    
    let urduText = "";
    let nativeUrdu = "";
    let prescription = null;
    
    try {
      const parsed = JSON.parse(aiResponseText);
      urduText = parsed.urdu_text || parsed.urduText || aiResponseText;
      nativeUrdu = parsed.native_urdu || parsed.nativeUrdu || aiResponseText;
      prescription = parsed.prescription || null;
    } catch (e) {
      console.log("Failed to parse JSON, falling back to raw text");
      urduText = aiResponseText;
      nativeUrdu = aiResponseText;
    }
    
    // Generate Universal Audio Chunks using Google Translate TTS
    let audioChunks = [];
    if (nativeUrdu) {
      try {
        const results = await googleTTS.getAllAudioBase64(nativeUrdu, {
          lang: 'ur',
          slow: false,
          host: 'https://translate.google.com',
          splitPunct: ',.?'
        });
        audioChunks = results.map(r => r.base64);
      } catch (err) {
        console.error("TTS Error:", err);
      }
    }

    console.log("Gemini AI Response ready, audio chunks generated:", audioChunks.length);

    return NextResponse.json({
      success: true,
      transcription: "[Voice Processed by Gemini]", 
      response: urduText,
      audioChunks: audioChunks,
      prescription: prescription
    });

  } catch (error) {
    console.error("Backend API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
