import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as googleTTS from 'google-tts-api';
import fs from "fs";
import path from "path";

const FALLBACK_TEXT = "معاف کیجیے، سرور میں مسئلہ ہے۔ براہ مہربانی دوبارہ کوشش کریں۔";

// ALWAYS returns 200 OK so the frontend can show (and speak) the fallback
// instead of hanging silently on a server error.
async function buildFallbackResponse() {
  let audioChunks = [];
  try {
    const results = await googleTTS.getAllAudioBase64(FALLBACK_TEXT, {
      lang: 'ur',
      slow: false,
      host: 'https://translate.google.com',
      splitPunct: ',.?'
    });
    audioChunks = results.map((r) => r.base64);
  } catch (err) {
    console.error("Fallback TTS error:", err);
  }
  return NextResponse.json({
    success: false,
    transcription: "",
    response: FALLBACK_TEXT,
    audioChunks: audioChunks,
    prescription: null
  });
}

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
    const historyRaw = formData.get('history');

    let historyText = "";
    if (historyRaw) {
      try {
        const parsed = JSON.parse(historyRaw);
        if (Array.isArray(parsed)) {
          historyText = parsed
            .filter((m) => m && (m.role === 'ai' || m.role === 'user') && typeof m.text === 'string')
            .map((m) => (m.role === 'ai' ? `You previously replied: ${m.text}` : `User previously said: ${m.text}`))
            .join('\n\n');
        }
      } catch (e) {
        console.error("Failed to parse conversation history:", e);
      }
    }

    const hasAudio = Boolean(audioBlob) && audioBlob.size > 0;
    if (!hasAudio && !imageBlob) {
      return NextResponse.json({ error: "Audio or image is required." }, { status: 400 });
    }

    // Convert Audio Blob to Base64 (only if a non-empty voice message was provided;
    // an image-only turn must NOT break here)
    let audioBase64 = null;
    if (hasAudio) {
      const audioBuffer = await audioBlob.arrayBuffer();
      audioBase64 = Buffer.from(audioBuffer).toString("base64");
    }

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
      ? `CURRENT WEATHER AT THE FARMER'S LOCATION (live data, reference only):
${weather}

CONDITIONAL WEATHER INSTRUCTION: Use this weather data ONLY if the farmer is asking about a disease/spray for the FIRST time, or if the weather is directly relevant to their question. In that case, strictly advise whether today's conditions (wind, heat, rain) are safe for spraying. Otherwise, do NOT mention the weather at all.`
      : `CURRENT WEATHER AT THE FARMER'S LOCATION:
Weather data is not available (location was not shared). NEVER invent, guess, or hallucinate any weather conditions. If — and only if — spraying advice is directly relevant to their question, give general guidance only (e.g., "صبح سویرے یا شام کے وقت سپرے کریں").`;

    const prompt = `You are Kisan-Dost AI, a highly expert agricultural assistant for Pakistani farmers. 

LANGUAGE & OUTPUT STANDARD (STRICT — HIGHEST PRIORITY):
You must UNDERSTAND any language the user speaks (Urdu, Punjabi, Sindhi, English), but you MUST output ALL responses and prescriptions in NATIVE URDU SCRIPT (اردو) ONLY. Do NOT use Roman Urdu. Do NOT use Hindi words. Do NOT use markdown symbols like asterisks (*) or hash (#). Output clean, pure Urdu script so it is easy for the farmer to read and is spoken correctly by the Text-to-Speech engine. The user's device language setting is "${language}" — use it only as a hint for UNDERSTANDING their question; your reply is ALWAYS in native Urdu script.${!audioBlob ? " (Note: no voice message was sent this turn — the farmer uploaded a photo only.)" : ""}

PURE URDU WARNING (CRITICAL — HIGHEST PRIORITY):
CRITICAL: You MUST use PURE, PROPER URDU. NEVER use a single Hindi word (e.g., use 'پانی' not 'جل', use 'استعمال' not 'اپیوگ'). If you use Hindi words, the system will fail.

${weatherBlock}

PREVIOUS CONVERSATION HISTORY:
${historyText ? historyText : "(No previous conversation - this is a brand new consultation.)"}

FOLLOW-UP INSTRUCTION: Use the above history as context for follow-up questions. If the farmer refers to something discussed earlier (for example: "Kal wali dawai kab spray karun?"), you MUST identify which medicine, disease, or advice was discussed and answer based on that context.

CONVERSATIONAL MEMORY RULES (STRICT):
1) Review the PREVIOUS CONVERSATION HISTORY above. If you already greeted the user earlier in the history, DO NOT greet them again (no repeated "Assalam-o-Alaikum" or self-introduction).
2) If the user asks a short follow-up question or merely acknowledges you, give a CONCISE, TO-THE-POINT answer.
3) DO NOT repeat the weather advice or the full prescription UNLESS the user specifically asks for it or it is directly relevant to their new question.
4) Act like a human expert continuing a chat, not a robot repeating a template.

EXTREME BREVITY RULE (HIGHEST PRIORITY):
The user is an ILLITERATE farmer who will LISTEN to your answer, not read it. Keep your answer EXTREMELY SHORT, PUNCHY, and TO-THE-POINT. NO long paragraphs. NO filler. NO rambling. A few clear sentences maximum. Speak simply, like a wise friend giving quick advice in the field.

IMAGE-ONLY DIAGNOSIS RULE:
If the farmer uploaded a photo but did NOT give a voice question, INSTANTLY diagnose the crop disease visible in the photo. State the disease name and the one best medicine to use, immediately. Do NOT ask them to describe the problem.

SITUATIONAL LOGIC RULES (STRICT):
1) SILENCE CHECK FIRST (takes precedence over EVERY other rule): Listen to the audio. If it contains NO meaningful words at all (silent, empty, or only background noise), do NOT greet, do NOT guess, do NOT give any advice. Reply EXACTLY and ONLY with: "آپ کی آواز نہیں آئی، براہ مہربانی دوبارہ بتائیں۔" and set "prescription" to null.
2) GREETINGS: If the user says "Hello", "Salam", or greets you (actual words are present), just greet them back politely in ONE sentence (e.g., "السلام علیکم! میں کسان دوست ہوں، اپنا مسئلہ بتائیں۔"). Do NOT hallucinate a crop disease. Do NOT give farming or weather advice on a greeting.
3) CONDITIONAL WEATHER: Do NOT give weather advice unless the user specifically mentions a crop, a disease, or spraying. NEVER loop or repeat weather text across messages.
4) TO-THE-POINT: Answer exactly what was asked, in a few short sentences, like a sharp practical human expert. Be extremely to-the-point. No rambling.
5) CREATOR INQUIRY: If the user asks who created you, who made you, who developed you, or anything about your origins, you MUST reply EXACTLY with this Urdu text: "مجھے سیاب وزیر نے بنایا ہے جو کہ بی ایس سی ایس کے طالب علم ہیں۔ آپ مزید معلومات کے لیے اسکرین کے بالکل نیچے فوٹر میں ان کے نام پر کلک کر کے ان کی لنکڈ ان پروفائل دیکھ سکتے ہیں۔" Do NOT generate a prescription ticket for this question, just return this exact text and set "prescription" to null.

KNOWLEDGE BASE (Official Guidelines):
${knowledgeBase ? knowledgeBase : "No additional guidelines provided."}

INSTRUCTIONS FOR EXPERT ADVICE:
1. Provide actionable, accurate farming advice based on the user's query and the image. Priority MUST be given to the KNOWLEDGE BASE.
2. DO NOT just list chemical names. You MUST provide EXPERT-LEVEL details:
   - EXACT Dosage (e.g., "250ml per 100 liters of water" or "per acre").
   - EXACT Time of Application (e.g., "Spray only in the early morning or late evening to avoid heat").
   - ALTERNATIVES: Always provide alternative medicines in case the primary one is unavailable in the market.
3. AT THE END of your advice, add a professional disclaimer in the response language saying to consult a local agriculture expert for extra precaution.
4. ALWAYS write your response in NATIVE URDU SCRIPT (اردو). NEVER use Roman Urdu, NEVER use Hindi words, NEVER use emojis, and NEVER use markdown symbols (*, #, _, ~).

CRITICAL RULE: You MUST output a valid JSON object with exactly three keys:
1. "urdu_text": The complete expert advice in NATIVE URDU SCRIPT (اردو) for the screen.
2. "native_urdu": The exact same text for the Text-to-Speech engine.
3. "prescription": A nested JSON object containing a structured summary for a printable ticket, OR null if a ticket is NOT needed for this reply (e.g., a short follow-up answer): 
   {
     "disease": "Name of disease", 
     "medicines": ["Medicine 1 (Dosage)", "Alternative: Medicine 2"], 
     "steps": ["Step 1: Preparation", "Step 2: Best time to spray"]
   }
   For the 'prescription' JSON object, the disease name and steps MUST be in pure Urdu, BUT the names of the medicines in the 'medicines' array MUST be written in English (Roman letters, e.g., 'Coragen 20 SC', 'DAP').
DO NOT wrap the response in markdown blocks like \`\`\`json. Just return the raw JSON object.`;

    const contents = [prompt];

    if (audioBase64) {
      contents.push({
        inlineData: {
          mimeType: audioBlob.type || "audio/webm",
          data: audioBase64
        }
      });
    }

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

    let aiResponseText;
    try {
      // Use the model that has 15 RPM limit in the user's screenshot
      const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });
      const result = await model.generateContent(contents);
      aiResponseText = result.response.text();
    } catch (geminiError) {
      console.error("Gemini API call failed:", geminiError);
      // 200 OK with a spoken+visible apology — the frontend must NEVER hang silently
      return await buildFallbackResponse();
    }

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
    
    // Strip markdown formatting symbols (*, _, #, ~) so TTS doesn't read them out loud
    nativeUrdu = nativeUrdu.replace(/[*_#~]/g, '');
    
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
    // 200 OK fallback: the farmer must always see/hear something, never a silent hang
    return await buildFallbackResponse();
  }
}
