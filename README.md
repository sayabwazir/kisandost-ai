# 🌱 KisanDost-AI (کسان دوست)
**Empowering Pakistani Farmers with a Voice-First, Multilingual AI Assistant.**  
Built for the Bano Qabil Alibaba Cloud AI Hackathon.
🔗 **[Live Demo](https://kisandost-ai.vercel.app)** 
---
## 🎯 The Problem
Agriculture is the backbone of Pakistan's economy, yet the majority of our farmers live in rural areas and lack formal education or reading/writing skills. When their crops catch a disease or they need urgent agricultural advice, they cannot use traditional text-based search engines or complicated apps. 
## 💡 The Solution
**Kisan-Dost AI** is a hyper-localized, Voice-First AI Assistant designed specifically for illiterate farmers. By breaking the literacy barrier, a farmer can simply press a button, speak in their native language (Urdu, Punjabi, Sindhi), or take a picture of a diseased crop to get instant, expert advice played back to them in a high-quality human voice.
## ✨ Key Features
- 🎙️ **Voice-In, Voice-Out:** No typing required. Press the mic, speak your problem, and listen to the AI's response in native Urdu.
- 📸 **One-Tap Crop Diagnosis:** Simply click a picture of the diseased leaf using the phone camera, and the AI instantly diagnoses the problem and recommends treatments.
- 🌍 **Multilingual Understanding:** Understands Urdu, Punjabi, Sindhi, and Roman Urdu seamlessly.
- 🌤️ **Context-Aware (Weather Integration):** Automatically fetches the farmer's real-time geolocation and weather data to advise if it's the right time to spray chemicals (e.g., avoiding windy or rainy conditions).
- 🖨️ **Printable 'Nuskha' (Prescription Ticket):** Generates a beautiful, shareable PNG ticket containing the disease name, medicines, and steps. Users can download or share it via WhatsApp with one click.
- 📱 **PWA (Progressive Web App):** Installable directly on the phone's home screen.
- 🔒 **Privacy-First:** Crop images and voice recordings are processed in memory and never saved to any database.
## 🛠️ Tech Stack
- **Frontend/Backend:** Next.js 16 (App Router), Tailwind CSS v4
- **AI/LLM:** Google Gemini 3.5 Flash Lite (via `@google/generative-ai`)
- **Voice Engine:** Google Translate TTS API
- **Utilities:** `html2canvas-pro` for ticket generation, `next-pwa`
## 🚀 How to Run Locally
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/your-repo-name.git
Install dependencies:
bash


npm install
Create a .env.local file in the root directory and add your Gemini API Key:
env


GEMINI_API_KEY=your_api_key_here
Start the development server:
bash


npm run dev
Open http://localhost:3000 with your browser to see the result.
Developed with ❤️ for the farmers of Pakistan by Sayab Wazir.



*(Copying ends here)*
**Note:** README mein jahan `https://github.com/your-username/your-repo-name.git` likha hai, wahan apni GitHub repo ka asli link daal dijiyega.
Bas ye do kaam kar lein (Kachra files delete + Naya README). Aap ki app aur GitHub profile dono **100% Hackathon-Ready** ho jayengi! Best of luck! 🚀
