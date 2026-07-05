const fs = require('fs');

// 1. prompt-penghulu
let f1 = 'src/pages/tools/prompt-penghulu.astro';
if (fs.existsSync(f1)) {
    let c1 = fs.readFileSync(f1, 'utf8');
    c1 = c1.replace('<div class="max-w-4xl mx-auto mt-16 mb-20">', '<div class="max-w-4xl mx-auto mt-0 mb-20">');
    fs.writeFileSync(f1, c1);
}

// 2. converter
let f2 = 'src/pages/tools/converter.astro';
if (fs.existsSync(f2)) {
    let c2 = fs.readFileSync(f2, 'utf8');
    c2 = c2.replace('<div class="py-16 md:py-24 animate-fade-in min-h-screen">', '<div class="pt-0 pb-16 md:pb-24 animate-fade-in min-h-screen">');
    fs.writeFileSync(f2, c2);
}

// 3. Make sure all headers actually have mt-12 consistently instead of mt-8 so it's not too tight against the navbar
const files = [
    'src/pages/tools/konten-medsos.astro',
    'src/pages/tools/prompt-penghulu.astro',
    'src/pages/tools/kalkulator-wedding.astro',
    'src/pages/tools/kalkulator-keluarga.astro',
    'src/pages/tools/converter.astro',
    'src/pages/tools/sipp-pa.astro',
    'src/pages/tools/skrining-catin.astro'
];

for (let file of files) {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        // change "text-center mb-12 mt-8" to "text-center mb-12 mt-12"
        content = content.replace(/class="text-center mb-12 mt-8"/g, 'class="text-center mb-12 mt-12"');
        fs.writeFileSync(file, content);
    }
}
console.log('Top spacing standardized');
