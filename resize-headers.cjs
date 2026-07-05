const fs = require('fs');

const files = [
    'src/pages/tools/konten-medsos.astro',
    'src/pages/tools/prompt-penghulu.astro',
    'src/pages/tools/kalkulator-wedding.astro',
    'src/pages/tools/kalkulator-keluarga.astro',
    'src/pages/tools/converter.astro',
    'src/pages/tools/sipp-pa.astro',
    'src/pages/tools/skrining-catin.astro',
    'src/pages/tools/index.astro'
];

for (let file of files) {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        // Standardize all variations of h1 text size classes to text-3xl md:text-5xl
        content = content.replace(/class="([^"]*?)text-4xl md:text-6xl([^"]*?)"/g, 'class="$1text-3xl md:text-5xl$2"');
        content = content.replace(/class="([^"]*?)text-4xl md:text-5xl([^"]*?)"/g, 'class="$1text-3xl md:text-5xl$2"');
        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    }
}
