const fs = require('fs');

try {
    const content = fs.readFileSync('src/i18n/locales/am/translation.json', 'utf8');
    JSON.parse(content);
    console.log("JSON is valid");
} catch (e) {
    console.log(e.message);
    const match = e.message.match(/position (\d+)/);
    if (match) {
        const pos = parseInt(match[1]);
        const content = fs.readFileSync('src/i18n/locales/am/translation.json', 'utf8');
        const start = Math.max(0, pos - 50);
        const end = Math.min(content.length, pos + 50);
        console.log("Context:");
        console.log(content.substring(start, end));
        console.log("-".repeat(pos - start) + "^");
    }
}
