// ============================================================
// 审核 Tab - DAO 人工 + AI 审核
// X Lights Out 风格 + Web3 Glow
// ============================================================

import React, { useState } from 'react';
import type { Publication, ReviewRecord } from '../types';

interface ReviewTabProps {
  publications: Publication[];
  reviews: ReviewRecord[];
  walletAddress: string;
  walletConnected: boolean;
  loading: boolean;
  onTriggerAIReview: (publicationId: string) => Promise<{ success: boolean; review?: ReviewRecord }>;
  onHumanReview: (
    publicationId: string,
    reviewer: string,
    decision: 'approve' | 'reject',
    comment: string,
  ) => Promise<{ success: boolean }>;
}

export const ReviewTab: React.FC<ReviewTabProps> = ({
  publications, reviews, walletAddress, walletConnected, loading,
  onTriggerAIReview, onHumanReview,
}) => {
  const [humanComment, setHumanComment] = useState('');
  const [activeReview, setActiveReview] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const filteredPubs = filter === 'all'
    ? publications
    : publications.filter(p => p.reviewStatus === filter);

  const handleAIReview = async (pubId: string) => {
    const res = await onTriggerAIReview(pubId);
    if (res.success) {
      setResult('AI 审核完成！');
      setTimeout(() => setResult(null), 3000);
    }
  };

  const handleHumanReview = async (pubId: string, decision: 'approve' | 'reject') => {
    const res = await onHumanReview(pubId, 'DAO Reviewer', decision, humanComment || (decision === 'approve' ? '内容优质，审核通过。' : '内容不符合要求，审核拒绝。'));
    if (res.success) {
      setResult(decision === 'approve' ? '审核通过！作者可获得链上证明。' : '已拒绝该内容。');
      setActiveReview(null);
      setHumanComment('');
      setTimeout(() => setResult(null), 3000);
    }
  };

  const timeAgo = (ts: number) => {
    const diff = Math.floor(Date.now() / 1000) - ts;
    if (diff < 60) return `${diff}秒前`;
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    return `${Math.floor(diff / 86400)}天前`;
  };

  const statusFilters = [
    { key: 'all', label: '全部' },
    { key: 'pending', label: '待审核' },
    { key: 'ai_reviewing', label: 'AI 审核中' },
    { key: 'human_reviewing', label: '人工审核中' },
    { key: 'approved', label: '已通过' },
    { key: 'rejected', label: '已拒绝' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-white">DAO 审核</h2>
        <p className="text-sm text-dark-secondary mt-1">AI 初审 + 人工复审，确保内容质量</p>
      </div>

      {result && (
        <div className="card border-success/30 bg-success/5 animate-fadeIn">
          <p className="text-success text-sm">{result}</p>
        </div>
      )}

      {/* 审核流程说明 */}
      <div className="card bg-dark-bg border-dark-border">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 text-xs font-bold">1</div>
            <span className="text-dark-secondary">提交</span>
          </div>
          <div className="flex-1 h-px bg-dark-border mx-2" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 text-xs font-bold">2</div>
            <span className="text-dark-secondary">AI 审核</span>
          </div>
          <div className="flex-1 h-px bg-dark-border mx-2" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs font-bold">3</div>
            <span className="text-dark-secondary">人工审核</span>
          </div>
          <div className="flex-1 h-px bg-dark-border mx-2" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center text-success text-xs font-bold">4</div>
            <span className="text-dark-secondary">链上认证</span>
          </div>
        </div>
      </div>

      {/* 状态筛选 */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {statusFilters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs px-3 py-1.5 rounded-full transition-all duration-200 whitespace-nowrap ${
              filter === f.key
                ? 'bg-primary-500 text-white'
                : 'bg-dark-hover text-dark-secondary border border-dark-border hover:border-primary-500/50'
            }`}
          >
            {f.label}
            {f.key !== 'all' && (
              <span className="ml-1 opacity-60">
                {publications.filter(p => p.reviewStatus === f.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 审核列表 */}
      <div className="space-y-3">
        {filteredPubs.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-dark-secondary">暂无待审核内容</p>
          </div>
        ) : (
          filteredPubs.map(pub => (
            <div key={pub.id} className={`card ${
              pub.reviewStatus === 'approved' ? 'border-success/20' :
              pub.reviewStatus === 'rejected' ? 'border-error/20' : ''
            }`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold text-sm shrink-0">
                  {pub.author.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white">{pub.author}</span>
                    <span className="text-xs text-dark-secondary">· {timeAgo(pub.createdAt)}</span>
                    <span className="text-xs bg-dark-hover px-2 py-0.5 rounded-full text-dark-secondary">{pub.category}</span>
                  </div>
                  <h4 className="font-bold mt-1 text-white">{pub.title}</h4>
                  <p className="text-sm text-dark-secondary mt-1 line-clamp-2">{pub.content}</p>

                  {/* AI 审核结果 */}
                  {pub.aiScore !== undefined && (
                    <div className="mt-3 bg-dark-bg rounded-xl p-3 border border-dark-border">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-primary-400">AI 审核</span>
                        <span className={`text-xs font-bold ${
                          pub.aiScore >= 70 ? 'text-success' : pub.aiScore >= 50 ? 'text-yellow-400' : 'text-error'
                        }`}>
                          {pub.aiScore} 分
                        </span>
                      </div>
                      <p className="text-xs text-dark-secondary">{pub.aiComment}</p>
                    </div>
                  )}

                  {/* 人工审核结果 */}
                  {pub.humanReviewer && (
                    <div className="mt-2 bg-dark-bg rounded-xl p-3 border border-dark-border">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-purple-400">人工审核</span>
                        <span className="text-xs text-dark-secondary">by {pub.humanReviewer}</span>
                      </div>
                      <p className="text-xs text-dark-secondary">{pub.humanComment}</p>
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2 mt-3">
                    {pub.reviewStatus === 'pending' && (
                      <button
                        onClick={() => handleAIReview(pub.id)}
                        disabled={loading}
                        className="btn-primary text-xs py-1.5 px-3"
                      >
                        {loading ? '审核中...' : '启动 AI 审核'}
                      </button>
                    )}

                    {pub.reviewStatus === 'human_reviewing' && walletConnected && (
                      <>
                        {activeReview === pub.id ? (
                          <div className="flex-1 space-y-2 animate-fadeIn">
                            <textarea
                              placeholder="审核意见..."
                              className="input-field text-xs min-h-[60px] resize-none"
                              value={humanComment}
                              onChange={e => setHumanComment(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleHumanReview(pub.id, 'approve')}
                                disabled={loading}
                                className="btn-success text-xs py-1.5 px-3"
                              >
                                通过
                              </button>
                              <button
                                onClick={() => handleHumanReview(pub.id, 'reject')}
                                disabled={loading}
                                className="btn-danger text-xs py-1.5 px-3"
                              >
                                拒绝
                              </button>
                              <button
                                onClick={() => { setActiveReview(null); setHumanComment(''); }}
                                className="btn-outline text-xs py-1.5 px-3"
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setActiveReview(pub.id)}
                            className="btn-outline text-xs py-1.5 px-3"
                          >
                            人工审核
                          </button>
                        )}
                      </>
                    )}

                    {pub.reviewStatus === 'approved' && !pub.onChainProof && (
                      <span className="text-xs text-success flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                        已通过 · 可前往"链证"铸造
                      </span>
                    )}

                    {pub.reviewStatus === 'rejected' && (
                      <span className="text-xs text-error">已拒绝</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
