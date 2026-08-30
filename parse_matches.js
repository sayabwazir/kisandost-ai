const fs = require('fs');

for (let i = 0; i < 6; i++) {
  try {
    const data = JSON.parse(fs.readFileSync(`huge_match_${i}.json`, 'utf8'));
    // If it's a tool response for view_file, the code is in data.content
    let extractedCode = null;
    
    if (data.type === 'TOOL_RESPONSE') {
      extractedCode = data.content;
    } else if (data.type === 'PLANNER_RESPONSE') {
      // maybe write_to_file
      if (data.tool_calls) {
        for (const call of data.tool_calls) {
          if (call.name === 'write_to_file' || call.tool_name === 'default_api:write_to_file') {
             if (call.args && call.args.TargetFile && call.args.TargetFile.includes('page.js')) {
               extractedCode = call.args.CodeContent;
             }
             if (call.tool_arguments && call.tool_arguments.TargetFile && call.tool_arguments.TargetFile.includes('page.js')) {
               extractedCode = call.tool_arguments.CodeContent;
             }
          }
        }
      }
    }
    
    if (extractedCode) {
      fs.writeFileSync(`huge_match_${i}_code.txt`, extractedCode);
    } else {
      fs.writeFileSync(`huge_match_${i}_raw.txt`, JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.error(e);
  }
}
console.log('Parsed huge matches');
