const fs = require('fs');
let c = fs.readFileSync('src/pages/tools/konten-medsos.astro', 'utf8');

c = c.replace(/\/\* ── STEP CARD ── \*\/[\s\S]*?\/\* ── EXPAND PANEL ── \*\//m, '/* ── EXPAND PANEL ── */');

c = c.replace(/card\.innerHTML = `[\s\S]*?`;/m, `card.innerHTML = \`
      <div class="absolute top-3 right-3 w-5 h-5 rounded-full bg-brutal-accent flex items-center justify-center text-white text-[10px] opacity-0 transition-opacity\${openId === step.id ? ' opacity-100' : ''}">✓</div>
      <div class="flex justify-between items-start mb-3">
        <span class="text-4xl font-black text-brutal-text-muted transition-colors group-hover:text-brutal-accent\${openId === step.id ? ' text-brutal-accent' : ''}">\${String(step.id).padStart(2, '0')}</span>
        <span class="text-2xl opacity-80">\${step.icon}</span>
      </div>
      <div class="text-base font-bold text-brutal-text mb-2 leading-tight">\${step.title}</div>
      <div class="text-xs text-brutal-text-muted leading-relaxed font-medium">\${step.desc}</div>
    \`;`);

fs.writeFileSync('src/pages/tools/konten-medsos.astro', c);
console.log('Nuked CSS and updated card HTML');
