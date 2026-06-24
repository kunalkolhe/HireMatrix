const fs = require('fs');
const path = require('path');

const targetDirs = [
  path.join(__dirname, 'app', 'candidate'),
  path.join(__dirname, 'app', 'recruiter'),
  path.join(__dirname, 'app', 'test'),
  path.join(__dirname, 'app', 'dashboard'),
  path.join(__dirname, 'app', 'login'),
  path.join(__dirname, 'app', 'signup'),
];

function processDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (let entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const originalContent = content;

      content = content.replace(/bg-secondary/g, 'bg-[#13163a]');
      // Clean up any double bg
      content = content.replace(/bg-\[\#13163a\](?:\s+bg-\[\#13163a\])+/g, 'bg-[#13163a]');

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated bg-secondary: ' + fullPath);
      }
    }
  }
}

targetDirs.forEach(processDir);
console.log('Done replacing bg-secondary!');
