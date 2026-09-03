<div align="center">
  
# 🌱 Kisan-Dost AI (کسان دوست)

**Empowering Pakistani Farmers with a Voice-First, Multilingual AI Assistant.**  
*Built for the Bano Qabil Alibaba Cloud AI Hackathon.*

[![Next.js](https://img.shields.io/badge/Built_with-Next.js-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Gemini](https://img.shields.io/badge/AI-Google_Gemini-blue?style=for-the-badge&logo=google)](https://ai.google.dev/)
[![Tailwind](https://img.shields.io/badge/Styled_with-Tailwind-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

<h3>🔗 <a href="https://kisandost-ai.vercel.app">Click Here to View Live Demo</a> 🔗</h3>

> 🚨 **IMPORTANT NOTE FOR MOBILE USERS (JUDGES):**  
> If you are opening this on a mobile phone, please open the link in **Chrome or Safari**. The internal browsers of apps like GitHub or LinkedIn **block Microphone and Location permissions**, which are required for the AI to work.

</div>

---

## 🎯 The Problem
Agriculture is the backbone of Pakistan's economy, yet the majority of our farmers live in rural areas and lack formal education or reading/writing skills. When their crops catch a disease or they need urgent agricultural advice, they cannot use traditional text-based search engines or complicated apps. 

## 💡 The Solution
**Kisan-Dost AI** is a hyper-localized, Voice-First AI Assistant designed specifically for illiterate farmers. By breaking the literacy barrier, a farmer can simply press a button, speak in their native language (Urdu, Punjabi, Sindhi), or take a picture of a diseased crop to get instant, expert advice played back to them in a high-quality human voice.

## ✨ Key Features
- 🎙️ **Voice-In, Voice-Out:** No typing required. Press the mic, speak your problem, and listen to the AI's response in native Urdu.
- 📸 **One-Tap Crop Diagnosis:** Simply click a picture of the diseased leaf, and the AI instantly diagnoses the problem and recommends treatments.
- 🌍 **Multilingual Understanding:** Understands Urdu, Punjabi, Sindhi, and Roman Urdu seamlessly.
- 🌤️ **Context-Aware (Weather Integration):** Automatically fetches the farmer's real-time geolocation and weather data to advise if it's the right time to spray chemicals.
- 🖨️ **Printable 'Nuskha' (Prescription):** Generates a beautiful, shareable PNG ticket containing the disease name, medicines, and steps.
- 📱 **PWA (Progressive Web App):** Installable directly on the phone's home screen.
- 🔒 **Privacy-First:** Crop images and voice recordings are processed in memory and never saved to any database.

## 🛠️ How to Run Locally

If you want to run this project on your local machine, follow these steps:

**Step 1: Clone the repository**
```bash
git clone https://github.com/your-username/your-repo-name.git
```

**Step 2: Install dependencies**
```bash
npm install
```

**Step 3: Set up Environment Variables**
Create a `.env.local` file in the root directory and add your Gemini API Key:
```env
GEMINI_API_KEY=your_api_key_here
```

**Step 4: Start the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---
<div align="center">
<i>Developed with ❤️ for the farmers of Pakistan by Syab Wazir.</i>
</div>
