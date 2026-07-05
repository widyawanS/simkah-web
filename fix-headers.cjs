const fs = require('fs');

// 1. prompt-penghulu.astro
let file1 = 'src/pages/tools/prompt-penghulu.astro';
let c1 = fs.readFileSync(file1, 'utf8');
c1 = c1.replace(/<div class="text-center mb-12">[\s\S]*?<\/div>/, `      <div class="text-center mb-12 mt-8">
        <span class="inline-block px-4 py-2 brutal-badge bg-brutal-accent text-brutal-text text-sm font-bold mb-4 border-2 border-brutal-border">
          🕌 Kemenag Tools
        </span>
        <h1 class="text-4xl md:text-6xl font-black text-brutal-text text-center mb-6 drop-shadow-md">
          Generator Prompt <span class="text-emerald-500">AI Penghulu</span>
        </h1>
        <p class="text-center text-brutal-text-muted max-w-2xl mx-auto mb-12 text-lg font-medium">
          Buat prompt AI secara otomatis dengan pendekatan form step-by-step. Output berbentuk <strong>JSON Terstruktur</strong> agar hasil dari ChatGPT, Gemini, atau Claude lebih presisi dan berkualitas tinggi.
        </p>
        <AdSlot type="tools" />
      </div>`);
fs.writeFileSync(file1, c1);

// 2. kalkulator-wedding.astro
let file2 = 'src/pages/tools/kalkulator-wedding.astro';
let c2 = fs.readFileSync(file2, 'utf8');
c2 = c2.replace(/<Sectionhead>[\s\S]*?<\/div>/, `      <div class="text-center mb-12 mt-8">
        <span class="inline-block px-4 py-2 brutal-badge bg-[#fae870] text-brutal-text text-sm font-bold mb-4 border-2 border-brutal-border">
          💍 Kalkulator Biaya
        </span>
        <h1 class="text-4xl md:text-6xl font-black text-brutal-text text-center mb-6 drop-shadow-md">
          Kalkulator <span class="text-pink-500">Wedding Party</span>
        </h1>
        <p class="text-center text-brutal-text-muted max-w-2xl mx-auto mb-12 text-lg font-medium">
          Rencanakan anggaran pernikahan impian Anda dengan detail dan akurat.
        </p>
        <AdSlot type="tools" />
      </div>`);
fs.writeFileSync(file2, c2);

// 3. kalkulator-keluarga.astro
let file3 = 'src/pages/tools/kalkulator-keluarga.astro';
let c3 = fs.readFileSync(file3, 'utf8');
c3 = c3.replace(/<Sectionhead>[\s\S]*?<\/div>/, `      <div class="text-center mb-12 mt-8">
        <span class="inline-block px-4 py-2 brutal-badge bg-[#c0e6ff] text-brutal-text text-sm font-bold mb-4 border-2 border-brutal-border">
          👨‍👩‍👧‍👦 Kalkulator Biaya
        </span>
        <h1 class="text-4xl md:text-6xl font-black text-brutal-text text-center mb-6 drop-shadow-md">
          Kalkulator <span class="text-blue-500">Keluarga</span>
        </h1>
        <p class="text-center text-brutal-text-muted max-w-2xl mx-auto mb-12 text-lg font-medium">
          Rencanakan kebutuhan finansial keluarga Anda dengan akurat.
        </p>
        <AdSlot type="tools" />
      </div>`);
fs.writeFileSync(file3, c3);

// 4. converter.astro
let file4 = 'src/pages/tools/converter.astro';
let c4 = fs.readFileSync(file4, 'utf8');
c4 = c4.replace(/<header class="text-center mb-16 max-w-2xl mx-auto">[\s\S]*?<\/header>/, `      <div class="text-center mb-12 mt-8">
        <span class="inline-block px-4 py-2 brutal-badge bg-[#bbf7d0] text-brutal-text text-sm font-bold mb-4 border-2 border-brutal-border">
          ⚡ Premium Tool
        </span>
        <h1 class="text-4xl md:text-6xl font-black text-brutal-text text-center mb-6 drop-shadow-md">
          Media <span class="text-indigo-500">Converter</span>
        </h1>
        <p class="text-center text-brutal-text-muted max-w-2xl mx-auto mb-12 text-lg font-medium">
          Konversi gambar HEIC, JPG, PNG, dan WebP Anda secara instan. Semua proses dilakukan di browser Anda untuk privasi maksimal.
        </p>
        <AdSlot type="tools" />
      </div>`);
fs.writeFileSync(file4, c4);
console.log('All headers standardized');
