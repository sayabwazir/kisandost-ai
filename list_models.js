const https = require('https');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const keyMatch = envContent.match(/GEMINI_API_KEY=(.*)/);
if (!keyMatch) {
  console.log("No API key found");
  process.exit(1);
}
const apiKey = keyMatch[1].trim();

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log("AVAILABLE MODELS:");
      if (parsed.models) {
        parsed.models.forEach(m => {
          if (m.name.includes('gemini')) {
            console.log(`- ${m.name} (methods: ${m.supportedGenerationMethods.join(', ')})`);
          }
        });
      } else {
        console.log("Error:", parsed);
      }
    } catch (e) {
      console.log("Failed to parse:", data);
    }
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
