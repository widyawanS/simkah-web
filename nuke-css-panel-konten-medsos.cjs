const fs = require('fs');
let c = fs.readFileSync('src/pages/tools/konten-medsos.astro', 'utf8');

c = c.replace(/\/\* ── EXPAND PANEL ── \*\/[\s\S]*?\/\* ── JSON PREVIEW ── \*\//m, '/* ── JSON PREVIEW ── */');

c = c.replace(/panel\.innerHTML = `[\s\S]*?`;/m, `panel.innerHTML = \`
    <div class="flex justify-between items-center mb-4 border-b-4 border-brutal-border pb-4">
      <div class="text-2xl font-black text-brutal-accent">\${step.icon} \${step.title}</div>
      <button class="panel-close w-8 h-8 rounded-full border-4 border-brutal-border bg-transparent text-brutal-text-muted hover:bg-brutal-border hover:text-white flex items-center justify-center transition-all font-bold">✕</button>
    </div>
    <div class="flex flex-wrap gap-2 mb-6">
      \${step.skills.map(s => \`<span class="text-[10px] px-3 py-1 rounded-full border-2 border-brutal-border text-slate-500 font-bold uppercase tracking-wider">\${s}</span>\`).join('')}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div class="flex flex-col gap-4">
        \${inputsHTML}
        <div class="bg-yellow-100 border-4 border-yellow-400 p-4 rounded-xl text-sm text-yellow-900 font-medium"><strong>💡 Tips:</strong><br>\${step.tip}</div>
        <div class="flex flex-wrap gap-3 mt-4">
          <button class='brutal-btn brutal-btn-primary btn-copy-prompt py-3 px-4'>📋 Salin Prompt</button>
          <button class='brutal-btn bg-[#bbf7d0] text-brutal-text btn-copy-json py-3 px-4'>{ } Salin JSON</button>
          <button class='brutal-btn brutal-btn-white btn-dl-json py-3 px-4'>⬇ JSON</button>
        </div>
        <div class="json-preview-wrap" id="jsonWrap_\${step.id}">
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 mt-4">Output JSON — Langkah \${step.id}</div>
          <div class="json-preview-box" id="jsonBox_\${step.id}"></div>
        </div>
      </div>
      <div class="flex flex-col gap-3">
        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Preview Prompt</div>
        <div class="prompt-preview preview-area bg-white dark:bg-slate-900 border-4 border-brutal-border p-5 rounded-2xl text-sm leading-relaxed min-h-[140px] max-h-[340px] overflow-y-auto whitespace-pre-wrap break-words">\${hlPrompt(promptText)}</div>
      </div>
    </div>
  \`;`);

fs.writeFileSync('src/pages/tools/konten-medsos.astro', c);
console.log('Nuked expand panel CSS and updated panel HTML');
