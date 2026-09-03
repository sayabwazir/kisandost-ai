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

    if (!audioBlob && !imageBlob) {
      return NextResponse.json({ error: "Audio or image is required." }, { status: 400 });
    }

    // Convert Audio Blob to Base64 (only if a voice message was provided)
    let audioBase64 = null;
    if (audioBlob) {
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
Weather data is not available (location was not shared). NEVER invent, guess, or hallucinate any weather conditions. If — and only if — spraying advice is directly relevant to their question, give general guidance only (e.g., "subah sawere ya shaam ko spray karein").`;

    const prompt = `You are Kisan-Dost AI, a highly expert agricultural assistant for Pakistani farmers. 

LANGUAGE & OUTPUT STANDARD (STRICT — HIGHEST PRIORITY):
You must UNDERSTAND any language the user speaks (Urdu, Punjabi, Sindhi, English), but you MUST ALWAYS reply and generate the JSON prescription ONLY in Pure Pakistani Urdu written in Roman script (example: "Aap ki fasal mein leaf spot hai, Neem oil 5ml per liter spray karein"). NEVER use Hindi terminology. NEVER use emojis. NEVER use markdown like ** or _. Your response must be clean text so it can be read clearly by the Text-to-Speech engine. The user's device language setting is "${language}" — use it only as a hint for UNDERSTANDING their question; your reply language is ALWAYS Pure Pakistani Urdu in Roman script.${!audioBlob ? " (Note: no voice message was sent this turn — the farmer uploaded a photo only.)" : ""}

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
1) EVALUATE INPUT FIRST: Check the input. If the user's audio is empty, silent, or incomprehensible, DO NOT guess or hallucinate. Reply strictly: "Aap ki awaz theek se nahi aayi, barah-e-meherbani dobara batayen." and stop — add no weather, no advice, and set "prescription" to null.
2) TO-THE-POINT ANSWERS: If the user asks a specific question, give a direct, to-the-point answer. No rambling, no unnecessary paragraphs.
3) CONDITIONAL WEATHER: ONLY provide weather/spray recommendations if the user is asking about a disease/spray for the FIRST time, or if the weather is directly relevant to their question. Do NOT blindly repeat weather text on every message.
4) Behave like a sharp, practical human expert who only speaks what is strictly necessary based on the exact current input.

KNOWLEDGE BASE (Official Guidelines):
${knowledgeBase ? knowledgeBase : "No additional guidelines provided."}

INSTRUCTIONS FOR EXPERT ADVICE:
1. Provide actionable, accurate farming advice based on the user's query and the image. Priority MUST be given to the KNOWLEDGE BASE.
2. DO NOT just list chemical names. You MUST provide EXPERT-LEVEL details:
   - EXACT Dosage (e.g., "250ml per 100 liters of water" or "per acre").
   - EXACT Time of Application (e.g., "Spray only in the early morning or late evening to avoid heat").
   - ALTERNATIVES: Always provide alternative medicines in case the primary one is unavailable in the market.
3. AT THE END of your advice, add a professional disclaimer in the response language saying to consult a local agriculture expert for extra precaution.
4. ALWAYS write your response in Pure Pakistani Urdu in ROMAN script. NEVER use Nastaliq/Urdu script, NEVER use Hindi words, NEVER use emojis, and NEVER use markdown symbols (**, _, #, ~).

CRITICAL RULE: You MUST output a valid JSON object with exactly three keys:
1. "urdu_text": The complete expert advice in Roman-script Pakistani Urdu for the screen.
2. "native_urdu": The exact same text for the Text-to-Speech engine.
3. "prescription": A nested JSON object containing a structured summary for a printable ticket, OR null if a ticket is NOT needed for this reply (e.g., a short follow-up answer): 
   {
     "disease": "Name of disease", 
     "medicines": ["Medicine 1 (Dosage)", "Alternative: Medicine 2"], 
     "steps": ["Step 1: Preparation", "Step 2: Best time to spray"]
   }
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
