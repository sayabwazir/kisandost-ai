const fs = require('fs');
const content = fs.readFileSync('page_js_dump.txt', 'utf8');

if (content) {
  const json = JSON.parse(content);
  // Find where the view_file output begins, or replace_file_content output
  let text = JSON.stringify(json, null, 2);
  fs.writeFileSync('page_js_pretty.txt', text);
} else {
  console.log("No content found");
}
