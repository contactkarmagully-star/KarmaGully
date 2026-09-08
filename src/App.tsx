import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import { Sparkles, Gift, X } from 'lucide-react';
import { CartProvider } from './hooks/useCart';
import Navbar from './components/Navbar';
import AnnouncementBar from './components/AnnouncementBar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Shop from './pages/Shop';
import Categories from './pages/Categories';
import ProductDetail from './pages/ProductDetail';
import Checkout from './pages/Checkout';
import Success from './pages/Success';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import Profile from './pages/Profile';
import CustomPage from './pages/CustomPage';
import PagesBrowser from './pages/PagesBrowser';
import Support from './pages/Support';
import Blog from './pages/Blog';
import BlogPostView from './pages/BlogPostView';
import ReferralHandler from './pages/ReferralHandler';
import { subscribeToSettings } from './services/settingsService';
import { AuthProvider } from './hooks/useAuth';

function AppContent() {
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');
  const [referredBy, setReferredBy] = useState<{ name: string; couponCode: string } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('referred_influencer');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Expire after 30 days
        if (Date.now() - parsed.referredAt < 30 * 24 * 60 * 60 * 1000) {
          setReferredBy({ name: parsed.name, couponCode: parsed.couponCode });
        } else {
          localStorage.removeItem('referred_influencer');
          setReferredBy(null);
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      setReferredBy(null);
    }
  }, [location.pathname]);

  useEffect(() => {
    // Dynamic settings listener for favicon
    const unsubscribe = subscribeToSettings((settings) => {
      if (settings.faviconUrl) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = settings.faviconUrl;
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const refCode = params.get('ref') || params.get('influencer');
    if (refCode) {
      import('./services/influencerService').then(({ getInfluencerByCode, trackInfluencerClick }) => {
        getInfluencerByCode(refCode).then(influencer => {
          if (influencer && influencer.isActive) {
            trackInfluencerClick(refCode);
            localStorage.setItem('referred_influencer', JSON.stringify({
              code: influencer.code,
              name: influencer.name,
              couponCode: influencer.couponCode,
              referredAt: Date.now()
            }));
          }
        });
      }).catch(err => console.error("Referral capture failed:", err));
    }
  }, [location.search]);

  return (
    <div className="flex flex-col min-h-screen bg-dark-bg text-white">
      {!isAdminPath && (
        <header className="sticky top-0 z-50 w-full">
          <AnnouncementBar />
          <Navbar />
        </header>
      )}
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/success" element={<Success />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/support" element={<Support />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPostView />} />
            <Route path="/pages" element={<PagesBrowser />} />
            <Route path="/page/:slug" element={<CustomPage />} />
            <Route path="/influencer/:code" element={<ReferralHandler />} />
            <Route path="/inf/:code" element={<ReferralHandler />} />
          </Routes>
        </AnimatePresence>
      </main>
      {!isAdminPath && <Footer />}

      {!isAdminPath && referredBy && (
        <div className="fixed bottom-6 left-6 z-50 max-w-sm w-full bg-black/90 backdrop-blur-md border border-purple-500/30 rounded-2xl p-4 shadow-[0_0_30px_rgba(168,85,247,0.25)] flex items-start gap-3 transition-all duration-300">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0">
            <Gift className="w-4 h-4" />
          </div>
          <div className="flex-grow min-w-0">
            <p className="text-xs font-black uppercase tracking-widest text-purple-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" /> Referred Partner
            </p>
            <p className="text-[11px] text-slate-300 font-medium leading-relaxed mt-0.5">
              Welcome! Referred by <span className="text-white font-bold">{referredBy.name}</span>. We've auto-loaded your coupon <span className="text-cyan-400 font-bold">{referredBy.couponCode}</span> for checkout!
            </p>
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem('referred_influencer');
              setReferredBy(null);
            }} 
            className="text-slate-500 hover:text-white transition-colors flex-shrink-0 p-1 hover:bg-white/5 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

