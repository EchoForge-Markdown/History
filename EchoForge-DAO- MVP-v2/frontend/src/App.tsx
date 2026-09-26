// ============================================================
// EchoForge DAO - 主应用入口
// 新流程：发布 → 审核 → 链证 → 分成
// X Lights Out 纯黑风格 + Web3 Glow
// ============================================================

import React, { useState } from 'react';
import type { TabType } from './types';
import { useWallet } from './hooks/useWallet';
import { useEchoForge } from './hooks/useEchoForge';
import { WalletConnect } from './components/WalletConnect';
import { PublishTab } from './components/WindowTab';
import { ReviewTab } from './components/ProposalTab';
import { OnChainTab } from './components/VoteTab';
import { RevenueTab } from './components/SettlementTab';

const TABS: { key: TabType; label: string; icon: string }[] = [
  { key: 'publish', label: '发布', icon: '✍️' },
  { key: 'review', label: '审核', icon: '🔍' },
  { key: 'onchain', label: '链证', icon: '⛓️' },
  { key: 'revenue', label: '分成', icon: '💰' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('publish');
  const walletHook = useWallet();
  const echoForge = useEchoForge();

  return (
    <div className="min-h-screen bg-black">
      {/* ===== Header (X Lights Out 风格) ===== */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-dark-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-blue-600 flex items-center justify-center shadow-glow-sm">
              <span className="text-white font-bold text-sm">EF</span>
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight text-white">EchoForge DAO</h1>
              <p className="text-xs text-dark-secondary">Web3 内容平台 · Cardano</p>
            </div>
          </div>
          <WalletConnect wallet={walletHook} />
        </div>
      </header>

      {/* ===== 仪表盘 ===== */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          <div className="metric-card">
            <p className="text-2xl font-bold text-primary-400">{echoForge.stats.totalPublications}</p>
            <p className="text-xs text-dark-secondary mt-1">发布</p>
          </div>
          <div className="metric-card">
            <p className="text-2xl font-bold text-yellow-400">{echoForge.stats.pendingReview}</p>
            <p className="text-xs text-dark-secondary mt-1">待审核</p>
          </div>
          <div className="metric-card">
            <p className="text-2xl font-bold text-success">{echoForge.stats.approved}</p>
            <p className="text-xs text-dark-secondary mt-1">已通过</p>
          </div>
          <div className="metric-card">
            <p className="text-2xl font-bold text-primary-400">{echoForge.stats.certified}</p>
            <p className="text-xs text-dark-secondary mt-1">链上认证</p>
          </div>
          <div className="metric-card">
            <p className="text-2xl font-bold text-white">{echoForge.stats.totalRevenue}</p>
            <p className="text-xs text-dark-secondary mt-1">收入 (ADA)</p>
          </div>
          <div className="metric-card">
            <p className="text-2xl font-bold text-success">{echoForge.stats.totalFans}</p>
            <p className="text-xs text-dark-secondary mt-1">粉丝</p>
          </div>
        </div>

        {/* 分成比例提示 */}
        <div className="mt-3 flex items-center gap-3 text-xs text-dark-secondary">
          <span className="text-dark-muted">固定分成:</span>
          <span className="text-primary-400 font-medium">作者 70%</span>
          <span className="text-dark-border">|</span>
          <span className="text-success font-medium">粉丝 20%</span>
          <span className="text-dark-border">|</span>
          <span className="text-yellow-400 font-medium">平台 10%</span>
        </div>
      </div>

      {/* ===== Tab 导航栏 ===== */}
      <div className="max-w-2xl mx-auto border-b border-dark-border">
        <nav className="flex">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 ${activeTab === tab.key ? 'tab-btn-active' : 'tab-btn'}`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ===== Tab 内容区域 ===== */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {activeTab === 'publish' && (
          <PublishTab
            publications={echoForge.publications}
            walletAddress={walletHook.wallet.address}
            walletConnected={walletHook.wallet.connected}
            loading={echoForge.loading}
            onPublish={echoForge.publish}
          />
        )}
        {activeTab === 'review' && (
          <ReviewTab
            publications={echoForge.publications}
            reviews={echoForge.reviews}
            walletAddress={walletHook.wallet.address}
            walletConnected={walletHook.wallet.connected}
            loading={echoForge.loading}
            onTriggerAIReview={echoForge.triggerAIReview}
            onHumanReview={echoForge.humanReview}
          />
        )}
        {activeTab === 'onchain' && (
          <OnChainTab
            publications={echoForge.publications}
            walletAddress={walletHook.wallet.address}
            walletConnected={walletHook.wallet.connected}
            loading={echoForge.loading}
            onCertify={echoForge.certifyOnChain}
          />
        )}
        {activeTab === 'revenue' && (
          <RevenueTab
            publications={echoForge.publications}
            revenues={echoForge.revenues}
            walletAddress={walletHook.wallet.address}
            walletConnected={walletHook.wallet.connected}
            loading={echoForge.loading}
            onAddFan={echoForge.addFan}
            onExecuteRevenue={echoForge.executeRevenue}
          />
        )}
      </main>

      {/* ===== Footer ===== */}
      <footer className="max-w-2xl mx-auto px-4 py-8 border-t border-dark-border text-center">
        <p className="text-xs text-dark-secondary">
          EchoForge DAO v3.0 | Built on Cardano | By Charles Tao
        </p>
        <p className="text-xs text-dark-secondary mt-1">
          发布 → 审核 → 链证 → 分成 (70/20/10) · React + MeshJS + OpShin
        </p>
      </footer>
    </div>
  );
}
