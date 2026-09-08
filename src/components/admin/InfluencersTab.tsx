import React, { useState, useEffect } from 'react';
import { 
  getAllInfluencers, 
  addInfluencer, 
  updateInfluencer, 
  deleteInfluencer, 
  getInfluencerPerformance,
  InfluencerStats
} from '../../services/influencerService';
import { getAllCoupons, Coupon } from '../../services/couponService';
import { Influencer, Order } from '../../types';
import { 
  Users, 
  Plus, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  MousePointer, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  ChevronRight, 
  ArrowLeft, 
  Sparkles, 
  Edit, 
  ExternalLink,
  Check,
  AlertCircle,
  Copy
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function InfluencersTab() {
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Performance and statistics mapping
  const [performances, setPerformances] = useState<Record<string, { stats: InfluencerStats; orders: Order[] }>>({});
  
  // Sub-views
  const [selectedInfluencer, setSelectedInfluencer] = useState<Influencer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Influencer | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyLink = (code: string) => {
    const fullUrl = `${window.location.origin}/influencer/${code}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }).catch(err => console.error("Clipboard copy failed:", err));
  };

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    couponCode: '',
    commissionType: 'percentage_profit' as Influencer['commissionType'],
    commissionValue: 10,
    isActive: true
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    couponCode: '',
    commissionType: 'percentage_profit' as Influencer['commissionType'],
    commissionValue: 10,
    isActive: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const infList = await getAllInfluencers();
      const coupList = await getAllCoupons();
      setInfluencers(infList);
      setCoupons(coupList);

      // Load performance for each influencer
      const perfData: Record<string, { stats: InfluencerStats; orders: Order[] }> = {};
      for (const inf of infList) {
        const perf = await getInfluencerPerformance(inf.code);
        perfData[inf.code] = perf;
      }
      setPerformances(perfData);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to load influencer database.");
    } finally {
      setLoading(false);
    }
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    
    if (!formData.name.trim() || !formData.code.trim()) {
      setErrorMessage("Partner display name and referral suffix are required.");
      return;
    }

    // Validate code pattern (alphanumeric, no spaces)
    const codeRegex = /^[a-zA-Z0-9_-]+$/;
    if (!codeRegex.test(formData.code.trim())) {
      setErrorMessage("Referral link suffix must contain only letters, numbers, hyphens, and underscores.");
      return;
    }

    try {
      await addInfluencer({
        id: formData.code.toLowerCase().trim(),
        name: formData.name.trim(),
        code: formData.code.toLowerCase().trim(),
        couponCode: formData.couponCode ? formData.couponCode.toUpperCase().trim() : "",
        commissionType: formData.commissionType,
        commissionValue: Number(formData.commissionValue),
        isActive: formData.isActive,
        createdAt: Date.now()
      });

      setShowAddModal(false);
      // Reset form
      setFormData({
        name: '',
        code: '',
        couponCode: '',
        commissionType: 'percentage_profit',
        commissionValue: 10,
        isActive: true
      });
      fetchData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save influencer.");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;
    setErrorMessage(null);

    try {
      await updateInfluencer(showEditModal.id, {
        name: editFormData.name.trim(),
        couponCode: editFormData.couponCode ? editFormData.couponCode.toUpperCase().trim() : "",
        commissionType: editFormData.commissionType,
        commissionValue: Number(editFormData.commissionValue),
        isActive: editFormData.isActive
      });

      setShowEditModal(null);
      fetchData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update influencer.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this influencer profile? All historical links remain but active commission calculations will stop.")) return;
    try {
      await deleteInfluencer(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to delete influencer.");
    }
  };

  const handleToggleActive = async (inf: Influencer) => {
    try {
      await updateInfluencer(inf.id, { isActive: !inf.isActive });
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to toggle status.");
    }
  };

  const handleMarkPaid = async (orderId: string, paid: boolean) => {
    try {
      const docRef = doc(db, 'orders', orderId);
      await updateDoc(docRef, { influencerCommissionPaid: paid });
      
      // Update local performance states dynamically
      if (selectedInfluencer) {
        const updatedPerf = await getInfluencerPerformance(selectedInfluencer.code);
        setPerformances(prev => ({ ...prev, [selectedInfluencer.code]: updatedPerf }));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update payout status.");
    }
  };

  // Aggregated Stats
  const totalClicks = influencers.reduce((sum, inf) => sum + (inf.clicks || 0), 0);
  const totalOrders = Object.values(performances).reduce((sum, perf) => sum + perf.stats.salesCount, 0);
  const totalRevenue = Object.values(performances).reduce((sum, perf) => sum + perf.stats.totalRevenue, 0);
  const totalCommission = Object.values(performances).reduce((sum, perf) => sum + perf.stats.totalCommission, 0);
  const totalUnpaid = Object.values(performances).reduce((sum, perf) => sum + perf.stats.unpaidCommission, 0);

  if (loading && influencers.length === 0) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (selectedInfluencer) {
    const perf = performances[selectedInfluencer.code] || { stats: { salesCount: 0, totalRevenue: 0, totalCommission: 0, unpaidCommission: 0 }, orders: [] };
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setSelectedInfluencer(null)}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to List
          </button>
          
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${selectedInfluencer.isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              {selectedInfluencer.isActive ? 'Active Campaign' : 'Inactive Campaign'}
            </span>
          </div>
        </div>

        <div className="glass-morphism border border-white/10 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Users className="w-32 h-32 text-purple-500" />
          </div>
          <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white">{selectedInfluencer.name}</h2>
          <p className="text-xs font-mono text-purple-400 mt-1">Ref Code: /{selectedInfluencer.code}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-xs font-black uppercase tracking-wider text-slate-400">
            <div>Coupon: <span className="text-white font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10">{selectedInfluencer.couponCode || "None"}</span></div>
            <div>Commission: <span className="text-white">
              {selectedInfluencer.commissionValue}
              {selectedInfluencer.commissionType === 'percentage_revenue' && '% of Revenue'}
              {selectedInfluencer.commissionType === 'percentage_profit' && '% of Profit'}
              {selectedInfluencer.commissionType === 'fixed_per_sale' && ' ₹ Flat per Sale'}
            </span></div>
          </div>
        </div>

        {/* Influencer Specific Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-morphism border border-white/5 rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Links Clicked</p>
            <p className="text-2xl font-black italic tracking-tighter text-white mt-1">{selectedInfluencer.clicks || 0}</p>
          </div>
          <div className="glass-morphism border border-white/5 rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Sales Generated</p>
            <p className="text-2xl font-black italic tracking-tighter text-white mt-1">{perf.stats.salesCount}</p>
          </div>
          <div className="glass-morphism border border-white/5 rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gross Sales Value</p>
            <p className="text-2xl font-black italic tracking-tighter text-emerald-400 mt-1">₹{perf.stats.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="glass-morphism border border-white/5 rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Commissions</p>
            <p className="text-2xl font-black italic tracking-tighter text-purple-400 mt-1">₹{perf.stats.totalCommission.toLocaleString()}</p>
            <p className="text-[9px] text-orange-400 font-bold mt-1">₹{perf.stats.unpaidCommission.toLocaleString()} Owed/Unpaid</p>
          </div>
        </div>

        {/* Referred Orders List */}
        <div className="glass-morphism border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 bg-white/5">
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Referred Sales History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-slate-400 uppercase font-black tracking-widest border-b border-white/10">
                <tr>
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Order Total</th>
                  <th className="px-6 py-4">Commission Owed</th>
                  <th className="px-6 py-4">Payout Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {perf.orders.map(order => (
                  <tr key={order.id} className="hover:bg-white/5">
                    <td className="px-6 py-4 font-mono font-bold text-white">{order.id}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{order.customerInfo.fullName}</div>
                      <div className="text-[10px] text-slate-400">{order.customerInfo.phone}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-200">₹{order.totalAmount}</td>
                    <td className="px-6 py-4 font-bold text-purple-400">₹{order.influencerCommission || 0}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        order.influencerCommissionPaid 
                          ? 'bg-green-500/15 text-green-400 border border-green-500/20' 
                          : 'bg-orange-500/15 text-orange-400 border border-orange-500/20'
                      }`}>
                        {order.influencerCommissionPaid ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {order.influencerCommissionPaid ? (
                        <button 
                          onClick={() => handleMarkPaid(order.id, false)}
                          className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/15"
                        >
                          Mark Unpaid
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleMarkPaid(order.id, true)}
                          className="text-[10px] font-black uppercase tracking-widest text-green-400 hover:text-green-300 transition-colors bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/15"
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {perf.orders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-500 font-bold uppercase tracking-widest">
                      No referred sales captured yet for this campaign.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Aggregated Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-morphism border border-white/5 rounded-2xl p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Influencers</p>
              <p className="text-2xl font-black italic tracking-tighter text-white mt-1">{influencers.length}</p>
            </div>
            <Users className="w-5 h-5 text-purple-400" />
          </div>
        </div>
        <div className="glass-morphism border border-white/5 rounded-2xl p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Link Clicks</p>
              <p className="text-2xl font-black italic tracking-tighter text-white mt-1">{totalClicks}</p>
            </div>
            <MousePointer className="w-5 h-5 text-cyan-400" />
          </div>
        </div>
        <div className="glass-morphism border border-white/5 rounded-2xl p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Referred Orders</p>
              <p className="text-2xl font-black italic tracking-tighter text-white mt-1">{totalOrders}</p>
            </div>
            <ShoppingBag className="w-5 h-5 text-yellow-400" />
          </div>
        </div>
        <div className="glass-morphism border border-white/5 rounded-2xl p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gross Owed (Unpaid)</p>
              <p className="text-2xl font-black italic tracking-tighter text-orange-400 mt-1">₹{totalUnpaid.toLocaleString()}</p>
              <p className="text-[9px] text-slate-400 font-bold mt-1">₹{totalCommission.toLocaleString()} total generated</p>
            </div>
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Main Influencers Directory */}
      <div className="glass-morphism border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-white/10 bg-white/5 flex flex-wrap gap-4 items-center justify-between">
          <div>
            <h2 className="text-base font-black uppercase tracking-widest text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" /> Influencer Campaigns
            </h2>
            <p className="text-xs text-slate-400 mt-1">Set customized referral suffixes and calculate profit-based commissions.</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 transition-colors text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg border border-purple-500/20"
          >
            <Plus className="w-4 h-4" /> Add Partner
          </button>
        </div>

        {errorMessage && (
          <div className="m-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-xs font-bold">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-slate-400 uppercase font-black tracking-widest border-b border-white/10">
              <tr>
                <th className="px-6 py-4">Partner</th>
                <th className="px-6 py-4">Link Suffix</th>
                <th className="px-6 py-4">Linked Coupon</th>
                <th className="px-6 py-4">Commission Rule</th>
                <th className="px-6 py-4">Performance</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {influencers.map(inf => {
                const perf = performances[inf.code] || { stats: { salesCount: 0, totalRevenue: 0, totalCommission: 0, unpaidCommission: 0 }, orders: [] };
                return (
                  <tr key={inf.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white text-sm">{inf.name}</div>
                      <div className="text-[10px] text-slate-500 font-medium">Added {new Date(inf.createdAt || Date.now()).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <a 
                          href={`${window.location.origin}/influencer/${inf.code}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="font-mono text-cyan-400 hover:underline flex items-center gap-1"
                        >
                          /{inf.code} <ExternalLink className="w-3 h-3" />
                        </a>
                        <button
                          onClick={() => handleCopyLink(inf.code)}
                          className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-all flex-shrink-0"
                          title="Copy Full Referral Link"
                        >
                          {copiedCode === inf.code ? (
                            <Check className="w-3.5 h-3.5 text-green-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {inf.couponCode ? (
                        <span className="font-mono font-black tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/15 px-2.5 py-1 rounded">
                          {inf.couponCode}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic font-semibold">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">
                        {inf.commissionValue}
                        {inf.commissionType === 'percentage_revenue' && '%'}
                        {inf.commissionType === 'percentage_profit' && '%'}
                        {inf.commissionType === 'fixed_per_sale' && ' ₹'}
                      </div>
                      <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">
                        {inf.commissionType === 'percentage_revenue' && 'of gross revenue'}
                        {inf.commissionType === 'percentage_profit' && 'of product profit'}
                        {inf.commissionType === 'fixed_per_sale' && 'fixed flat per sale'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white font-bold">{perf.stats.salesCount} Sales ({inf.clicks || 0} Clicks)</div>
                      <div className="text-[10px] text-slate-400">₹{perf.stats.totalRevenue.toLocaleString()} gross • <span className="text-purple-400 font-bold">₹{perf.stats.unpaidCommission} owed</span></div>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleToggleActive(inf)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all ${
                          inf.isActive 
                            ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}
                      >
                        {inf.isActive ? (
                          <><CheckCircle className="w-3.5 h-3.5" /> Active</>
                        ) : (
                          <><XCircle className="w-3.5 h-3.5" /> Paused</>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setSelectedInfluencer(inf)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-wider rounded-lg border border-white/10 transition-colors"
                        >
                          Performance <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => {
                            setEditFormData({
                              name: inf.name,
                              couponCode: inf.couponCode,
                              commissionType: inf.commissionType,
                              commissionValue: inf.commissionValue,
                              isActive: inf.isActive
                            });
                            setShowEditModal(inf);
                          }}
                          className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg border border-transparent hover:border-white/10 transition-all"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(inf.id)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/10 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {influencers.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-20 text-slate-500 font-bold uppercase tracking-widest bg-white/2">
                    No registered influencers found in the vault yet. Click "Add Partner" above to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-morphism border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h3 className="text-base font-black uppercase tracking-widest text-white">Create Partner Suffix</h3>
              <button 
                onClick={() => { setShowAddModal(false); setErrorMessage(null); }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p>{errorMessage}</p>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-black uppercase tracking-wider text-slate-400">Partner Display Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Sam Wilson" 
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 focus:border-purple-500 outline-none rounded-xl px-4 py-3 text-white placeholder-slate-600 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-black uppercase tracking-wider text-slate-400">Referral Link Suffix</label>
                <div className="flex items-center bg-white/5 border border-white/10 focus-within:border-purple-500 rounded-xl overflow-hidden transition-colors">
                  <span className="bg-white/5 px-3 py-3 text-slate-500 border-r border-white/10 font-mono">/influencer/</span>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. sam123" 
                    value={formData.code}
                    onChange={e => setFormData(prev => ({ ...prev, code: e.target.value.toLowerCase().replace(/\s/g, '') }))}
                    className="flex-grow bg-transparent outline-none px-3 py-3 text-white placeholder-slate-600 font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">This defines the custom URL: karmagully.studio/influencer/suffix</p>
              </div>

              <div className="space-y-1.5">
                <label className="font-black uppercase tracking-wider text-slate-400">Link Promo Discount Coupon <span className="text-slate-500 font-bold lowercase italic">(optional)</span></label>
                <select
                  value={formData.couponCode}
                  onChange={e => setFormData(prev => ({ ...prev, couponCode: e.target.value }))}
                  className="w-full bg-slate-900 border border-white/10 focus:border-purple-500 outline-none rounded-xl px-4 py-3 text-white transition-colors"
                >
                  <option value="">-- No Discount (None) --</option>
                  {coupons.map(c => (
                    <option key={c.code} value={c.code}>{c.code} ({c.discountType === 'percentage' ? `${c.discountValue}%` : `₹${c.discountValue}`} Off)</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">Select an optional coupon that will automatically apply when they click this influencer's link.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-black uppercase tracking-wider text-slate-400">Commission Rule</label>
                  <select
                    value={formData.commissionType}
                    onChange={e => setFormData(prev => ({ ...prev, commissionType: e.target.value as any }))}
                    className="w-full bg-slate-900 border border-white/10 focus:border-purple-500 outline-none rounded-xl px-4 py-3 text-white transition-colors"
                  >
                    <option value="percentage_profit">Commission from Profit (%)</option>
                    <option value="percentage_revenue">Commission from Gross Sales (%)</option>
                    <option value="fixed_per_sale">Fixed Rate per Order (₹)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-black uppercase tracking-wider text-slate-400">Commission Value</label>
                  <input 
                    type="number" 
                    required
                    min={0}
                    value={formData.commissionValue}
                    onChange={e => setFormData(prev => ({ ...prev, commissionValue: Number(e.target.value) }))}
                    className="w-full bg-white/5 border border-white/10 focus:border-purple-500 outline-none rounded-xl px-4 py-3 text-white placeholder-slate-600 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="isActive"
                  checked={formData.isActive}
                  onChange={e => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-4 h-4 rounded border-white/10 bg-white/5 text-purple-600 focus:ring-0"
                />
                <label htmlFor="isActive" className="font-black uppercase tracking-wider text-white">Enable Suffix Immediately</label>
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 transition-colors text-white font-black uppercase tracking-widest rounded-xl mt-4"
              >
                Create Campaign Link
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-morphism border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h3 className="text-base font-black uppercase tracking-widest text-white">Modify Partner: {showEditModal.name}</h3>
              <button 
                onClick={() => { setShowEditModal(null); setErrorMessage(null); }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p>{errorMessage}</p>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-black uppercase tracking-wider text-slate-400">Partner Display Name</label>
                <input 
                  type="text" 
                  required
                  value={editFormData.name}
                  onChange={e => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 focus:border-purple-500 outline-none rounded-xl px-4 py-3 text-white placeholder-slate-600 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-black uppercase tracking-wider text-slate-400">Link Promo Discount Coupon <span className="text-slate-500 font-bold lowercase italic">(optional)</span></label>
                <select
                  value={editFormData.couponCode}
                  onChange={e => setEditFormData(prev => ({ ...prev, couponCode: e.target.value }))}
                  className="w-full bg-slate-900 border border-white/10 focus:border-purple-500 outline-none rounded-xl px-4 py-3 text-white transition-colors"
                >
                  <option value="">-- No Discount (None) --</option>
                  {coupons.map(c => (
                    <option key={c.code} value={c.code}>{c.code} ({c.discountType === 'percentage' ? `${c.discountValue}%` : `₹${c.discountValue}`} Off)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-black uppercase tracking-wider text-slate-400">Commission Rule</label>
                  <select
                    value={editFormData.commissionType}
                    onChange={e => setEditFormData(prev => ({ ...prev, commissionType: e.target.value as any }))}
                    className="w-full bg-slate-900 border border-white/10 focus:border-purple-500 outline-none rounded-xl px-4 py-3 text-white transition-colors"
                  >
                    <option value="percentage_profit">Commission from Profit (%)</option>
                    <option value="percentage_revenue">Commission from Gross Sales (%)</option>
                    <option value="fixed_per_sale">Fixed Rate per Order (₹)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-black uppercase tracking-wider text-slate-400">Commission Value</label>
                  <input 
                    type="number" 
                    required
                    min={0}
                    value={editFormData.commissionValue}
                    onChange={e => setEditFormData(prev => ({ ...prev, commissionValue: Number(e.target.value) }))}
                    className="w-full bg-white/5 border border-white/10 focus:border-purple-500 outline-none rounded-xl px-4 py-3 text-white placeholder-slate-600 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="editIsActive"
                  checked={editFormData.isActive}
                  onChange={e => setEditFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-4 h-4 rounded border-white/10 bg-white/5 text-purple-600 focus:ring-0"
                />
                <label htmlFor="editIsActive" className="font-black uppercase tracking-wider text-white">Campaign Link Active</label>
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 transition-colors text-white font-black uppercase tracking-widest rounded-xl mt-4"
              >
                Save Suffix Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
