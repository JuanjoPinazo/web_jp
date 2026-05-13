const fs = require('fs');
const content = fs.readFileSync('src/app/(dashboard)/dashboard/page.tsx', 'utf8');
let b = 0, p = 0;
for (let char of content) {
    if (char === '{') b++;
    if (char === '}') b--;
    if (char === '(') p++;
    if (char === ')') p--;
}
console.log(`Final: b=${b}, p=${p}`);
