const googleTTS = require('google-tts-api');

async function test() {
  try {
    const text = "سلام کسان بھائی! آپ کی فصل میں کیڑے کا حملہ ہوا ہے۔ براہ کرم سپرے کا استعمال کریں۔";
    const results = await googleTTS.getAllAudioBase64(text, {
      lang: 'ur',
      slow: false,
      host: 'https://translate.google.com',
      splitPunct: ',.?'
    });
    console.log(`Success! Got ${results.length} chunks of audio.`);
    console.log(results[0].base64.substring(0, 50) + "...");
  } catch (err) {
    console.error(err);
  }
}

test();
