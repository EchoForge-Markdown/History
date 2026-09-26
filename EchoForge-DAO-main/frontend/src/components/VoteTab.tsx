// ============================================================
// 链证 Tab - Cardano 链上证明 (NFT)
// 审核通过后铸造链上 NFT 证明
// 纯黑白灰风格
// ============================================================

import React, { useState } from 'react';
import type { Publication, OnChainProof } from '../types';

interface OnChainTabProps {
  publications: Publication[];
  walletAddress: string;
  walletConnected: boolean;
  loading: boolean;
  /** Indexer state feedback: Loading → Confirming → Confirmed */
  txStatus?: 'idle' | 'loading' | 'confirming' | 'confirmed' | 'error';
  onCertify: (publicationId: string) => Promise<{ success: boolean; proof?: OnChainProof; ipfsPinWarning?: boolean }>;
}

/** Map txStatus to a human-readable badge for indexer state feedback */
const txStatusBadge: Record<string, { label: string; className: string }> = {
  idle:       { label: '',              className: '' },
  loading:    { label: '⏳ 交易提交中…',   className: 'text-gray-400 animate-pulse' },
  confirming: { label: '🔄 等待链上确认…',  className: 'text-gray-300 animate-pulse' },
  confirmed:  { label: '✅ 已确认上链',    className: 'text-white' },
  error:      { label: '❌ 交易失败',      className: 'text-red-400' },
};

