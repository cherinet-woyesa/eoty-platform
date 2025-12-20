const fs = require('fs');
const content = fs.readFileSync('src/i18n/locales/am/translation.json', 'utf8');

let braceCount = 0;
let inString = false;
let escaped = false;
let line = 1;
let col = 0;

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    col++;
    if (char === '\n') {
        line++;
        col = 0;
    }

    if (inString) {
        if (escaped) {
            escaped = false;
        } else if (char === '\\') {
            escaped = true;
        } else if (char === '"') {
            inString = false;
        }
    } else {
        if (char === '"') {
            inString = true;
        } else if (char === '{') {
            braceCount++;
        } else if (char === '}') {
            braceCount--;
            if (braceCount < 0) {
                console.log(`Extra closing brace at line ${line}, col ${col}`);
            }
        }
    }
}

console.log(`Final brace count: ${braceCount}`);
if (inString) {
    console.log("Ended inside a string");
}
