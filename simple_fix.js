import fs from 'fs';
const content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// 1. Reset handleDeleteOrder to something very simple but with alert
const handleDeleteOrderSegment = /const handleDeleteOrder = async \(id: string\) => \{[\s\S]*?alert\("ADMIN_DASHBOARD: handleDeleteOrder called with id: " \+ id\);[\s\S]*?\};/;
const handleDeleteOrderSimplified = `const handleDeleteOrder = async (id: string) => {
    if (!id) return;
    const confirmed = window.confirm("Are you SURE you want to delete order " + id + "?");
    if (!confirmed) return;
    
    try {
      setOrders(prev => prev.filter(o => o.id !== id));
      await deleteOrder(id);
      alert("Order " + id + " deleted successfully");
    } catch (err) {
      alert("Failed to delete order: " + err.message);
      fetchData(true);
    }
  };`;

// 2. Find the OrdersTab button and replace it with a VERY simple button for testing
const buttonSegment = /<button\s+onClick=\{\(e\) => \{[\s\S]*?alert\("ORDER_TAB: Clicked delete for " \+ order\.id\);[\s\S]*?onDeleteOrder\(order\.id\);[\s\S]*?\}\}[\s\S]*?className="w-12 h-12 bg-red-600 text-white rounded-full shadow-2xl flex items-center justify-center relative z-50 cursor-pointer active:bg-red-800"[\s\S]*?>[\s\S]*?<Trash2 className="w-4 h-4 pointer-events-none" \/>[\s\S]*?<\/button>/g;

const buttonSimplified = `<button 
                        onClick={(e) => { 
                          e.preventDefault(); 
                          e.stopPropagation();
                          console.log("CLICKED DELETE", order.id);
                          onDeleteOrder(order.id); 
                        }}
                        className="p-4 bg-red-600 text-white rounded-lg flex items-center justify-center cursor-pointer hover:bg-red-700 active:bg-red-800"
                        style={{ minWidth: '50px', minHeight: '50px' }}
                      >
                        DELETE
                      </button>`;

let newContent = content.replace(handleDeleteOrderSegment, handleDeleteOrderSimplified);
newContent = newContent.replace(buttonSegment, buttonSimplified);

fs.writeFileSync('src/pages/AdminDashboard.tsx', newContent);
console.log("Applied simple button fix");
