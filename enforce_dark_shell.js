const fs = require('fs');
const path = require('path');

const targetDirs = [
  path.join(__dirname, 'app', 'candidate'),
  path.join(__dirname, 'app', 'recruiter'),
  path.join(__dirname, 'app', 'test'),
  path.join(__dirname, 'app', 'dashboard'),
  path.join(__dirname, 'components', 'layout'),
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

      // ==========================================
      // LAYOUT SPECIFIC FIXES (Sidebar & Header)
      // ==========================================
      if (fullPath.includes('layout.tsx') || fullPath.includes('RecruiterSidebar')) {
         content = content.replace(/<aside[^>]*>/, (match) => {
            return match
              .replace(/bg-(?:background|card)/, 'bg-[#080C18]')
              .replace(/border-border/, 'border-white/8');
         });
         content = content.replace(/<header[^>]*>/, (match) => {
            return match
              .replace(/bg-(?:background|card)/, 'bg-[#080C18]')
              .replace(/border-border/, 'border-white/8');
         });
         
         // Menu Labels
         content = content.replace(/text-muted-foreground\/70/g, 'text-white/30');
         
         // Nav Items Default
         content = content.replace(/text-muted-foreground hover:bg-muted hover:text-foreground/g, 'text-white/50 hover:text-white hover:bg-white/6');
         content = content.replace(/text-muted-foreground hover:bg-secondary hover:text-foreground/g, 'text-white/50 hover:text-white hover:bg-white/6');
         
         // Nav Items Active
         content = content.replace(/bg-primary\/10 text-primary/g, 'bg-primary/15 text-primary font-semibold border-l-2 border-primary');
         
         // Sign Out Button
         content = content.replace(/text-muted-foreground hover:bg-red-500\/10 hover:text-red-400 hover:border-red-500\/20/g, 'text-white/40 hover:text-white/70 hover:bg-white/5');
         content = content.replace(/border-border text-muted-foreground/g, 'border-white/10 text-white/40');
         content = content.replace(/border-border text-white\/40/g, 'border-white/10 text-white/40'); // duplicate guard
         
         // Avatar Ring
         content = content.replace(/w-8 h-8 rounded-full bg-secondary border border-border/g, 'w-8 h-8 rounded-full bg-secondary ring-2 ring-primary/30');
         content = content.replace(/w-10 h-10 rounded-full bg-secondary/g, 'w-10 h-10 rounded-full ring-2 ring-primary/40 bg-secondary');

         // Logo Text
         content = content.replace(/text-foreground tracking-tight/g, 'text-white font-bold tracking-tight');
      }

      // ==========================================
      // GLOBAL REPLACEMENTS IN AUTHENTICATED PAGES
      // ==========================================
      // Backgrounds
      content = content.replace(/bg-background/g, 'bg-[#0D1225]');
      content = content.replace(/bg-card/g, 'bg-[#13163a]');
      content = content.replace(/bg-muted(?!\/)/g, 'bg-white/5');
      
      // Typography
      content = content.replace(/text-foreground/g, 'text-white');
      content = content.replace(/text-muted-foreground\/70/g, 'text-white/40');
      content = content.replace(/text-muted-foreground(?!\/)/g, 'text-white/60');
      content = content.replace(/text-gray-[56]00/g, 'text-white/50');
      content = content.replace(/text-gray-[789]00/g, 'text-white');

      // Borders
      content = content.replace(/border-border/g, 'border-white/10');
      content = content.replace(/border-gray-200/g, 'border-white/10');
      content = content.replace(/border-gray-300/g, 'border-white/10');
      content = content.replace(/border-white\/8(?![0-9])/g, 'border-white/8'); // safe-guard

      // General Divider (hr or specific borders)
      content = content.replace(/border-t border-white\/10/g, 'border-t border-white/8');
      content = content.replace(/border-b border-white\/10/g, 'border-b border-white/8');

      // ==========================================
      // SPECIFIC COMPONENT/PAGE REPLACEMENTS
      // ==========================================
      // If it's a resume page or related (looking for specific strings)
      if (content.includes('Upload Resume') || content.includes('Resume File')) {
         content = content.replace(/<h[12][^>]*>Upload Resume<\/h[12]>/, '<h1 className="text-white font-extrabold tracking-tight text-2xl">Upload Resume</h1>');
         content = content.replace(/>Upload your resume to get started</g, ' className="text-white/50 text-sm">Upload your resume to get started<');
         
         // Resume File card
         content = content.replace(/<div className="[^"]*border border-white\/10[^"]*"/g, (match) => {
             if (match.includes('bg-[#13163a]') && !match.includes('rounded-2xl')) {
                return match.replace(/rounded-(lg|xl)/, 'rounded-2xl').replace('"', ' shadow-[0_2px_20px_rgba(91,78,232,0.1)]"');
             }
             return match;
         });
         
         // Drag and drop zone (look for border-dashed)
         content = content.replace(/className="[^"]*border-dashed[^"]*"/g, 'className="p-8 border-2 border-dashed border-white/15 rounded-xl bg-white/3 hover:border-primary/50 hover:bg-primary/5 transition-all text-center cursor-pointer"');
         
         // Info/warning banner
         content = content.replace(/className="[^"]*bg-blue-50 text-blue-800[^"]*"/g, 'className="flex gap-4 p-4 bg-primary/8 border border-primary/20 rounded-2xl"');
         content = content.replace(/className="[^"]*bg-blue-100[^"]*"/g, 'className="bg-primary/8 border border-primary/20 rounded-2xl"');
         
         // "or drag and drop"
         content = content.replace(/>or drag and drop</g, ' className="text-white/50">or drag and drop<');
         // "Click to upload"
         content = content.replace(/>Click to upload</g, ' className="text-primary font-semibold hover:underline">Click to upload<');
         // "PDF, DOCX up to"
         content = content.replace(/>PDF, DOCX/g, ' className="text-white/30 text-xs">PDF, DOCX');
      }

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated: ' + fullPath);
      }
    }
  }
}

targetDirs.forEach(processDir);
console.log('Done!');
