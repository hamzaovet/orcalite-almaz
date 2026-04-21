const fs = require('fs');
const path = require('path');

const targetDirs = ['app', 'components'];

function processDir(dirPath) {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.css')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;

            // 1. Rename
            content = content.replace(/فري زون/g, 'فري زون');

            // 2. Colors - General
            content = content.replace(/#D4AF37/gi, '#0ea5e9');
            content = content.replace(/212,\s*175,\s*55/g, '14,165,233');
            content = content.replace(/212,175,55/g, '14,165,233');

            // 3. Page specific backgrounds and light colors (dark mode conversion)
            content = content.replace(/#FFFFFF/gi, '#0a0a0a');
            content = content.replace(/#FFFBF0/gi, '#082f49');
            content = content.replace(/#FFF8DB/gi, '#0c4a6e');
            content = content.replace(/#FFFDF4/gi, '#042f4b');
            content = content.replace(/#FFFBEF/gi, '#082f49');
            content = content.replace(/#F8F8F8/gi, '#111111');
            content = content.replace(/#F8F8FA/gi, '#111111');
            
            // Adjust some dark text that was meant for white background
            // E.g., color: '#1D1D1F' to color: '#FFFFFF'
            content = content.replace(/#1D1D1F/gi, '#FFFFFF');
            
            // 4. Globals.css specific font fix
            if (fullPath.endsWith('globals.css')) {
                content = content.replace(/var\(--font-arabic\)/g, 'var(--font-ibm-arabic)');
            }

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    }
}

for (const dir of targetDirs) {
    const fullDir = path.join(__dirname, dir);
    if (fs.existsSync(fullDir)) processDir(fullDir);
}
console.log("Done.");
