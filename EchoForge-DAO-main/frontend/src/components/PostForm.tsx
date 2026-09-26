// ============================================================
// PostForm - 发帖表单
// 普通用户：限 400 字，无收益
// Echo Creator：不限字数，参与分成
// ============================================================

import React, { useState } from 'react';

const CATEGORIES = ['AI & Tech', 'DeFi', 'Web3', 'NFT', 'GameFi', 'DAO', '投资', '教程', '其他'];
const FREE_USER_LIMIT = 400;

interface PostFormProps {
  walletConnected: boolean;
  walletAddress: string;
  isCreator: boolean;
  loading: boolean;
  onPublish: (data: {
    author: string;
    authorAddress: string;
    title: string;
    content: string;
    category: string;
  }) => Promise<{ success: boolean; publicationId?: string; ipfsCid?: string }>;
  onClose: () => void;
}

export const PostForm: React.FC<PostFormProps> = ({
  walletConnected,
  walletAddress,
  isCreator,
  loading,
  onPublish,
  onClose,
}) => {
  const [author, setAuthor] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [result, setResult] = useState<string | null>(null);

  const charLimit = isCreator ? Infinity : FREE_USER_LIMIT;
  const remaining = isCreator ? null : FREE_USER_LIMIT - content.length;
  const overLimit = !isCreator && content.length > FREE_USER_LIMIT;

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || overLimit) return;
    const res = await onPublish({
      author: author.trim() || '匿名用户',
      authorAddress: walletAddress,
      title: title.trim(),
      content: content.trim(),
      category,
    });
    if (res.success) {
      setResult('发布成功！内容已提交，等待 AI+DAO 审核…');
      setTimeout(() => {
        setResult(null);
        onClose();
      }, 3000);
    }
  };

  return (
    <div className="border-b border-dark-border bg-dark-card/50">
      <div className="px-4 py-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white text-sm">
            {isCreator ? '✦ 创作者发布' : '发布内容'}
          </h3>
          <button onClick={onClose} className="text-dark-secondary hover:text-white text-sm">✕</button>
        </div>

        {/* Non-creator notice */}
        {!isCreator && (
          <div className="bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5">
            <p className="text-xs text-dark-secondary">
              💡 普通用户可免费发文（限 {FREE_USER_LIMIT} 字，无收益）。
              成为 <span className="text-white font-medium">Echo Creator</span> 解锁不限字数发布 + 收益分成。
            </p>
          </div>
        )}

        {/* Author */}
        <input
          type="text"
          placeholder="显示名称（留空为匿名用户）"
          className="input-field text-sm"
          value={author}
          onChange={e => setAuthor(e.target.value)}
        />

        {/* Title */}
        <input
          type="text"
          placeholder="标题 *"
          className="input-field text-sm"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />

        {/* Category chips */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`text-xs px-3 py-1.5 rounded-full transition-all duration-150 ${
                category === cat
                  ? 'bg-white text-black font-semibold'
                  : 'bg-dark-hover text-dark-secondary border border-dark-border hover:border-white/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="relative">
          <textarea
            placeholder={
              isCreator
                ? '内容正文…（支持 Markdown）'
                : `内容正文…（最多 ${FREE_USER_LIMIT} 字）`
            }
            className={`input-field min-h-[140px] resize-none text-sm ${overLimit ? 'border-red-500/50 focus:border-red-500/70' : ''}`}
            value={content}
            onChange={e => setContent(e.target.value)}
          />
          {remaining !== null && (
            <span className={`absolute bottom-3 right-3 text-xs font-mono ${
              remaining < 0 ? 'text-red-400' : remaining < 50 ? 'text-yellow-500' : 'text-dark-muted'
            }`}>
              {remaining}
            </span>
          )}
        </div>

        {/* Revenue split info */}
        {isCreator && (
          <div className="bg-dark-bg rounded-xl p-3 border border-dark-border">
            <p className="text-xs text-dark-secondary mb-2">收益分成（认证创作者）</p>
            <div className="flex gap-4 text-xs">
              <div>
                <span className="text-dark-secondary">普通打赏：</span>
                <span className="text-white font-medium">作者 70%</span>
                <span className="text-dark-secondary"> / 平台 30%</span>
              </div>
              <div>
                <span className="text-dark-secondary">推广收入：</span>
                <span className="text-white font-medium">作者 65%</span>
                <span className="text-dark-secondary"> / 粉丝 25% / 平台 10%</span>
              </div>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="bg-white/5 border border-white/20 rounded-xl px-3 py-2.5 animate-fadeIn">
            <p className="text-white text-xs">{result}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-outline text-sm flex-1">取消</button>
          <button
            onClick={handleSubmit}
            disabled={loading || !title.trim() || !content.trim() || overLimit}
            className="btn-glow text-sm flex-1"
          >
            {loading ? '上传中…' : '发布'}
          </button>
        </div>
      </div>
    </div>
  );
};
