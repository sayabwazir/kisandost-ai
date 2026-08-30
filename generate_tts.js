const googleTTS = require('google-tts-api');
const fs = require('fs');

async function generate() {
  const text = "آپ کا مسئلہ دیکھا جا رہا ہے۔ براہ کرم ذرا انتظار کریں۔";
  const results = await googleTTS.getAllAudioBase64(text, {
    lang: 'ur',
    slow: false,
    host: 'https://translate.google.com',
  });
  
  const output = `export const waitAudioBase64 = "${results[0].base64}";`;
  fs.writeFileSync('src/app/waitAudio.js', output, 'utf8');
  console.log("Done");
}
generate();
