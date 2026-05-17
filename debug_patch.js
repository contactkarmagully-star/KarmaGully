import fs from 'fs';
const content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// 1. Update handleDeleteOrder in AdminDashboard
const handleDeleteOrderOld = /const handleDeleteOrder = async \(id: string\) => \{/g;
const handleDeleteOrderNew = `const handleDeleteOrder = async (id: string) => {
    alert("ADMIN_DASHBOARD: handleDeleteOrder called with id: " + id);
    console.log("AdminDashboard: handleDeleteOrder triggered for id:", id);`;

// 2. Update button in OrdersTab
const buttonSearch = /<button\s+onClick=\{\(e\) => \{\s+e\.stopPropagation\(\);\s+onDeleteOrder\(order\.id\);\s+\}\}/g;
const buttonReplacement = `<button 
                       onClick={(e) => { 
                         e.preventDefault();
                         e.stopPropagation(); 
                         alert("ORDER_TAB: Clicked delete for " + order.id);
                         onDeleteOrder(order.id); 
                       }}`;

let newContent = content.replace(handleDeleteOrderOld, handleDeleteOrderNew);
newContent = newContent.replace(buttonSearch, buttonReplacement);

// 3. Ensure we use a very simple and robust className for the delete button
newContent = newContent.replace(
    'className="p-3 bg-red-600 text-white hover:bg-red-700 transition-all rounded-xl shadow-xl shadow-red-500/30 relative z-[999] cursor-pointer hover:scale-110 active:scale-90 flex items-center justify-center"',
    'className="w-12 h-12 bg-red-600 text-white rounded-full shadow-2xl flex items-center justify-center relative z-50 cursor-pointer active:bg-red-800"'
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', newContent);
