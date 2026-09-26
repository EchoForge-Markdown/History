// ============================================================
// 发布 Tab - 作者自由发布内容
// X Lights Out 风格 + Web3 Glow
// ============================================================

import React, { useState } from 'react';
import type { Publication } from '../types';

interface PublishTabProps {
  publications: Publication[];
  walletAddress: string;
  walletConnected: boolean;
  loading: boolean;
  onPublish: (data: {
    author: string;
    authorAddress: string;
    title: string;
    content: string;
    category: string;
  }) => Promise<{ success: boolean; publicationId?: string; ipfsCid?: string }>;
}

const CATEGORIES = ['AI & Tech', 'DeFi', 'Web3', 'NFT', 'GameFi', 'DAO', '投资', '教程', '其他'];

export const PublishTab: React.FC<PublishTabProps> = ({
  publications, walletAddress, walletConnected, loading, onPublish,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [author, setAuthor] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [result, setResult] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!title || !content) return;
    const res = await onPublish({
      author: author || '匿名作者',
      authorAddress: walletAddress,
      title,
      content,
      category,
    });
    if (res.success) {
      setResult(`发布成功！已上传到 IPFS，等待审核中...`);
      setShowForm(false);
      setTitle('');
      setContent('');
      setAuthor('');
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

  const statusConfig: Record<string, { label: string; class: string }> = {
    pending: { label: '待审核', class: 'badge bg-yellow-500/20 text-yellow-400' },
    ai_reviewing: { label: 'AI 审核中', class: 'badge bg-primary-500/20 text-primary-400' },
    human_reviewing: { label: '人工审核中', class: 'badge bg-purple-500/20 text-purple-400' },
    approved: { label: '已通过', class: 'badge-green' },
    rejected: { label: '已拒绝', class: 'badge-red' },
  };

  return (
    <div className="space-y-4">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">自由发布</h2>
          <p className="text-sm text-dark-secondary mt-1">发布你的内容，经审核后获得 Cardano 链上证明</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-glow"
          disabled={!walletConnected}
        >
          {showForm ? '✕ 取消' : '＋ 发布内容'}
        </button>
      </div>

      {!walletConnected && (
        <div className="card border-yellow-500/30 bg-yellow-500/5">
          <p className="text-yellow-400 text-sm">请先连接钱包以发布内容</p>
        </div>
      )}

      {/* 发布表单 */}
      {showForm && (
        <div className="card space-y-4 border-primary-500/30 animate-slideUp">
          <h3 className="font-semibold text-primary-400">发布新内容</h3>

          <input
            type="text"
            placeholder="作者名称"
            className="input-field"
            value={author}
            onChange={e => setAuthor(e.target.value)}
          />

          <input
            type="text"
            placeholder="标题"
            className="input-field"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />

          <div>
            <label className="text-xs text-dark-secondary mb-1 block">分类</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-all duration-200 ${
                    category === cat
                      ? 'bg-primary-500 text-white shadow-glow-sm'
                      : 'bg-dark-hover text-dark-secondary border border-dark-border hover:border-primary-500/50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <textarea
            placeholder="内容正文...（支持 Markdown）"
            className="input-field min-h-[180px] resize-none"
            value={content}
            onChange={e => setContent(e.target.value)}
          />

          <div className="flex items-center gap-2 text-xs text-dark-secondary">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
            <span>内容将上传到 IPFS 永久保存，审核通过后获得 Cardano 链上 NFT 证明</span>
          </div>

          <div className="bg-dark-bg rounded-xl p-3 border border-dark-border">
            <p className="text-xs text-dark-secondary mb-2">收入分成（固定）</p>
            <div className="split-bar mb-2">
              <div className="split-bar-author" style={{ width: '70%' }} />
              <div className="split-bar-fan" style={{ width: '20%' }} />
              <div className="split-bar-platform" style={{ width: '10%' }} />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-primary-400">作者 70%</span>
              <span className="text-success">粉丝 20%</span>
              <span className="text-yellow-400">平台 10%</span>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !title || !content}
            className="btn-primary w-full"
          >
            {loading ? '上传中...' : '发布到 IPFS（等待审核）'}
          </button>
        </div>
      )}

      {/* 结果提示 */}
      {result && (
        <div className="card border-success/30 bg-success/5 animate-fadeIn">
          <p className="text-success text-sm">{result}</p>
        </div>
      )}

      {/* 内容列表 */}
      <div className="space-y-3">
        {publications.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-3xl mb-3">✍️</p>
            <p className="text-dark-secondary">暂无内容，成为第一个发布者吧！</p>
          </div>
        ) : (
          publications.map(pub => (
            <div key={pub.id} className={`card ${pub.onChainProof ? 'border-primary-500/20' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold text-sm shrink-0">
                  {pub.author.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white">{pub.author}</span>
                    <span className="text-xs text-dark-secondary">· {timeAgo(pub.createdAt)}</span>
                    <span className={statusConfig[pub.reviewStatus]?.class || 'badge'}>
                      {statusConfig[pub.reviewStatus]?.label || pub.reviewStatus}
                    </span>
                  </div>
                  <h4 className="font-bold mt-1 text-white">{pub.title}</h4>
                  <p className="text-sm text-dark-secondary mt-1 line-clamp-3">{pub.content}</p>

                  <div className="flex items-center gap-4 mt-3 text-xs text-dark-secondary">
                    <span className="bg-dark-hover px-2 py-0.5 rounded-full">{pub.category}</span>
                    {pub.onChainProof && (
                      <span className="text-primary-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-glow inline-block" />
                        链上认证
                      </span>
                    )}
                    {pub.fans.length > 0 && <span>{pub.fans.length} 粉丝</span>}
                    {pub.totalRevenue > 0 && <span className="text-success">{pub.totalRevenue} ADA</span>}
                    {pub.ipfsCid && (
                      <a href={`https://gateway.pinata.cloud/ipfs/${pub.ipfsCid}`} target="_blank" rel="noreferrer" className="text-primary-400 hover:underline">
                        IPFS
                      </a>
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
