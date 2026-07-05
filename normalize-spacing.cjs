const fs = require('fs');

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

        // 1. Normalize the header wrapper spacing
        // It might be <div class="text-center mb-12 mt-12"> or similar
        content = content.replace(/<div class="text-center [^"]*">/g, '<div class="text-center mb-16 mt-12 flex flex-col items-center">');

        // 2. Normalize the h1 spacing
        // Currently it's `<h1 class="... mb-6 ...">`
        content = content.replace(/<h1 class="([^"]*?) mb-6 ([^"]*?)"/g, '<h1 class="$1 mb-4 $2"');
        
        // 3. Normalize the paragraph spacing
        // Currently it's `<p class="... mb-12 ...">`
        content = content.replace(/<p class="([^"]*?) mb-12 ([^"]*?)"/g, '<p class="$1 mb-8 $2"');
        
        // 4. Remove mt-16 from the first div after the header (for the calculators)
        content = content.replace(/<div class="max-w-4xl mx-auto mt-16">/g, '<div class="max-w-4xl mx-auto">');
        content = content.replace(/<div class="max-w-5xl mx-auto mt-16">/g, '<div class="max-w-5xl mx-auto">');

        fs.writeFileSync(file, content);
    }
}
console.log('Normalized header spacing and layout');
