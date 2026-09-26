// ============================================================
// SidebarMenu - 左侧汉堡菜单抽屉
// 包含：文章分类、收藏内容、我的账号
// ============================================================

import React, { useEffect, useRef } from 'react';

interface SidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
  walletConnected: boolean;
  walletAddress: string;
  isCreator: boolean;
  savedCount: number;
}

const CATEGORIES = [
  { key: 'all',      label: '全部',       icon: '🌐' },
  { key: 'AI & Tech',label: 'AI & Tech',  icon: '🤖' },
  { key: 'DeFi',     label: 'DeFi',       icon: '💱' },
  { key: 'Web3',     label: 'Web3',       icon: '🌍' },
  { key: 'NFT',      label: 'NFT',        icon: '🖼️' },
  { key: 'GameFi',   label: 'GameFi',     icon: '🎮' },
  { key: 'DAO',      label: 'DAO',        icon: '🏛️' },
  { key: '投资',     label: '投资',       icon: '📈' },
  { key: '教程',     label: '教程',       icon: '📚' },
  { key: '其他',     label: '其他',       icon: '💡' },
];

export const SidebarMenu: React.FC<SidebarMenuProps> = ({
  isOpen,
  onClose,
  activeCategory,
  onCategoryChange,
  walletConnected,
  walletAddress,
  isCreator,
  savedCount,
}) => {
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const shortAddr = walletAddress
    ? `${walletAddress.slice(0, 8)}…${walletAddress.slice(-6)}`
    : '';

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer */}
      <div
        ref={sidebarRef}
        className={`fixed top-0 left-0 h-full w-72 bg-dark-card border-r border-dark-border z-50 flex flex-col
          transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
              <span className="text-black font-bold text-xs">EF</span>
            </div>
            <span className="font-bold text-white">EchoForge DAO</span>
          </div>
          <button
            onClick={onClose}
            className="text-dark-secondary hover:text-white transition-colors p-1"
          >
            ✕
          </button>
        </div>

        {/* My Account */}
        <div className="px-5 py-4 border-b border-dark-border">
          <p className="text-xs text-dark-secondary mb-3 font-semibold uppercase tracking-wide">我的账号</p>
          {walletConnected ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                  <span className="text-white text-sm">👤</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white font-mono">{shortAddr}</p>
                  {isCreator ? (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-white/10 border border-white/20 text-gray-200 px-2 py-0.5 rounded-full font-medium mt-0.5">
                      ✦ Echo Creator
                    </span>
                  ) : (
                    <p className="text-[10px] text-dark-secondary mt-0.5">普通用户</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-dark-secondary">
              <span>🔒</span>
              <span>连接钱包以创建账号</span>
            </div>
          )}
        </div>

        {/* Saved */}
        <div className="px-5 py-3 border-b border-dark-border">
          <button className="flex items-center gap-3 w-full text-left hover:bg-dark-hover px-2 py-2 rounded-xl transition-colors">
            <span className="text-lg">🔖</span>
            <span className="text-sm text-white font-medium">收藏内容</span>
            {savedCount > 0 && (
              <span className="ml-auto text-xs bg-white/10 border border-white/20 text-gray-300 px-2 py-0.5 rounded-full">
                {savedCount}
              </span>
            )}
          </button>
        </div>

        {/* Categories */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          <p className="text-xs text-dark-secondary mb-3 font-semibold uppercase tracking-wide">文章分类</p>
          <div className="space-y-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => { onCategoryChange(cat.key); onClose(); }}
                className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-xl transition-all duration-150 ${
                  activeCategory === cat.key
                    ? 'bg-white text-black font-semibold'
                    : 'text-dark-secondary hover:bg-dark-hover hover:text-white'
                }`}
              >
                <span className="text-base">{cat.icon}</span>
                <span className="text-sm">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-dark-border">
          <p className="text-[10px] text-dark-muted text-center">
            EchoForge DAO · Cardano · v3.0
          </p>
          <p className="text-[10px] text-dark-muted text-center mt-0.5">
            自由发布 → AI+DAO审核 → 链证 → 分成
          </p>
        </div>
      </div>
    </>
  );
};
