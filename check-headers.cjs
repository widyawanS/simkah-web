const fs = require('fs');
['src/pages/tools/konten-medsos.astro', 'src/pages/tools/kalkulator-wedding.astro', 'src/pages/tools/prompt-penghulu.astro', 'src/pages/tools/kalkulator-keluarga.astro', 'src/pages/tools/converter.astro'].forEach(f => {
    let c = fs.readFileSync(f, 'utf8');
    let match = c.match(/class="text-center[^"]*"/);
    let match2 = c.match(/<Container>[\s\S]*?<div class="text-center/);
    console.log(f);
    console.log('  Header class:', match ? match[0] : 'not found');
    console.log('  Between Container and header:', match2 ? match2[0].replace(/\n/g, '\\n') : 'not found');
});
