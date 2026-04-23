const fs = require('fs');
const path = require('path');

const patterns = [
  { label: 'text-white',        re: /text-white/g },
  { label: 'text-slate-300',    re: /text-slate-300/g },
  { label: 'text-slate-400',    re: /text-slate-400/g },
  { label: 'text-slate-100',    re: /text-slate-100/g },
  { label: 'text-slate-200',    re: /text-slate-200/g },
  { label: 'bg-slate-950',      re: /bg-slate-950/g },
  { label: 'bg-slate-900',      re: /bg-slate-900/g },
  { label: 'bg-slate-800',      re: /bg-slate-800/g },
  { label: 'bg-slate-700',      re: /bg-slate-700/g },
  { label: 'bg-[#0B1120]',      re: /bg-\[#0B1120\]/g },
  { label: 'bg-[#0a0a0a]',      re: /bg-\[#0a0a0a\]/g },
  { label: 'border-slate-800',  re: /border-slate-800/g },
  { label: 'border-slate-700',  re: /border-slate-700/g },
  { label: 'border-slate-900',  re: /border-slate-900/g },
  { label: 'bg-teal-500',       re: /bg-teal-500/g },
  { label: 'text-teal-400',     re: /text-teal-400/g },
];

const totals = {};
patterns.forEach(p => { totals[p.label] = 0; });

function scan(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) { scan(full); continue; }
    if (!full.match(/\.(tsx|ts|css)$/)) continue;
    const c = fs.readFileSync(full, 'utf8');
    for (const p of patterns) {
      const m = c.match(p.re);
      if (m) totals[p.label] += m.length;
    }
  }
}

['app', 'components'].forEach(d => scan(path.join(__dirname, d)));
console.log('=== Dark Class Counts ===');
Object.entries(totals).filter(([,v]) => v > 0).forEach(([k,v]) => console.log(`  ${k}: ${v}`));
console.log('========================');
