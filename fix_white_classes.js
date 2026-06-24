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

      content = content.replace(/text-white\/([0-9]+)/g, (match, p1) => {
         if (parseInt(p1) > 50) return 'text-muted-foreground';
         return 'text-muted-foreground/70';
      });
      
      content = content.replace(/text-white(?!\/)/g, 'text-foreground');
      content = content.replace(/border-white\/([0-9]+)/g, 'border-border');
      content = content.replace(/bg-white\/([0-9]+)/g, 'bg-secondary');
      content = content.replace(/text-black/g, 'text-primary-foreground');

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated: ' + fullPath);
      }
    }
  }
}

dirs.forEach(processDir);
console.log('Done!');
