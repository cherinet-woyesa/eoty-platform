try {
    JSON.parse('{ "a": 1');
} catch (e) {
    console.log("Truncated object:", e.message);
}

try {
    JSON.parse('{ "a": 1, ');
} catch (e) {
    console.log("Trailing comma:", e.message);
}

try {
    JSON.parse('{ "a": 1 } }');
} catch (e) {
    console.log("Extra brace:", e.message);
}
