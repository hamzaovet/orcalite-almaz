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

            // Fix color: '#0a0a0a' back to white
            content = content.replace(/color:\s*['"]#0a0a0a['"]/g, "color: '#FFFFFF'");
            content = content.replace(/color=["']#0a0a0a["']/g, 'color="#FFFFFF"');
            
            // Re-fix specific backgrounds
            // Skeleton background
            content = content.replace(/background:\s*['"]#0a0a0a['"],\s*border:\s*['"]1px solid/g, "background: 'var(--bg-surface)', border: '1px solid");

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Re-Fixed: ${fullPath}`);
            }
        }
    }
}

for (const dir of targetDirs) {
    const fullDir = path.join(__dirname, dir);
    if (fs.existsSync(fullDir)) processDir(fullDir);
}
console.log("Done.");
