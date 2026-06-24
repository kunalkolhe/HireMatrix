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

      // Global Colors
      content = content.replace(/bg-white(?!\/)/g, 'bg-background');
      content = content.replace(/bg-gray-50/g, 'bg-muted');
      content = content.replace(/bg-slate-50/g, 'bg-muted');
      content = content.replace(/bg-gray-100/g, 'bg-muted/60');
      
      content = content.replace(/text-gray-(?:400|500|600)/g, 'text-muted-foreground');
      content = content.replace(/text-slate-(?:400|500|600)/g, 'text-muted-foreground');
      content = content.replace(/text-gray-(?:700|800|900)/g, 'text-foreground');
      content = content.replace(/text-slate-(?:700|800|900)/g, 'text-foreground');
      
      content = content.replace(/border-gray-(?:100|200|300)/g, 'border-border');
      content = content.replace(/border-slate-(?:100|200|300)/g, 'border-border');

      // Card Classes Normalization
      content = content.replace(/bg-background shadow(-sm|-md)? rounded-(lg|md)/g, 'card-professional');
      content = content.replace(/shadow(-sm|-md)? rounded-(lg|md) bg-background/g, 'card-professional');
      content = content.replace(/bg-background border border-border rounded-(lg|md|xl) shadow(-sm|-md)?/g, 'card-professional');
      content = content.replace(/bg-background rounded-(lg|md|xl) border border-border shadow(-sm|-md)?/g, 'card-professional');
      content = content.replace(/bg-background p-[0-9]+ rounded-(lg|md|xl) shadow(-sm|-md)? border border-border/g, (match) => {
         return match.replace(/bg-background/, 'card-professional').replace(/rounded-(lg|md|xl) shadow(-sm|-md)? border border-border/, '');
      });

      // Buttons
      content = content.replace(/bg-blue-600/g, 'bg-primary');
      content = content.replace(/bg-blue-500/g, 'bg-primary');
      content = content.replace(/hover:bg-blue-700/g, 'hover:brightness-110');
      content = content.replace(/hover:bg-blue-600/g, 'hover:brightness-110');
      content = content.replace(/text-blue-600/g, 'text-primary');

      // AI Badges
      content = content.replace(/className="[^"]*"/g, (match) => {
         if (match.includes('bg-gray-100') && match.includes('text-gray-600')) {
             return match.replace('bg-gray-100 text-gray-600', 'badge-subtle');
         }
         return match;
      });

      // Active states in Layouts
      if (fullPath.includes('layout.tsx')) {
         content = content.replace(/bg-secondary text-foreground/g, 'bg-primary/10 text-primary');
      }

      // Quick font mono injection for likely score displays
      content = content.replace(/text-3xl font-bold/g, 'text-3xl font-bold font-mono');
      content = content.replace(/text-4xl font-bold/g, 'text-4xl font-bold font-mono');
      content = content.replace(/text-5xl font-bold/g, 'text-5xl font-bold font-mono');

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated: ' + fullPath);
      }
    }
  }
}

dirs.forEach(processDir);
console.log('Done!');
