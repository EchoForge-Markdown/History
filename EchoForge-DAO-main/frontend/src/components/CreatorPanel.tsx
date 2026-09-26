// ============================================================
// CreatorPanel - Echo Creator 认证面板
// 认证费：前10名 10 USDCx，11名起 20 USDCx（或等值 ADA）
// 平台收 10%，90% 入 DAO 国库
// 已认证创作者显示：审核进度 + 发布管理（盈利交易详情）
// 支付集成：USDCx / ADA 双通道
// ============================================================

import React, { useState } from 'react';
import type { Publication, RevenueRecord } from '../types';
import {
  type PaymentMethod,
  calculateCertificationFee,
  payCertificationFee,
} from '../services/payment';

interface CreatorPanelProps {
  walletConnected: boolean;
  walletAddress: string;
  isCreator: boolean;
  creatorCount: number;   // 当前已认证人数，用于计算费用
  publications: Publication[];
  revenues: RevenueRecord[];
  loading: boolean;
  onCertify: () => Promise<{ success: boolean }>;
  onCancelCertification: () => void;
}

const FEE_EARLY  = 10;   // 前10名
const FEE_NORMAL = 20;   // 第11名起
// Integer-scaled fee split: 10% platform, 90% DAO treasury
const PLATFORM_CUT_PCT = 10;   // 10%
const DAO_TREASURY_PCT  = 90;  // 90%

