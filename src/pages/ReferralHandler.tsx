import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInfluencerByCode, trackInfluencerClick } from '../services/influencerService';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';

export default function ReferralHandler() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function processReferral() {
      if (!code) {
        navigate('/');
        return;
      }

      try {
        const influencer = await getInfluencerByCode(code);
        if (influencer && influencer.isActive) {
          // Track the click in DB in background
          trackInfluencerClick(code);

          // Save to localStorage
          localStorage.setItem('referred_influencer', JSON.stringify({
            code: influencer.code,
            name: influencer.name,
            couponCode: influencer.couponCode,
            referredAt: Date.now()
          }));

          // Redirect to home with a welcome flag
          navigate('/?welcome_ref=' + encodeURIComponent(influencer.name), { replace: true });
        } else {
          setError("This influencer referral link is inactive or invalid.");
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 3000);
        }
      } catch (err) {
        console.error("Referral process error:", err);
        setError("Something went wrong processing the referral.");
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 3000);
      }
    }

    processReferral();
  }, [code, navigate]);

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full glass-morphism border border-white/15 p-10 rounded-3xl space-y-6 shadow-2xl relative overflow-hidden">
        {/* Animated Background Highlights */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-cyan-500/20 rounded-full blur-2xl pointer-events-none" />

        {error ? (
          <>
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-500">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-wider text-white">Referral Invalid</h2>
            <p className="text-sm text-slate-400 font-medium leading-relaxed">
              {error}
            </p>
            <p className="text-xs text-purple-500 font-bold animate-pulse">Redirecting you to KarmaGully Storefront...</p>
          </>
        ) : (
          <>
            <div className="relative w-16 h-16 bg-purple-500/15 border border-purple-500/30 rounded-full flex items-center justify-center mx-auto text-purple-400 animate-bounce">
              <Sparkles className="w-8 h-8" />
              <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" />
            </div>
            <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white">
              Securing Your<br />
              <span className="text-gradient">Special Vault Access</span>
            </h2>
            <p className="text-sm text-slate-400 font-medium leading-relaxed">
              Applying influencer discounts and loading secret collections. Please wait a moment...
            </p>
            <div className="flex justify-center pt-2">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
