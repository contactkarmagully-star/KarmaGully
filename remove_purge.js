import fs from 'fs';
const content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

const buttonRegex = /<button\s+onClick=\{\(e\) => \{[\s\S]*?onDeleteOrder\(order\.id\);[\s\S]*?className="bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-700 active:scale-95 transition-all relative z-\[9999\]"[\s\S]*?>[\s\S]*?PURGE[\s\S]*?<\/button>/g;

const newContent = content.replace(buttonRegex, '');

fs.writeFileSync('src/pages/AdminDashboard.tsx', newContent);
console.log("Removed PURGE button");