const timeAgo = (ts: number) => {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return `${diff}秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
};

export const CreatorPanel: React.FC<CreatorPanelProps> = ({
  walletConnected,
  walletAddress,
  isCreator,
  creatorCount,
  publications,
  revenues,
  loading,
  onCertify,
  onCancelCertification,
}) => {
  const [certifyResult, setCertifyResult]   = useState<string | null>(null);
  const [activeSection, setActiveSection]   = useState<'review' | 'revenue' | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [payMethod, setPayMethod]           = useState<PaymentMethod>('USDCx');
  const [paying, setPaying]                 = useState(false);
  const [payTxHash, setPayTxHash]           = useState<string | null>(null);

  const feeInfo = calculateCertificationFee(creatorCount, payMethod);
  /** 显示用的 USDCx 面值（10 或 20） */
  const fee         = creatorCount < 10 ? FEE_EARLY  : FEE_NORMAL;
  // Integer scaling: use integer division to avoid floating-point imprecision
  const platformFee = Math.floor(fee * PLATFORM_CUT_PCT / 100);
  const daoAmount   = fee - platformFee;

  const myPubs = publications.filter(p => p.authorAddress === walletAddress);
  const myRevenues = revenues.filter(r =>
    myPubs.some(p => p.id === r.publicationId)
  );
  const totalEarned = myRevenues.reduce((s, r) => s + r.authorShare, 0);

  const handleCertify = async () => {
    setPaying(true);
    try {
      // Step 1: Execute payment (USDCx or ADA)
      const payResult = await payCertificationFee(
        walletAddress,
        creatorCount,
        payMethod,
      );
      if (!payResult.success) {
        setCertifyResult(`支付失败：${payResult.error}`);
        setTimeout(() => setCertifyResult(null), 4000);
        return;
      }
      setPayTxHash(payResult.txHash ?? null);

      // Step 2: Trigger parent certification callback
      const res = await onCertify();
      if (res.success) {
        setCertifyResult(
          `认证成功！已支付 ${payResult.displayAmount} (${payMethod})` +
          ` · TxHash: ${payResult.txHash?.slice(0, 16)}... 🎉`
        );
        setTimeout(() => setCertifyResult(null), 6000);
      }
    } finally {
      setPaying(false);
    }
  };

  // Review progress for my pubs
  const reviewStats = {
    pending:         myPubs.filter(p => p.reviewStatus === 'pending').length,
    ai_reviewing:    myPubs.filter(p => p.reviewStatus === 'ai_reviewing').length,
    human_reviewing: myPubs.filter(p => p.reviewStatus === 'human_reviewing').length,
    approved:        myPubs.filter(p => p.reviewStatus === 'approved').length,
    rejected:        myPubs.filter(p => p.reviewStatus === 'rejected').length,
    certified:       myPubs.filter(p => p.onChainProof).length,
  };

  if (!walletConnected) {
    return (
      <div className="border-b border-dark-border px-4 py-5">
        <div className="flex items-center gap-2 text-dark-secondary text-sm">
          <span>🔒</span>
          <span>连接钱包以查看 Echo Creator 认证选项</span>
        </div>
      </div>
    );
  }

  // === 已认证 Creator 视图 ===
  if (isCreator) {
    return (
      <div className="border-b border-dark-border">
        {/* Creator header */}
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs bg-white/10 border border-white/20 text-white px-3 py-1 rounded-full font-semibold">
              ✦ Echo Creator
            </span>
            <span className="text-xs text-dark-secondary">已认证</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveSection(activeSection === 'review' ? null : 'review')}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-150 ${
                activeSection === 'review'
                  ? 'bg-white text-black border-white font-semibold'
                  : 'border-dark-border text-dark-secondary hover:border-white/30 hover:text-white'
              }`}
            >
              📊 审核进度
            </button>
            <button
              onClick={() => setActiveSection(activeSection === 'revenue' ? null : 'revenue')}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-150 ${
                activeSection === 'revenue'
                  ? 'bg-white text-black border-white font-semibold'
                  : 'border-dark-border text-dark-secondary hover:border-white/30 hover:text-white'
              }`}
            >
              💰 发布管理
            </button>
          </div>
        </div>

        {/* Review Progress */}
        {activeSection === 'review' && (
          <div className="px-4 pb-4 animate-fadeIn">
            <div className="bg-dark-bg border border-dark-border rounded-2xl p-4">
              <h4 className="text-sm font-semibold text-white mb-3">我的内容审核进度</h4>
              {myPubs.length === 0 ? (
                <p className="text-xs text-dark-secondary">暂无发布内容</p>
              ) : (
                <>
                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { label: '待审核', value: reviewStats.pending, color: 'text-gray-500' },
                      { label: 'AI 审核中', value: reviewStats.ai_reviewing, color: 'text-gray-300' },
                      { label: '人工审核中', value: reviewStats.human_reviewing, color: 'text-gray-300' },
                      { label: '已通过', value: reviewStats.approved, color: 'text-white' },
                      { label: '已拒绝', value: reviewStats.rejected, color: 'text-gray-500' },
                      { label: '链上认证', value: reviewStats.certified, color: 'text-white' },
                    ].map(s => (
                      <div key={s.label} className="text-center bg-dark-hover rounded-xl p-2">
                        <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-[10px] text-dark-secondary mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Per-article list */}
                  <div className="space-y-2">
                    {myPubs.map(pub => {
                      const stepMap: Record<string, number> = {
                        pending: 0, ai_reviewing: 1, human_reviewing: 2, approved: 3, rejected: -1,
                      };
                      const step = stepMap[pub.reviewStatus] ?? 0;
                      const steps = ['提交', 'AI 审核', '人工审核', '通过'];
                      return (
                        <div key={pub.id} className="bg-dark-hover rounded-xl p-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-white truncate max-w-[180px]">{pub.title}</p>
                            {pub.onChainProof && (
                              <span className="text-[10px] text-white bg-white/10 border border-white/20 px-2 py-0.5 rounded-full">⛓ 链证</span>
                            )}
                          </div>
                          {pub.reviewStatus !== 'rejected' ? (
                            <div className="flex items-center gap-1">
                              {steps.map((s, i) => (
                                <React.Fragment key={s}>
                                  <div className={`flex-1 h-1 rounded-full transition-all duration-500 ${
                                    i <= step ? 'bg-white' : 'bg-dark-border'
                                  }`} />
                                  {i < steps.length - 1 && (
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                      i < step ? 'bg-white' : i === step ? 'bg-white animate-pulse' : 'bg-dark-border'
                                    }`} />
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-gray-500">已拒绝{pub.humanComment ? ` · ${pub.humanComment}` : ''}</p>
                          )}
                          <div className="flex justify-between mt-1">
                            {steps.map((s, i) => (
                              <span key={s} className={`text-[9px] ${i <= step ? 'text-white' : 'text-dark-muted'}`}>{s}</span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Revenue Management */}
        {activeSection === 'revenue' && (
          <div className="px-4 pb-4 animate-fadeIn">
            <div className="bg-dark-bg border border-dark-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-white">发布管理</h4>
                <span className="text-sm font-bold text-white">{totalEarned.toFixed(1)} ₳ 已赚</span>
              </div>

              {myRevenues.length === 0 ? (
                <p className="text-xs text-dark-secondary">暂无收益记录。发布内容并获得链上认证后开始赚取收益。</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-dark-secondary mb-1">每笔交易详情</p>
                  {myRevenues.map(rev => {
                    const pub = myPubs.find(p => p.id === rev.publicationId);
                    const isReferred = !!rev.referredFan;
                    return (
                      <div key={rev.id} className="bg-dark-hover rounded-xl p-3">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`shrink-0 ${isReferred ? 'text-gray-300' : 'text-white'}`}
                               aria-label={isReferred ? '推广收入' : '打赏收入'}>
                              {isReferred ? '📣' : '💝'}
                            </span>
                            <span className="text-dark-secondary truncate max-w-[100px]">
                              {pub?.title || rev.publicationId}
                            </span>
                            <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border ${
                              isReferred
                                ? 'bg-white/5 border-white/10 text-gray-400'
                                : 'bg-white/10 border-white/20 text-gray-300'
                            }`}>
                              {isReferred ? '推广' : '打赏'}
                            </span>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="text-white font-bold">{rev.authorShare.toFixed(1)} ₳</span>
                            <span className="text-dark-secondary ml-1">({isReferred ? '65%' : '70%'})</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-1.5 text-[10px] text-dark-secondary">
                          <span>总计 {rev.amount} ₳ · {timeAgo(rev.timestamp)}</span>
                          <span className="font-mono truncate max-w-[100px]" title={rev.txHash}>
                            {rev.txHash.slice(0, 8)}…
                          </span>
                        </div>
                        {isReferred && (
                          <div className="mt-1.5 text-[10px] text-dark-secondary flex gap-3">
                            <span>粉丝 {rev.fanShare.toFixed(1)} ₳ (25%)</span>
                            <span>平台 {rev.platformShare.toFixed(1)} ₳ (10%)</span>
                          </div>
                        )}
                        {!isReferred && (
                          <div className="mt-1.5 text-[10px] text-dark-secondary">
                            <span>平台 {rev.platformShare.toFixed(1)} ₳ (30%)</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cancel cert */}
        <div className="px-4 pb-3">
          {!showCancelConfirm ? (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="text-xs text-dark-secondary hover:text-gray-400 underline underline-offset-2"
            >
              取消创作者认证
            </button>
          ) : (
            <div className="flex items-center gap-3 animate-fadeIn">
              <span className="text-xs text-gray-400">确定取消认证？</span>
              <button
                onClick={() => { onCancelCertification(); setShowCancelConfirm(false); }}
                className="text-xs text-red-400 hover:text-red-300 font-medium"
              >
                确定
              </button>
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="text-xs text-dark-secondary hover:text-white"
              >
                取消
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // === 未认证 - 展示认证选项 ===
  return (
    <div className="border-b border-dark-border px-4 py-4">
      <div className="bg-dark-bg border border-dark-border rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">✦</div>
          <div className="flex-1">
            <h4 className="font-bold text-white text-sm">成为 Echo Creator</h4>
            <p className="text-xs text-dark-secondary mt-1">
              一次性认证费，无月费。解锁不限字数发布、收益分成、内容推广计划。
            </p>

            {/* Pricing */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className={`rounded-xl p-3 border text-center ${
                creatorCount < 10
                  ? 'bg-white/10 border-white/30'
                  : 'bg-dark-hover border-dark-border opacity-50'
              }`}>
                <p className="text-xs text-dark-secondary">前 10 名（早鸟）</p>
                <p className="text-lg font-bold text-white mt-1">10 USDCx</p>
                <p className="text-[10px] text-dark-secondary mt-0.5">或等值 ADA</p>
                {creatorCount < 10 && (
                  <p className="text-[10px] text-white mt-1 font-medium">
                    还剩 {10 - creatorCount} 个名额
                  </p>
                )}
              </div>
              <div className={`rounded-xl p-3 border text-center ${
                creatorCount >= 10
                  ? 'bg-white/5 border-white/20'
                  : 'bg-dark-hover border-dark-border opacity-50'
              }`}>
                <p className="text-xs text-dark-secondary">第 11 名起</p>
                <p className="text-lg font-bold text-white mt-1">20 USDCx</p>
                <p className="text-[10px] text-dark-secondary mt-0.5">或等值 ADA</p>
              </div>
            </div>

            {/* Payment method selector */}
            <div className="mt-3">
              <p className="text-[10px] text-dark-secondary mb-1.5">选择支付方式</p>
              <div className="flex gap-2">
                {(['USDCx', 'ADA'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setPayMethod(m)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all duration-150 ${
                      payMethod === m
                        ? 'bg-white text-black border-white'
                        : 'bg-dark-hover text-dark-secondary border-dark-border hover:border-white/30'
                    }`}
                  >
                    {m === 'USDCx' ? '💵 USDCx' : '🔷 ADA'}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-dark-muted mt-1">
                {payMethod === 'USDCx'
                  ? 'USDCx 是 USDC 的 Cardano native token 版本（稳定币）'
                  : `当前汇率约 ${feeInfo.displayAmount}（ADA 等值）`}
              </p>
            </div>

            {/* Fee breakdown */}
            <div className="mt-3 bg-dark-hover rounded-xl p-3 border border-dark-border">
              <p className="text-[10px] text-dark-secondary mb-1.5">
                费用分配（{fee} USDCx 等值 · 实付 {feeInfo.displayAmount}）
              </p>
              <div className="h-1.5 rounded-full overflow-hidden flex mb-1.5">
                <div className="bg-gray-400 transition-all duration-500" style={{ width: `${PLATFORM_CUT_PCT}%` }} />
                <div className="bg-white transition-all duration-500" style={{ width: `${DAO_TREASURY_PCT}%` }} />
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-400">平台 {platformFee} USDCx ({PLATFORM_CUT_PCT}%)</span>
                <span className="text-white">DAO 国库 {daoAmount} USDCx ({DAO_TREASURY_PCT}%)</span>
              </div>
              <p className="text-[10px] text-dark-muted mt-1.5">
                90% 进入透明 DAO 国库，用于营销、空投、开发和社区建设
              </p>
            </div>

            {/* Benefits */}
            <ul className="mt-3 space-y-1 text-xs text-dark-secondary">
              <li>✓ 不限字数发布内容</li>
              <li>✓ 普通打赏：作者 70% / 平台 30%</li>
              <li>✓ 推广收入：作者 65% / 粉丝 25% / 平台 10%</li>
              <li>✓ 审核进度追踪 + 发布管理面板</li>
              <li>✓ 内容推广计划（Affiliate Referral Program）</li>
              <li>✓ 可随时取消，无强制月费</li>
            </ul>

            {/* Certify button + last payment tx */}
            {certifyResult ? (
              <div className="mt-3 bg-white/5 border border-white/20 rounded-xl px-3 py-2 animate-fadeIn">
                <p className="text-white text-xs">{certifyResult}</p>
                {payTxHash && (
                  <p className="text-[10px] text-dark-secondary mt-1 font-mono truncate">
                    TxHash: {payTxHash}
                  </p>
                )}
              </div>
            ) : (
              <button
                onClick={handleCertify}
                disabled={loading || paying}
                className="btn-glow w-full mt-3 text-sm"
              >
                {paying
                  ? `支付中 (${payMethod})…`
                  : loading
                  ? '处理中…'
                  : `支付 ${feeInfo.displayAmount} 认证 (${payMethod})`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