export const OnChainTab: React.FC<OnChainTabProps> = ({
  publications, walletAddress, walletConnected, loading, txStatus = 'idle', onCertify,
}) => {
  const [result, setResult] = useState<string | null>(null);

  const approvedPubs = publications.filter(p => p.reviewStatus === 'approved' && !p.onChainProof);
  const certifiedPubs = publications.filter(p => p.onChainProof);

  const handleCertify = async (pubId: string) => {
    const res = await onCertify(pubId);
    if (res.success && res.proof) {
      const baseMsg = `链上认证成功！TxHash: ${res.proof.txHash}`;
      const pinWarn = (res as { ipfsPinWarning?: boolean }).ipfsPinWarning
        ? ' ⚠️ IPFS 内容 Pin 失败，请稍后重试以确保元数据持久可用。'
        : '';
      setResult(baseMsg + pinWarn);
      setTimeout(() => setResult(null), pinWarn ? 8000 : 5000);
    }
  };

  const timeAgo = (ts: number) => {
    const diff = Math.floor(Date.now() / 1000) - ts;
    if (diff < 60) return `${diff}秒前`;
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    return `${Math.floor(diff / 86400)}天前`;
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-white">链上证明</h2>
        <p className="text-sm text-dark-secondary mt-1">审核通过后，铸造 Cardano 链上 NFT 作为内容凭证</p>
      </div>

      {/* Indexer state feedback: Loading → Confirming → Confirmed */}
      {txStatus && txStatus !== 'idle' && txStatusBadge[txStatus] && (
        <div className="card border-white/10 bg-white/5 animate-fadeIn">
          <p className={`text-sm font-medium ${txStatusBadge[txStatus].className}`}>
            {txStatusBadge[txStatus].label}
          </p>
        </div>
      )}

      {result && (
        <div className="card border-white/20 bg-white/5 animate-fadeIn">
          <p className="text-white text-sm">{result}</p>
        </div>
      )}

      {/* 待认证 */}
      {approvedPubs.length > 0 && (
        <div>
          <h3 className="font-semibold text-dark-secondary text-sm mb-3">待铸造链上证明</h3>
          <div className="space-y-3">
            {approvedPubs.map(pub => (
              <div key={pub.id} className="card border-white/20 animate-fadeIn">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="badge-green">审核通过</span>
                      <h4 className="font-bold text-white">{pub.title}</h4>
                    </div>
                    <p className="text-sm text-dark-secondary mt-1">{pub.author} · {pub.category}</p>

                    {/* 审核评分 */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-dark-secondary">
                      {pub.aiScore && (
                        <span className="text-gray-300">AI: {pub.aiScore}分</span>
                      )}
                      {pub.humanReviewer && (
                        <span className="text-gray-400">审核员: {pub.humanReviewer}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCertify(pub.id)}
                    disabled={!walletConnected || loading}
                    className="btn-glow shrink-0 text-sm"
                  >
                    {txStatus === 'loading' ? '⏳ 提交中...' :
                     txStatus === 'confirming' ? '🔄 确认中...' :
                     loading ? '铸造中...' : '铸造 NFT'}
                  </button>
                </div>

                {/* 即将铸造的 NFT 预览 */}
                <div className="mt-4 bg-dark-bg rounded-xl p-4 border border-white/10">
                  <p className="text-xs text-dark-secondary mb-2">NFT 预览</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-dark-muted">标题</p>
                      <p className="text-white font-medium mt-0.5">{pub.title}</p>
                    </div>
                    <div>
                      <p className="text-dark-muted">作者</p>
                      <p className="text-white font-medium mt-0.5">{pub.author}</p>
                    </div>
                    <div>
                      <p className="text-dark-muted">IPFS</p>
                      <p className="text-gray-300 font-mono mt-0.5 truncate">{pub.ipfsCid || '—'}</p>
                    </div>
                    <div>
                      <p className="text-dark-muted">推广码</p>
                      <p className="text-gray-300 font-mono mt-0.5">{pub.referralCode}</p>
                    </div>
                  </div>
                </div>

                {!walletConnected && (
                  <p className="text-xs text-dark-secondary mt-3">请连接钱包以铸造 NFT</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 已认证列表 */}
      {certifiedPubs.length > 0 && (
        <div>
          <h3 className="font-semibold text-dark-secondary text-sm mb-3">已获链上证明</h3>
          <div className="space-y-3">
            {certifiedPubs.map(pub => (
              <div key={pub.id} className="card border-white/20 relative overflow-hidden">
                {/* Glow 边框效果 */}
                <div className="absolute inset-0 rounded-2xl shadow-glow-sm opacity-20 pointer-events-none" />

                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">NFT</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-white">{pub.title}</h4>
                      <p className="text-xs text-dark-secondary">{pub.author} · {pub.category}</p>
                    </div>
                    <span className="badge-blue ml-auto">链上认证</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-dark-bg rounded-xl p-3">
                    <div>
                      <p className="text-dark-muted">TxHash</p>
                      <p className="font-mono text-gray-300 truncate mt-0.5">
                        {pub.onChainProof?.txHash}
                      </p>
                    </div>
                    <div>
                      <p className="text-dark-muted">Policy ID</p>
                      <p className="font-mono text-gray-300 truncate mt-0.5">
                        {pub.onChainProof?.policyId}
                      </p>
                    </div>
                    <div>
                      <p className="text-dark-muted">Asset Name</p>
                      <p className="font-mono text-white truncate mt-0.5">
                        {pub.onChainProof?.assetName}
                      </p>
                    </div>
                    <div>
                      <p className="text-dark-muted">铸造时间</p>
                      <p className="text-white mt-0.5">
                        {pub.onChainProof ? timeAgo(pub.onChainProof.mintedAt) : '—'}
                      </p>
                    </div>
                  </div>

                  {/* 收入统计 */}
                  {pub.totalRevenue > 0 && (
                    <div className="mt-3 flex items-center gap-4 text-xs">
                      <span className="text-white font-bold">{pub.totalRevenue} ADA 总收入</span>
                      <span className="text-dark-secondary">{pub.fans.length} 粉丝</span>
                    </div>
                  )}

                  {/* 推广码 */}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-dark-secondary">推广码:</span>
                    <code className="text-xs bg-dark-hover px-2 py-1 rounded font-mono text-gray-300 border border-dark-border">
                      {pub.referralCode}
                    </code>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {approvedPubs.length === 0 && certifiedPubs.length === 0 && (
        <div className="card text-center py-12">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-white">NFT</span>
          </div>
          <p className="text-dark-secondary">暂无可认证的内容</p>
          <p className="text-xs text-dark-secondary mt-1">先在"发布"页提交内容，通过审核后即可铸造链上证明</p>
        </div>
      )}
    </div>
  );
};
