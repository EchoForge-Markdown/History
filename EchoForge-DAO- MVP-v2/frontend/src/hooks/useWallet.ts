// ============================================================
// useWallet Hook - 钱包连接管理 (MeshJS)
// 支持 Yoroi / Eternl / Nami 钱包
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import type { WalletState } from '../types';

// 可用钱包列表
export const SUPPORTED_WALLETS = ['yoroi', 'eternl', 'nami', 'flint', 'lace'] as const;
export type WalletName = typeof SUPPORTED_WALLETS[number];

interface CardanoWalletApi {
  getNetworkId(): Promise<number>;
  getUsedAddresses(): Promise<string[]>;
  getBalance(): Promise<string>;
  signTx(tx: string, partialSign?: boolean): Promise<string>;
  submitTx(tx: string): Promise<string>;
}

declare global {
  interface Window {
    cardano?: Record<string, {
      name: string;
      icon: string;
      enable(): Promise<CardanoWalletApi>;
      isEnabled(): Promise<boolean>;
    }>;
  }
}

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    address: '',
    balance: 0,
    walletName: '',
  });
  const [walletApi, setWalletApi] = useState<CardanoWalletApi | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 获取浏览器中可用钱包 */
  const getAvailableWallets = useCallback((): WalletName[] => {
    if (!window.cardano) return [];
    return SUPPORTED_WALLETS.filter(name => window.cardano?.[name]);
  }, []);

  /** 连接钱包 */
  const connectWallet = useCallback(async (walletName: WalletName) => {
    setLoading(true);
    setError(null);

    try {
      const walletProvider = window.cardano?.[walletName];
      if (!walletProvider) {
        throw new Error(`未检测到 ${walletName} 钱包。请先安装浏览器扩展。`);
      }

      const api = await walletProvider.enable();
      setWalletApi(api);

      // 获取地址
      const addresses = await api.getUsedAddresses();
      const address = addresses[0] || '';

      // 获取余额 (CBOR 编码的 lovelace)
      const balanceCbor = await api.getBalance();
      // 简化：取 lovelace 值
      const balance = parseInt(balanceCbor, 16) || 0;

      setWallet({
        connected: true,
        address,
        balance,
        walletName,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '钱包连接失败';
      setError(msg);
      console.error('钱包连接错误:', err);

      // MVP 回退：模拟钱包
      setWallet({
        connected: true,
        address: 'addr_test1qz...demo_address_' + walletName,
        balance: 1000_000_000, // 1000 ADA
        walletName: walletName + ' (模拟)',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  /** 断开钱包 */
  const disconnectWallet = useCallback(() => {
    setWallet({
      connected: false,
      address: '',
      balance: 0,
      walletName: '',
    });
    setWalletApi(null);
    setError(null);
  }, []);

  /** 签名交易 */
  const signTransaction = useCallback(async (txCbor: string): Promise<string | null> => {
    if (!walletApi) {
      setError('请先连接钱包');
      return null;
    }
    try {
      return await walletApi.signTx(txCbor);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '签名失败';
      setError(msg);
      return null;
    }
  }, [walletApi]);

  /** 格式化 ADA 余额 */
  const formattedBalance = (wallet.balance / 1_000_000).toFixed(2);

  /** 缩短地址显示 */
  const shortAddress = wallet.address
    ? `${wallet.address.slice(0, 12)}...${wallet.address.slice(-8)}`
    : '';

  return {
    wallet,
    walletApi,
    loading,
    error,
    formattedBalance,
    shortAddress,
    getAvailableWallets,
    connectWallet,
    disconnectWallet,
    signTransaction,
  };
}
