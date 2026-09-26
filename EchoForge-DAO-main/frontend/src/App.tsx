// ============================================================
// EchoForge DAO - 主应用入口
// 流程：自由发布 → AI+DAO 审核 → 链证 → 分成
// 社交媒体 Feed 布局：汉堡菜单 + Feed + 钱包连接
// Tab 导航：Feed | CIP-68 链证 | Hydra L2 投票
// ============================================================

import React, { useState } from 'react';
import { useWallet } from './hooks/useWallet';
import { useEchoForge } from './hooks/useEchoForge';
import { useHydra } from './hooks/useHydra';
import { WalletConnect } from './components/WalletConnect';
import { FeedCard } from './components/FeedCard';
import { SidebarMenu } from './components/SidebarMenu';
import { PostForm } from './components/PostForm';
import { CreatorPanel } from './components/CreatorPanel';
import { OnChainTab } from './components/VoteTab';
import { HydraVoteTab } from './components/HydraVoteTab';
import type { RevenueRecord } from './types';

type AppTab = 'feed' | 'onchain' | 'hydra';

export default function App() {
  const walletHook = useWallet();
  const echoForge  = useEchoForge();
  const hydra      = useHydra();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeTab, setActiveTab] = useState<AppTab>('feed');

  // Simulated state: whether connected wallet is a creator
  const [isCreator, setIsCreator] = useState(false);
  const [creatorCount, setCreatorCount] = useState(3); // simulated count of certified creators

  const handleCertify = async () => {
    // Simulate certification
    await new Promise(r => setTimeout(r, 800));
    setIsCreator(true);
    setCreatorCount(c => c + 1);
    return { success: true };
  };

  const handleCancelCertification = () => {
    setIsCreator(false);
  };

  // Filter publications by category
  const filteredPublications = activeCategory === 'all'
    ? echoForge.publications
    : echoForge.publications.filter(p => p.category === activeCategory);

  // Simulate revenues (mapped to new split ratios)
  const revenues: RevenueRecord[] = echoForge.revenues;

  return (
    <div className="min-h-screen bg-black">
      {/* ===== Sidebar Menu ===== */}
      <SidebarMenu
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        walletConnected={walletHook.wallet.connected}
        walletAddress={walletHook.wallet.address}
        isCreator={isCreator}
        savedCount={0}
      />

      {/* ===== Header ===== */}
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-dark-border">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Left: Hamburger + Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-full hover:bg-dark-hover transition-colors"
              aria-label="打开菜单"
            >
              <span className="block w-5 h-0.5 bg-white rounded-full" />
              <span className="block w-5 h-0.5 bg-white rounded-full" />
              <span className="block w-5 h-0.5 bg-white rounded-full" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-glow-sm">
                <span className="text-black font-bold text-xs">EF</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="font-bold text-base leading-tight text-white">EchoForge DAO</h1>
                <p className="text-[10px] text-dark-secondary leading-tight">Cardano · 自由发布 · 链证 · 分成</p>
              </div>
            </div>
          </div>

          {/* Right: Wallet connect */}
          <WalletConnect wallet={walletHook} />
        </div>
      </header>

      {/* ===== Tab Navigation ===== */}
      <div className="sticky top-[57px] z-20 bg-black/90 backdrop-blur-md border-b border-dark-border">
        <div className="max-w-xl mx-auto px-4 flex items-center gap-1">
          {([
            { id: 'feed',    label: '动态',          icon: '📡' },
            { id: 'onchain', label: 'CIP-68 链证',   icon: '⛓️' },
            { id: 'hydra',   label: 'Hydra L2 投票', icon: '🗳️' },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 transition-all duration-150 ${
                activeTab === tab.id
                  ? 'border-white text-white'
                  : 'border-transparent text-dark-secondary hover:text-white'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ===== Main Content ===== */}
      <main className="max-w-xl mx-auto">
        {/* Creator Panel (shown when wallet connected, feed tab only) */}
        {walletHook.wallet.connected && activeTab === 'feed' && (
          <CreatorPanel
            walletConnected={walletHook.wallet.connected}
            walletAddress={walletHook.wallet.address}
            isCreator={isCreator}
            creatorCount={creatorCount}
            publications={echoForge.publications}
            revenues={revenues}
            loading={echoForge.loading}
            onCertify={handleCertify}
            onCancelCertification={handleCancelCertification}
          />
        )}

        {/* ── Feed Tab ── */}
        {activeTab === 'feed' && (
          <>
            {/* Post Form */}
            {showPostForm && (
              <PostForm
                walletConnected={walletHook.wallet.connected}
                walletAddress={walletHook.wallet.address}
                isCreator={isCreator}
                loading={echoForge.loading}
                onPublish={echoForge.publish}
                onClose={() => setShowPostForm(false)}
              />
            )}

            {/* Compose bar */}
            {!showPostForm && (
              <div className="border-b border-dark-border px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
                  <span className="text-white text-sm">✍️</span>
                </div>
                <button
                  onClick={() => walletHook.wallet.connected
                    ? setShowPostForm(true)
                    : undefined
                  }
                  disabled={!walletHook.wallet.connected}
                  className={`flex-1 text-left text-sm rounded-full border px-4 py-2 transition-all duration-150 ${
                    walletHook.wallet.connected
                      ? 'border-dark-border text-dark-secondary hover:border-white/30 hover:bg-dark-hover cursor-pointer'
                      : 'border-dark-border text-dark-muted cursor-not-allowed'
                  }`}
                >
                  {walletHook.wallet.connected
                    ? (isCreator ? '✦ 创作者发布新内容…' : '发布内容（400字以内）…')
                    : '连接钱包后可发布内容'}
                </button>
                {walletHook.wallet.connected && (
                  <button
                    onClick={() => setShowPostForm(true)}
                    className="btn-glow text-sm shrink-0"
                  >
                    发布
                  </button>
                )}
              </div>
            )}

            {/* Category filter strip */}
            {activeCategory !== 'all' && (
              <div className="border-b border-dark-border px-4 py-2 flex items-center gap-2">
                <span className="text-xs text-dark-secondary">筛选：</span>
                <span className="text-xs bg-white text-black font-semibold px-3 py-1 rounded-full">{activeCategory}</span>
                <button
                  onClick={() => setActiveCategory('all')}
                  className="text-xs text-dark-secondary hover:text-white ml-auto"
                >
                  清除 ✕
                </button>
              </div>
            )}

            {/* Feed */}
            {filteredPublications.length === 0 ? (
              <div className="px-4 py-16 text-center">
                <p className="text-4xl mb-4">✍️</p>
                <p className="text-dark-secondary text-sm">
                  {activeCategory === 'all'
                    ? '暂无内容，成为第一个发布者吧！'
                    : `「${activeCategory}」分类暂无内容`}
                </p>
                {walletHook.wallet.connected && (
                  <button
                    onClick={() => setShowPostForm(true)}
                    className="mt-4 btn-glow text-sm"
                  >
                    立即发布
                  </button>
                )}
              </div>
            ) : (
              <div>
                {filteredPublications.map(pub => (
                  <FeedCard
                    key={pub.id}
                    publication={pub}
                    walletAddress={walletHook.wallet.address}
                    walletConnected={walletHook.wallet.connected}
                    isCreator={isCreator && pub.authorAddress === walletHook.wallet.address}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── CIP-68 链证 Tab ── */}
        {activeTab === 'onchain' && (
          <div className="px-4 py-4">
            <OnChainTab
              publications={echoForge.publications}
              walletAddress={walletHook.wallet.address}
              walletConnected={walletHook.wallet.connected}
              loading={echoForge.loading}
              txStatus={echoForge.txStatus}
              onCertify={echoForge.certifyOnChain}
            />
          </div>
        )}

        {/* ── Hydra L2 投票 Tab ── */}
        {activeTab === 'hydra' && (
          <div className="px-4 py-4">
            <HydraVoteTab
              hydra={hydra}
              walletAddress={walletHook.wallet.address}
              walletConnected={walletHook.wallet.connected}
            />
          </div>
        )}
      </main>

      {/* ===== Footer ===== */}
      <footer className="max-w-xl mx-auto px-4 py-8 border-t border-dark-border text-center mt-8">
        <p className="text-xs text-dark-secondary">
          EchoForge DAO v3.0 · Built on Cardano · By Charles Tao
        </p>
        <p className="text-xs text-dark-secondary mt-1">
          自由发布 → AI+DAO 审核 → CIP-68 链证 → 分成 · React + MeshJS + OpShin
        </p>
      </footer>
    </div>
  );
}
