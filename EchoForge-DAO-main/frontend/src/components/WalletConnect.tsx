// ============================================================
// 钱包连接组件 - 纯黑白灰风格下拉
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { useWallet, SUPPORTED_WALLETS } from '../hooks/useWallet';
import type { WalletName } from '../hooks/useWallet';

interface WalletConnectProps {
  wallet: ReturnType<typeof useWallet>;
}

const WALLET_ICONS: Record<WalletName, string> = {
  yoroi: '🦊',
  eternl: '♾️',
  nami: '🌊',
  flint: '🔥',
  lace: '💎',
};

export const WalletConnect: React.FC<WalletConnectProps> = ({ wallet }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const available = wallet.getAvailableWallets();

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showDropdown) return;
    const handle = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showDropdown]);

  if (wallet.wallet.connected) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 bg-dark-card border border-dark-border rounded-full px-4 py-2 hover:bg-dark-hover transition-colors"
        >
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-sm font-medium">{wallet.shortAddress}</span>
          <span className="text-xs text-dark-secondary">{wallet.formattedBalance} ₳</span>
        </button>

        {showDropdown && (
          <div className="absolute right-0 top-12 w-64 bg-dark-card border border-dark-border rounded-2xl shadow-xl z-50 overflow-hidden">
            <div className="p-4 border-b border-dark-border">
              <p className="text-sm text-dark-secondary">已连接{wallet.wallet.walletName.includes('模拟') ? ' (模拟模式)' : ''}</p>
              <p className="text-sm font-mono truncate mt-1 text-dark-secondary">{wallet.wallet.address}</p>
              <p className="text-lg font-bold text-white mt-2">{wallet.formattedBalance} ADA</p>
            </div>
            <button
              onClick={() => { wallet.disconnectWallet(); setShowDropdown(false); }}
              className="w-full text-left px-4 py-3 text-gray-400 hover:bg-dark-hover hover:text-white transition-colors text-sm"
            >
              断开钱包
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="btn-primary flex items-center gap-2"
        disabled={wallet.loading}
      >
        {wallet.loading ? (
          <span className="inline-block w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
        ) : null}
        连接钱包
      </button>

      {showDropdown && (
        <div className="absolute right-0 top-12 w-72 bg-dark-card border border-dark-border rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="p-4 border-b border-dark-border">
            <p className="font-semibold">选择钱包</p>
            <p className="text-xs text-dark-secondary mt-1">支持 Cardano 生态钱包</p>
          </div>

          {available.length > 0 ? (
            available.map(name => (
              <button
                key={name}
                onClick={() => {
                  wallet.connectWallet(name);
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-hover transition-colors text-left"
              >
                <span className="text-xl">{WALLET_ICONS[name]}</span>
                <span className="capitalize font-medium">{name}</span>
              </button>
            ))
          ) : (
            <>
              <div className="px-4 py-3 text-dark-secondary text-sm">
                未检测到钱包扩展，可使用模拟模式：
              </div>
              {SUPPORTED_WALLETS.slice(0, 3).map(name => (
                <button
                  key={name}
                  onClick={() => {
                    wallet.connectWallet(name);
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-hover transition-colors text-left"
                >
                  <span className="text-xl">{WALLET_ICONS[name]}</span>
                  <span className="capitalize font-medium">{name}</span>
                  <span className="text-xs badge-blue ml-auto">模拟</span>
                </button>
              ))}
            </>
          )}

          {wallet.error && (
            <div className="px-4 py-2 text-gray-400 text-xs border-t border-dark-border">
              ⚠️ {wallet.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
