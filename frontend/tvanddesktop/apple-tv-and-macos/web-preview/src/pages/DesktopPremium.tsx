import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { usePaywall } from '@/contexts/PaywallContext';
export function DesktopPremium() {
  const { showPaywall } = usePaywall();
  const [, navigate] = useLocation();
  useEffect(() => { showPaywall('premium'); }, [showPaywall]);
  return <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center gap-8 p-12">
    <h1 data-testid="mas-premium-title" className="text-4xl font-bold">MegaRadio Premium</h1>
    <p data-testid="mas-purchase-notice">Purchases and restore are handled by the Mac App Store.</p>
    <button data-testid="mas-show-products" className="px-8 py-4 rounded-full bg-[#ff4199]" onClick={() => showPaywall('premium')}>Show subscriptions</button>
    <button data-testid="mas-back" className="px-8 py-4" onClick={() => navigate('/settings')}>Back</button>
  </div>;
}