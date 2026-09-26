// ============================================================
// 分成 Tab - 推广拉粉 + 收入分成
// 作者 70% / 粉丝 20% / 平台 10%
// 纯黑白灰风格
// ============================================================

import React, { useState } from 'react';
import type { Publication, RevenueRecord } from '../types';

interface RevenueTabProps {
  publications: Publication[];
  revenues: RevenueRecord[];
  walletAddress: string;
  walletConnected: boolean;
  loading: boolean;
  onAddFan: (referralCode: string, fanName: string, fanAddress: string) => Promise<{
    success: boolean;
    publicationId?: string;
  }>;
  onExecuteRevenue: (publicationId: string, amount: number, fanAddress?: string) => Promise<{
    success: boolean;
    revenue?: RevenueRecord;
  }>;
}

export const RevenueTab: React.FC<RevenueTabProps> = ({
  publications, revenues, walletAddress, walletConnected, loading,
  onAddFan, onExecuteRevenue,
}) => {
  const [referralCode, setReferralCode] = useState('');
  const [fanName, setFanName] = useState('');
  const [revenueAmount, setRevenueAmount] = useState(100);
  const [selectedPub, setSelectedPub] = useState<string>('');
  const [result, setResult] = useState<string | null>(null);
  const [showAddFan, setShowAddFan] = useState(false);
  const [showRevenue, setShowRevenue] = useState(false);

  const certifiedPubs = publications.filter(p => p.onChainProof);
  const totalRevenue = publications.reduce((sum, p) => sum + p.totalRevenue, 0);
  const totalAuthor = publications.reduce((sum, p) => sum + p.authorEarned, 0);
  const totalFans = publications.reduce((sum, p) => sum + p.fansEarned, 0);
  const totalPlatform = publications.reduce((sum, p) => sum + p.platformEarned, 0);

  const handleAddFan = async () => {
    if (!referralCode || !fanName) return;
    const res = await onAddFan(referralCode, fanName, walletAddress);
    if (res.success) {
      setResult(`粉丝添加成功！已关联到作品。`);
      setShowAddFan(false);
      setReferralCode('');
      setFanName('');
      setTimeout(() => setResult(null), 3000);
    } else {
      setResult('添加失败：无效的推广码或该作品尚未认证。');
      setTimeout(() => setResult(null), 3000);
    }
  };

  const handleRevenue = async () => {
    if (!selectedPub || revenueAmount <= 0) return;
    const res = await onExecuteRevenue(selectedPub, revenueAmount);
    if (res.success && res.revenue) {
      setResult(`分成成功！作者 ${res.revenue.authorShare} ADA / 粉丝 ${res.revenue.fanShare} ADA / 平台 ${res.revenue.platformShare} ADA`);
      setShowRevenue(false);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">收入分成</h2>
          <p className="text-sm text-dark-secondary mt-1">作者拉粉推广，收入自动分成 70/20/10</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowAddFan(!showAddFan); setShowRevenue(false); }} className="btn-outline text-xs">
            {showAddFan ? '取消' : '加入粉丝'}
          </button>
          <button onClick={() => { setShowRevenue(!showRevenue); setShowAddFan(false); }} className="btn-primary text-xs" disabled={certifiedPubs.length === 0}>
            {showRevenue ? '取消' : '模拟收入'}
          </button>
        </div>
      </div>

      {result && (
        <div className="card border-white/20 bg-white/5 animate-fadeIn">
          <p className="text-white text-sm">{result}</p>
        </div>
      )}

      {/* 总览面板 */}
      <div className="card bg-dark-bg border-dark-border">
        <p className="text-xs text-dark-secondary mb-3">收入总览</p>
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center">
            <p className="text-xl font-bold text-white">{totalRevenue}</p>
            <p className="text-xs text-dark-secondary mt-1">总收入 (ADA)</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-white">{totalAuthor}</p>
            <p className="text-xs text-dark-secondary mt-1">作者 70%</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-300">{totalFans}</p>
            <p className="text-xs text-dark-secondary mt-1">粉丝 20%</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-500">{totalPlatform}</p>
            <p className="text-xs text-dark-secondary mt-1">平台 10%</p>
          </div>
        </div>
        {/* 分成条 */}
        {totalRevenue > 0 && (
          <div className="mt-3">
            <div className="split-bar">
              <div className="split-bar-author" style={{ width: '70%' }} />
              <div className="split-bar-fan" style={{ width: '20%' }} />
              <div className="split-bar-platform" style={{ width: '10%' }} />
            </div>
          </div>
        )}
      </div>

      {/* 加入粉丝表单 */}
      {showAddFan && (
        <div className="card space-y-3 border-white/20 animate-slideUp">
          <h3 className="font-semibold text-white text-sm">通过推广码加入粉丝</h3>
          <input
            type="text"
            placeholder="输入推广码 (如: REF_CHARLES_001)"
            className="input-field"
            value={referralCode}
            onChange={e => setReferralCode(e.target.value)}
          />
          <input
            type="text"
            placeholder="你的名称"
            className="input-field"
            value={fanName}
            onChange={e => setFanName(e.target.value)}
          />
          <button
            onClick={handleAddFan}
            disabled={loading || !referralCode || !fanName || !walletConnected}
            className="btn-success w-full text-sm"
          >
            {loading ? '提交中...' : '加入并获得 20% 分成'}
          </button>
        </div>
      )}

      {/* 模拟收入表单 */}
      {showRevenue && (
        <div className="card space-y-3 border-white/20 animate-slideUp">
          <h3 className="font-semibold text-white text-sm">模拟收入分成</h3>
          <div>
            <label className="text-xs text-dark-secondary mb-1 block">选择作品</label>
            <select
              className="input-field"
              value={selectedPub}
              onChange={e => setSelectedPub(e.target.value)}
            >
              <option value="">选择...</option>
              {certifiedPubs.map(p => (
                <option key={p.id} value={p.id}>{p.title} ({p.author})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-dark-secondary mb-1 block">收入金额 (ADA)</label>
            <input
              type="number"
              className="input-field"
              value={revenueAmount}
              onChange={e => setRevenueAmount(Number(e.target.value))}
              min={1}
            />
          </div>
          {/* 分成预览 */}
          <div className="bg-dark-bg rounded-xl p-3 border border-dark-border">
            <p className="text-xs text-dark-secondary mb-2">分成预览</p>
            <div className="flex gap-3">
              <div className="flex-1 text-center">
                <p className="text-xs text-dark-secondary">作者 (70%)</p>
                <p className="font-bold text-white">{(revenueAmount * 0.7).toFixed(1)} ADA</p>
              </div>
              <div className="flex-1 text-center border-x border-dark-border">
                <p className="text-xs text-dark-secondary">粉丝 (20%)</p>
                <p className="font-bold text-gray-300">{(revenueAmount * 0.2).toFixed(1)} ADA</p>
              </div>
              <div className="flex-1 text-center">
                <p className="text-xs text-dark-secondary">平台 (10%)</p>
                <p className="font-bold text-gray-500">{(revenueAmount * 0.1).toFixed(1)} ADA</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleRevenue}
            disabled={loading || !selectedPub || revenueAmount <= 0}
            className="btn-primary w-full text-sm"
          >
            {loading ? '处理中...' : '执行分成（链上交易）'}
          </button>
        </div>
      )}

      {/* 各作品分成详情 */}
      {certifiedPubs.length > 0 && (
        <div>
          <h3 className="font-semibold text-dark-secondary text-sm mb-3">作品收入明细</h3>
          <div className="space-y-3">
            {certifiedPubs.map(pub => (
              <div key={pub.id} className="card">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {pub.author.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-white text-sm">{pub.title}</h4>
                    <p className="text-xs text-dark-secondary">{pub.author}</p>
                  </div>
                  {pub.totalRevenue > 0 && (
                    <span className="text-sm font-bold text-white">{pub.totalRevenue} ADA</span>
                  )}
                </div>

                {/* 粉丝列表 */}
                {pub.fans.length > 0 && (
                  <div className="bg-dark-bg rounded-xl p-3 border border-dark-border">
                    <p className="text-xs text-dark-secondary mb-2">粉丝 ({pub.fans.length})</p>
                    <div className="space-y-2">
                      {pub.fans.map((fan, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white text-[10px] font-bold">
                              {fan.name.charAt(0)}
                            </div>
                            <span className="text-white">{fan.name}</span>
                            <span className="text-dark-secondary">· {timeAgo(fan.joinedAt)}</span>
                          </div>
                          <span className="text-gray-300 font-medium">{fan.earned} ADA</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 推广码 */}
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className="text-dark-secondary">推广码:</span>
                  <code className="bg-dark-hover px-2 py-1 rounded font-mono text-gray-300 border border-dark-border">
                    {pub.referralCode}
                  </code>
                  <span className="text-dark-secondary">· 分享给粉丝即可获得 20% 分成</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 收入流水 */}
      {revenues.length > 0 && (
        <div>
          <h3 className="font-semibold text-dark-secondary text-sm mb-3">交易记录</h3>
          <div className="space-y-2">
            {revenues.map(rev => (
              <div key={rev.id} className="card py-3">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-white font-medium">{rev.amount} ADA</span>
                    <span className="text-dark-secondary ml-2">· {timeAgo(rev.timestamp)}</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-white">作者 {rev.authorShare}</span>
                    <span className="text-gray-300">粉丝 {rev.fanShare}</span>
                    <span className="text-gray-500">平台 {rev.platformShare}</span>
                  </div>
                </div>
                <p className="text-[10px] text-dark-muted font-mono mt-1 truncate">TxHash: {rev.txHash}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {certifiedPubs.length === 0 && revenues.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-3xl mb-3">◎</p>
          <p className="text-dark-secondary">暂无收入数据</p>
          <p className="text-xs text-dark-secondary mt-1">发布内容 → 通过审核 → 获得链上认证 → 推广赚分成</p>
        </div>
      )}
    </div>
  );
};
