import fs from 'fs';
const content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// Use a very simple string replacement instead of regex if possible
const oldButtonCode = `<button 
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

const newButtonCode = `<button 
                        onClick={(e) => { 
                          e.preventDefault(); 
                          e.stopPropagation();
                          const msg = "Are you SURE? Order: " + order.id;
                          if (window.confirm(msg)) {
                            onDeleteOrder(order.id);
                          }
                        }}
                        className="bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-700 active:scale-95 transition-all relative z-[9999]"
                        style={{ display: 'inline-block', cursor: 'pointer' }}
                      >
                        PURGE
                      </button>`;

let newContent = content.replace(oldButtonCode, newButtonCode);

// Also make sure handleDeleteOrder is super simple
const oldHandleDelete = /const handleDeleteOrder = async \(id: string\) => \{[\s\S]*?\};/;
const newHandleDelete = `const handleDeleteOrder = async (id: string) => {
    console.log("handleDeleteOrder called for:", id);
    try {
      // Optimistic delete
      setOrders(prev => prev.filter(o => o.id !== id));
      await deleteOrder(id);
      console.log("Delete successful");
    } catch (err) {
      console.error("Delete failed", err);
      alert("Error: " + err.message);
      fetchData(true);
    }
  };`;

newContent = newContent.replace(oldHandleDelete, newHandleDelete);

fs.writeFileSync('src/pages/AdminDashboard.tsx', newContent);
console.log("Applied PURGE button fix");
