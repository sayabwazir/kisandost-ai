const fs = require('fs');
const readline = require('readline');

const path = 'C:\\\\Users\\\\sayab\\\\.gemini\\\\antigravity\\\\brain\\\\dd83f4c1-81fe-46bb-8d3b-5413cce085a0\\\\.system_generated\\\\logs\\\\transcript_full.jsonl';

async function processLineByLine() {
  const fileStream = fs.createReadStream(path);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let matchCount = 0;
  for await (const line of rl) {
    if (line.includes('page.js') && line.length > 5000) {
      console.log('Found HUGE match ' + matchCount + ', length: ' + line.length);
      fs.writeFileSync(`huge_match_${matchCount}.json`, line);
      matchCount++;
      if (matchCount > 5) break;
    }
  }
}

processLineByLine();
