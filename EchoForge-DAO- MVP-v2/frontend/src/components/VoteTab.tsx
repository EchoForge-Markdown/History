// ============================================================
// 链证 Tab - Cardano 链上证明 (NFT)
// 审核通过后铸造链上 NFT 证明
// X Lights Out 风格 + Web3 Glow
// ============================================================

import React, { useState } from 'react';
import type { Publication, OnChainProof } from '../types';

interface OnChainTabProps {
  publications: Publication[];
  walletAddress: string;
  walletConnected: boolean;
  loading: boolean;
  onCertify: (publicationId: string) => Promise<{ success: boolean; proof?: OnChainProof }>;
}

export const OnChainTab: React.FC<OnChainTabProps> = ({
  publications, walletAddress, walletConnected, loading, onCertify,
}) => {
  const [result, setResult] = useState<string | null>(null);

  const approvedPubs = publications.filter(p => p.reviewStatus === 'approved' && !p.onChainProof);
  const certifiedPubs = publications.filter(p => p.onChainProof);

  const handleCertify = async (pubId: string) => {
    const res = await onCertify(pubId);
    if (res.success && res.proof) {
      setResult(`链上认证成功！TxHash: ${res.proof.txHash}`);
      setTimeout(() => setResult(null), 5000);
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

      {result && (
        <div className="card border-success/30 bg-success/5 animate-fadeIn">
          <p className="text-success text-sm">{result}</p>
        </div>
      )}

      {/* 待认证 */}
      {approvedPubs.length > 0 && (
        <div>
          <h3 className="font-semibold text-dark-secondary text-sm mb-3">待铸造链上证明</h3>
          <div className="space-y-3">
            {approvedPubs.map(pub => (
              <div key={pub.id} className="card border-success/20 animate-fadeIn">
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
                        <span className="text-primary-400">AI: {pub.aiScore}分</span>
                      )}
                      {pub.humanReviewer && (
                        <span className="text-purple-400">审核员: {pub.humanReviewer}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCertify(pub.id)}
                    disabled={!walletConnected || loading}
                    className="btn-glow shrink-0 text-sm"
                  >
                    {loading ? '铸造中...' : '铸造 NFT'}
                  </button>
                </div>

                {/* 即将铸造的 NFT 预览 */}
                <div className="mt-4 bg-dark-bg rounded-xl p-4 border border-primary-500/20">
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
                      <p className="text-primary-400 font-mono mt-0.5 truncate">{pub.ipfsCid || '—'}</p>
                    </div>
                    <div>
                      <p className="text-dark-muted">推广码</p>
                      <p className="text-success font-mono mt-0.5">{pub.referralCode}</p>
                    </div>
                  </div>
                </div>
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
              <div key={pub.id} className="card border-primary-500/20 relative overflow-hidden">
                {/* Glow 边框效果 */}
                <div className="absolute inset-0 rounded-2xl shadow-glow-sm opacity-30 pointer-events-none" />
                
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
                      <span className="text-primary-400 text-sm">NFT</span>
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
                      <p className="font-mono text-primary-400 truncate mt-0.5">
                        {pub.onChainProof?.txHash}
                      </p>
                    </div>
                    <div>
                      <p className="text-dark-muted">Policy ID</p>
                      <p className="font-mono text-primary-400 truncate mt-0.5">
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
                      <span className="text-success font-bold">{pub.totalRevenue} ADA 总收入</span>
                      <span className="text-dark-secondary">{pub.fans.length} 粉丝</span>
                    </div>
                  )}

                  {/* 推广码 */}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-dark-secondary">推广码:</span>
                    <code className="text-xs bg-dark-hover px-2 py-1 rounded font-mono text-primary-400 border border-dark-border">
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
          <div className="w-16 h-16 rounded-full bg-primary-500/10 flex items-center justify-center mx-auto mb-4 animate-glow">
            <span className="text-2xl">NFT</span>
          </div>
          <p className="text-dark-secondary">暂无可认证的内容</p>
          <p className="text-xs text-dark-secondary mt-1">先在"发布"页提交内容，通过审核后即可铸造链上证明</p>
        </div>
      )}
    </div>
  );
};
