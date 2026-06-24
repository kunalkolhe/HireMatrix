const fs = require('fs');
const path = require('path');

const dirs = [
  path.join(__dirname, 'app'),
  path.join(__dirname, 'components')
];

function processDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (let entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const originalContent = content;

      // Replace gold
      content = content.replace(/bg-\[#E8C547\](\/[0-9]+)?/g, (match, p1) => `bg-primary${p1 || ''}`);
      content = content.replace(/text-\[#E8C547\](\/[0-9]+)?/g, (match, p1) => `text-primary${p1 || ''}`);
      content = content.replace(/border-\[#E8C547\](\/[0-9]+)?/g, (match, p1) => `border-primary${p1 || ''}`);
      content = content.replace(/ring-\[#E8C547\](\/[0-9]+)?/g, (match, p1) => `ring-primary${p1 || ''}`);
      
      // Hover states
      content = content.replace(/hover:bg-\[#f0d060\]/g, 'hover:brightness-110');
      content = content.replace(/hover:text-\[#f0d060\]/g, 'hover:text-primary/80');
      
      // Replace blacks with background and card
      content = content.replace(/bg-\[#0A0A0A\](\/[0-9]+)?/g, (match, p1) => `bg-background${p1 || ''}`);
      content = content.replace(/bg-\[#141414\](\/[0-9]+)?/g, (match, p1) => `bg-card${p1 || ''}`);
      
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated: ' + fullPath);
      }
    }
  }
}

dirs.forEach(processDir);
console.log('Done!');
