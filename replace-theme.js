const fs = require('fs');
const path = require('path');

// ── Precise, surgical replacements based on actual audit ───────────────────
// Rule: text-white is VALID on colored buttons (bg-cyan-500, bg-purple-600, bg-blue-900, bg-cyan-900)
// Rule: bg-slate-800/* in showroom spec cards should go light
// Rule: text-gray-400 → text-gray-500 (already light, just needs nudging darker)
// Rule: text-emerald-400, text-amber-400, text-red-400 → bump to -500 for better contrast on white

const REPLACEMENTS = [
  // ── Background: dark solid slates ──────────────────────────────────────
  // bg-slate-800/50 (pill badge backgrounds) → bg-gray-100
  { re: /bg-slate-800\/50/g,   rep: 'bg-gray-100' },
  // bg-slate-800/30 (spec card light wash) → bg-gray-50
  { re: /bg-slate-800\/30/g,   rep: 'bg-gray-50' },
  // full bg-slate-800 (solid) → bg-gray-200
  { re: /bg-slate-800(?![/\w])/g, rep: 'bg-gray-100' },

  // ── Table header backgrounds ────────────────────────────────────────────
  // bg-blue-900 table header → bg-blue-600 (keeps colored but passes contrast)
  { re: /bg-blue-900 text-white/g,  rep: 'bg-blue-700 text-white' },
  // bg-cyan-900 table header → bg-cyan-600
  { re: /bg-cyan-900 text-white/g,  rep: 'bg-cyan-600 text-white' },

  // ── Text: low-contrast light grays ─────────────────────────────────────
  // text-gray-400 → text-gray-600 (on white bg, 400 is too light WCAG AA fails)
  { re: /text-gray-400/g, rep: 'text-gray-600' },
  // text-emerald-400 → text-emerald-600
  { re: /text-emerald-400/g, rep: 'text-emerald-600' },
  // text-amber-400 → text-amber-600
  { re: /text-amber-400/g, rep: 'text-amber-600' },
  // text-red-400 → text-red-600
  { re: /text-red-400/g, rep: 'text-red-600' },
  // text-cyan-400 → text-cyan-600
  { re: /text-cyan-400/g, rep: 'text-cyan-600' },

  // ── Accents ─────────────────────────────────────────────────────────────
  { re: /bg-teal-500/g, rep: 'bg-cyan-500' },
  { re: /text-teal-400/g, rep: 'text-cyan-600' },
];

let totalFiles = 0;

function processDir(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  for (const file of fs.readdirSync(dirPath)) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) { processDir(fullPath); continue; }
    if (!fullPath.match(/\.(tsx|ts|css)$/)) continue;
    
    let content = fs.readFileSync(fullPath, 'utf8');
    let original = content;
    
    for (const { re, rep } of REPLACEMENTS) {
      content = content.replace(re, rep);
    }
    
    if (content !== original) {
      fs.writeFileSync(fullPath, content, 'utf8');
      totalFiles++;
      console.log(`✓ ${path.relative(path.join(__dirname), fullPath)}`);
    }
  }
}

['app', 'components'].forEach(d => processDir(path.join(__dirname, d)));
console.log(`\n✅ Done. ${totalFiles} file(s) updated.`);
