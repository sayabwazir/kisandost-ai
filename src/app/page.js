"use client";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { waitAudioBase64 } from "./waitAudio";
import html2canvas from "html2canvas";

const HISTORY_KEY = "kisandost_chat_history";

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageName, setImageName] = useState("");
  const [language, setLanguage] = useState("auto"); // auto, ur, pa, sd
  const [messages, setMessages] = useState([]);
  
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const imageFileRef = useRef(null);
  const ticketRef = useRef(null);
  const weatherPromiseRef = useRef(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // --- CONVERSATION HISTORY (localStorage) ---
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setMessages(
            parsed.filter(
              (m) => m && (m.role === "ai" || m.role === "user") && typeof m.text === "string"
            )
          );
        }
      }
    } catch (e) {
      console.warn("Could not load chat history:", e);
    }
    setHistoryLoaded(true);
  }, []);

  useEffect(() => {
    if (!historyLoaded) return;
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn("Could not save chat history:", e);
    }
  }, [messages, historyLoaded]);

  // --- CAMERA LOGIC ---
  const handleCameraClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      imageFileRef.current = file;
      const imageUrl = URL.createObjectURL(file);
      setImagePreview(imageUrl);
      setImageName(file.name);
    }
  };

  // --- WEATHER CONTEXT LOGIC ---
  const fetchWeatherContext = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      try {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude } = position.coords;
              const res = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
              );
              if (!res.ok) {
                resolve(null);
                return;
              }
              const data = await res.json();
              const cw = data.current_weather;
              if (!cw) {
                resolve(null);
                return;
              }
              const WEATHER_CODES = {
                0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
                45: "Fog", 48: "Fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
                61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain",
                80: "Rain showers", 81: "Rain showers", 82: "Heavy rain showers",
                95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with hail",
              };
              const conditions = WEATHER_CODES[cw.weathercode] || `Weather code ${cw.weathercode}`;
              resolve(`Temp: ${cw.temperature}C, Wind: ${cw.windspeed}km/h, Conditions: ${conditions}`);
            } catch (e) {
              console.error("Weather fetch failed:", e);
              resolve(null);
            }
          },
          (err) => {
            console.warn("Geolocation unavailable, proceeding without weather:", err.message);
            resolve(null);
          },
          { timeout: 8000, maximumAge: 600000 }
        );
      } catch (e) {
        console.warn("Geolocation blocked, proceeding without weather:", e);
        resolve(null);
      }
    });
  };

  // --- MIC LOGIC ---
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Is browser mein microphone support nahi hai. Barah-e-meherbani Chrome ya Safari ka latest version istemal karein.");
        return;
      }
      if (typeof MediaRecorder === "undefined") {
        alert("Is browser mein audio recording support nahi hai. Barah-e-meherbani Chrome ya Safari ka latest version istemal karein.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      weatherPromiseRef.current = fetchWeatherContext(); // Fire-and-forget while user speaks

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setIsRecording(false);
      const name = error && error.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        alert("Microphone ki ijazat nahi mili. Browser ki settings mein ja kar mic permission allow karein, phir dobara koshish karein.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        alert("Koi microphone nahi mila. Apna mic device check karein.");
      } else if (name === "NotReadableError") {
        alert("Microphone kisi aur application ke zair-e-istemal hai. Usay band kar ke dobara koshish karein.");
      } else {
        alert("Microphone kholne mein masla hua. Barah-e-meherbani dobara koshish karein.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Prevent accidental short clicks (empty audio) from sending a request
        if (audioBlob.size < 10000) {
          alert("Awaaz bohat choti thi ya record nahi hui. Barah-e-meherbani Mic daba kar theek se baat karein.");
          setIsProcessing(false);
          return;
        }

        setMessages((prev) => [...prev, { role: 'user', text: 'Audio sawal (voice message)' }]);
        sendAudioToAPI(audioBlob);
      };
      mediaRecorderRef.current.stop();
      
      // Stop all microphone tracks to release hardware and restore full volume on iOS
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      
      setIsRecording(false);
      
      // Play high-quality pre-generated Urdu voice prompt for waiting
      if (audioRef.current) {
        audioRef.current.src = `data:audio/mp3;base64,${waitAudioBase64}`;
        audioRef.current.volume = 1.0;
        audioRef.current.play().catch(e => console.error("Auto-play prevented", e));
      }
    }
  };

  const handleMicClick = () => {
    // iOS Safari Audio Unlock Hack
    if (audioRef.current) {
      audioRef.current.volume = 1.0;
      audioRef.current.play().catch(() => {});
      audioRef.current.pause();
    }

    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  };

  const downloadTicket = () => {
    window.print();
  };

  const startFresh = () => {
    try {
      window.localStorage.clear();
    } catch (e) {
      console.warn("Could not clear storage:", e);
    }
    setMessages([]);
    setImagePreview(null);
    setImageName("");
    imageFileRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (audioRef.current) audioRef.current.pause();
  };

  const sendAudioToAPI = async (audioBlob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('language', language);
      
      if (imageFileRef.current) {
        formData.append('image', imageFileRef.current);
      }

      // Attach weather context if it resolved in time; never block the request on it
      if (weatherPromiseRef.current) {
        const weatherContext = await Promise.race([
          weatherPromiseRef.current,
          new Promise((resolve) => setTimeout(() => resolve(null), 4000)),
        ]);
        if (weatherContext) {
          formData.append('weather', weatherContext);
        }
      }

      // Attach the last 3 conversation turns for follow-up context
      try {
        const recentTurns = messages.slice(-6).map((m) => ({
          role: m.role,
          text: m.text,
          ...(m.prescription ? { prescription: m.prescription } : {}),
        }));
        if (recentTurns.length > 0) {
          formData.append('history', JSON.stringify(recentTurns));
        }
      } catch (e) {
        console.warn("Could not attach conversation history:", e);
      }

      const response = await fetch('/api/assistant', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        
        // Play audio chunks sequentially
        if (data.audioChunks && data.audioChunks.length > 0) {
          let currentChunkIndex = 0;
          const playNext = () => {
            if (currentChunkIndex < data.audioChunks.length) {
              if (audioRef.current) {
                audioRef.current.src = `data:audio/mp3;base64,${data.audioChunks[currentChunkIndex]}`;
                audioRef.current.volume = 1.0;
                audioRef.current.play().catch(e => console.error(e));
                audioRef.current.onended = playNext;
              }
              currentChunkIndex++;
            }
          };
          playNext();
        }
        
        // Append the AI answer to the conversation history
        if (data.response) {
          setMessages((prev) => [...prev, { role: 'ai', text: data.response, prescription: data.prescription }]);
        }
      }
    } catch (error) {
      console.error("API Error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="flex flex-col min-h-screen bg-background font-sans relative">
      <audio ref={audioRef} className="hidden" playsInline />
      
      {/* Header */}
      <header className="bg-gradient-to-r from-agri-green via-emerald-800 to-agri-green text-white p-5 shadow-lg flex justify-between items-center rounded-b-3xl relative overflow-hidden shrink-0">
        <div className="pointer-events-none absolute top-0 right-0 w-32 h-32 bg-agri-accent rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="flex items-center gap-3 relative z-10 pointer-events-none">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(82,183,136,0.5)] overflow-hidden">
            <img src="/icons/icon.jpg" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-white to-agri-light">Kisan-Dost AI</h1>
        </div>
      </header>

      {/* Main Content Area */}
      <section className="flex-1 flex flex-col items-center justify-center p-6 gap-8 overflow-y-auto">
        
        {/* Instruction Text */}
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-agri-green mb-2">
            {isProcessing ? "AI soch raha hai..." : isRecording ? "Sun raha hoon..." : "Apna Masla Batayen"}
          </h2>
          <p className="text-gray-600 text-lg">
            {isProcessing ? "Barah-e-meherbani intezar karein" : isRecording ? "Bolna khatam karne ke liye dobara dabayen" : "Neechay button daba kar apni zaban mein baat karein."}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-6 w-full max-w-sm relative">
          
          <button 
            type="button"
            onClick={handleMicClick}
            disabled={isProcessing}
            className={`w-full flex flex-col items-center justify-center gap-3 rounded-3xl p-8 shadow-[0_10px_20px_rgba(0,0,0,0.2)] transition-all duration-300 transform active:scale-90
              ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
              ${isRecording 
                ? 'bg-red-600 border-4 border-red-800 animate-pulse shadow-red-500/50' 
                : 'bg-gradient-to-b from-agri-green to-emerald-900 border-2 border-emerald-600'
              }`}
          >
            {isRecording ? (
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-16 h-16 text-white animate-bounce">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                 <path strokeLinecap="round" strokeLinejoin="round" d="M9 9.563C9 9.252 9.252 9 9.563 9h4.874c.311 0 .563.252.563.563v4.874c0 .311-.252.563-.563.563H9.564A.562.562 0 019 14.437V9.564z" />
               </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            )}
            <span className="text-2xl font-bold tracking-wide text-white">
              {isRecording ? "Stop Recording" : "Bol Kar Batayen"}
            </span>
          </button>

          {/* Hidden File Input for Camera (Directly opens Camera) */}
          <input 
            type="file" 
            accept="image/*" 
            capture="environment"
            ref={fileInputRef} 
            onChange={handleImageChange} 
            className="hidden" 
          />
          
          {/* Hidden File Input for Gallery (Opens Files/Gallery) */}
          <input 
            type="file" 
            accept="image/*" 
            id="galleryInput"
            onChange={handleImageChange} 
            className="hidden" 
          />

          {/* Camera and Gallery Buttons */}
          <div className="flex gap-3 w-full">
            <button 
              type="button"
              onClick={handleCameraClick}
              disabled={isProcessing || isRecording}
              className="flex-1 flex flex-col items-center justify-center gap-2 bg-white border-2 border-agri-green text-agri-green hover:bg-agri-light rounded-2xl p-3 shadow-sm transition-transform transform active:scale-95 disabled:opacity-50"
            >
              <span className="text-2xl">📸</span>
              <span className="text-sm font-bold">Camera</span>
            </button>
            
            <button 
              type="button"
              onClick={() => document.getElementById('galleryInput').click()}
              disabled={isProcessing || isRecording}
              className="flex-1 flex flex-col items-center justify-center gap-2 bg-white border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-2xl p-3 shadow-sm transition-transform transform active:scale-95 disabled:opacity-50"
            >
              <span className="text-2xl">🖼️</span>
              <span className="text-sm font-bold">Gallery</span>
            </button>
          </div>

          {/* Start Fresh Button */}
          <button 
            type="button"
            onClick={startFresh}
            disabled={isProcessing || isRecording}
            className="w-full flex items-center justify-center gap-2 bg-white border-2 border-red-400 text-red-500 hover:bg-red-50 rounded-2xl p-3 shadow-sm transition-transform transform active:scale-95 disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.665 48.665 0 00-7.5 0" />
            </svg>
            <span className="text-sm font-bold">Naya Masla (Start Fresh)</span>
          </button>
        </div>
        
        {/* Image Preview Area */}
        {imagePreview && (
          <div className="mt-4 flex flex-col items-center relative z-20 w-full px-4">
            <p className="text-sm font-bold text-agri-green mb-2">Aap ki tasweer:</p>
            <div className="relative w-full max-w-[200px] aspect-square rounded-2xl overflow-hidden border-4 border-agri-accent shadow-md flex items-center justify-center bg-gray-200">
               <img src={imagePreview} alt="Crop Preview" className="object-cover w-full h-full" onError={(e) => e.target.style.display = 'none'} />
               <span className="absolute text-xs text-gray-500 text-center px-2">{imageName}</span>
            </div>
            <button 
              type="button"
              onClick={() => {
                setImagePreview(null);
                setImageName("");
                imageFileRef.current = null;
                if(fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="mt-4 px-6 py-2 bg-red-100 text-red-600 rounded-full text-sm font-bold shadow-sm"
            >
              Tasweer Hataen (Cancel)
            </button>
          </div>
        )}

        {/* Nuskha Ticket / Answers */}
        <div className="w-full max-w-sm px-2 pb-6 flex flex-col items-center">
          {messages.map((msg, idx) => (
             <div key={idx} className="w-full">
               {msg.role === 'user' ? (
                 <div className="flex justify-end mt-4">
                   <div className="bg-agri-green text-white rounded-2xl rounded-br-sm shadow-md p-3 max-w-[85%] text-sm font-medium">
                     🎤 {msg.text}
                   </div>
                 </div>
               ) : (
               <>
               {/* AI Text Response */}
               <div className="bg-white rounded-xl shadow-md p-4 mt-4 border border-agri-green/20">
                 <h3 className="text-agri-green font-bold text-lg mb-2">AI Nuskha:</h3>
                 <p className="text-gray-700 whitespace-pre-wrap">{msg.text}</p>
               </div>
               
               {/* Prescription Ticket for Download */}
               {msg.prescription && (
                 <>
                   <div ref={ticketRef} className="printable-card bg-amber-50 rounded-lg p-5 mt-4 border-2 border-dashed border-amber-300 shadow-sm relative">
                     <div className="absolute top-0 right-0 p-2 opacity-20">🌱</div>
                     <h2 className="text-center text-xl font-black text-amber-800 border-b-2 border-amber-200 pb-2 mb-3">
                       Kisan-Dost Ticket
                     </h2>
                     <p className="font-bold text-lg text-red-600 mb-2">Bemari: <span className="font-normal text-black">{msg.prescription.disease}</span></p>
                     
                     {msg.prescription.medicines && msg.prescription.medicines.length > 0 && (
                       <div className="mb-3">
                         <p className="font-bold text-emerald-800 border-b border-emerald-100 mb-1">Adwiyaat (Medicines):</p>
                         <ul className="list-disc pl-5 text-gray-800">
                           {msg.prescription.medicines.map((med, i) => <li key={i}>{med}</li>)}
                         </ul>
                       </div>
                     )}
                     
                     {msg.prescription.steps && msg.prescription.steps.length > 0 && (
                       <div>
                         <p className="font-bold text-blue-800 border-b border-blue-100 mb-1">Hidayat (Instructions):</p>
                         <ul className="list-disc pl-5 text-gray-800">
                           {msg.prescription.steps.map((step, i) => <li key={i}>{step}</li>)}
                         </ul>
                       </div>
                     )}
                   </div>
                   
                   <button 
                     onClick={downloadTicket}
                     className="mt-3 w-full bg-agri-accent hover:bg-agri-green text-white font-bold py-3 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                     </svg>
                     PDF / Image Download Karein
                   </button>
                 </>
               )}
               </>
               )}
             </div>
          ))}
        </div>

      </section>

      {/* Language Selector Footer */}
      <footer className="bg-white p-4 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] mt-auto shrink-0 z-10 border-t border-gray-100">
        <p className="text-center text-sm text-gray-600 font-medium mb-3">Zaban Muntakhib Karein (Select Language)</p>
        <div className="flex flex-wrap justify-center gap-2 pb-2">
          <button onClick={() => setLanguage("auto")} className={`px-4 py-2 text-sm rounded-full font-bold shadow-sm transition border ${language === 'auto' ? 'bg-agri-green text-white border-agri-green' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200'}`}>🤖 Auto</button>
          <button onClick={() => setLanguage("ur")} className={`px-4 py-2 text-sm rounded-full font-bold shadow-sm transition border ${language === 'ur' ? 'bg-agri-green text-white border-agri-green' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200'}`}>🇵🇰 Urdu</button>
          <button onClick={() => setLanguage("pa")} className={`px-4 py-2 text-sm rounded-full font-bold shadow-sm transition border ${language === 'pa' ? 'bg-agri-green text-white border-agri-green' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200'}`}>🌾 Punjabi</button>
          <button onClick={() => setLanguage("sd")} className={`px-4 py-2 text-sm rounded-full font-bold shadow-sm transition border ${language === 'sd' ? 'bg-agri-green text-white border-agri-green' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200'}`}>🐪 Sindhi</button>
        </div>
      </footer>
    </main>
  );
}
