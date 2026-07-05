const fs = require('fs');
let c = fs.readFileSync('src/pages/tools/konten-medsos.astro', 'utf8');

c = c.replace(/class='step-card'/g, `class='brutal-card bg-[#e8dff5] dark:bg-brutal-card cursor-pointer p-6 transition-all hover:-translate-y-1 hover:shadow-brutal-lg'`);
c = c.replace(/class='expand-panel'/g, `class='brutal-card bg-[#fae870] dark:bg-brutal-card col-span-full p-6 md:p-8 mt-2 mb-6'`);
c = c.replace(/class="btn btn-gold btn-copy-prompt"/g, `class='brutal-btn brutal-btn-primary btn-copy-prompt py-3 px-4'`);
c = c.replace(/class="btn btn-green btn-copy-json"/g, `class='brutal-btn bg-[#bbf7d0] text-brutal-text btn-copy-json py-3 px-4'`);
c = c.replace(/class="btn btn-outline-green btn-dl-json"/g, `class='brutal-btn brutal-btn-white btn-dl-json py-3 px-4'`);
c = c.replace(/<textarea data-key/g, `<textarea class='brutal-input bg-white dark:bg-slate-800' data-key`);

c = c.replace(/class="inline-block px-4 py-2 bg-violet-500\/20 text-violet-400 rounded-full text-sm font-bold mb-4"/g, `class='inline-block px-4 py-2 brutal-badge bg-brutal-accent text-brutal-text text-sm font-bold mb-4'`);

c = c.replace(/<div class="config-strip">[\s\S]*?<div class="grid-wrapper">/m, `<div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 brutal-card bg-[#c0e6ff] dark:bg-brutal-card mb-10">
        <div class="flex flex-col gap-2">
            <label class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">👤 Profesi Anda</label>
            <input type="text" id="profesi" class="brutal-input bg-white dark:bg-slate-800" placeholder="guru, dokter, chef…" value="guru">
        </div>
        <div class="flex flex-col gap-2">
            <label class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">📱 Platform</label>
            <select id="platform" class="brutal-input bg-white dark:bg-slate-800">
                <option value="Facebook (FB Pro)">Facebook (FB Pro)</option>
                <option value="Instagram">Instagram</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="TikTok">TikTok</option>
                <option value="Twitter / X">Twitter / X</option>
                <option value="Threads">Threads</option>
                <option value="YouTube">YouTube</option>
            </select>
        </div>
        <div class="flex flex-col gap-2">
            <label class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">🎯 Target Audiens</label>
            <input type="text" id="audiens" class="brutal-input bg-white dark:bg-slate-800" placeholder="sesama guru, pasien…" value="sesama guru">
        </div>
        <div class="flex flex-col gap-2">
            <label class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">🏷️ Niche / Topik</label>
            <input type="text" id="niche" class="brutal-input bg-white dark:bg-slate-800" placeholder="pengalaman mengajar…" value="pengalaman mengajar">
        </div>
    </div>
    <div class="grid-wrapper">`);

c = c.replace(/\.replace\(\/<\//g, `.replace(/\\x3C/`);
c = c.replace(/\.replace\(\/>\//g, `.replace(/\\x3E/`);

fs.writeFileSync('src/pages/tools/konten-medsos.astro', c);
console.log('Done!');
