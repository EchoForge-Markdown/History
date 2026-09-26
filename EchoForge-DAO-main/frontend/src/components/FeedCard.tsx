// ============================================================
// FeedCard - 帖子卡片组件
// 显示头像 + 文章内容，下方含点赞、评论、分享、举报/屏蔽按钮
// ============================================================

import React, { useState } from 'react';
import type { Publication } from '../types';

interface FeedCardProps {
  publication: Publication;
  walletAddress: string;
  walletConnected: boolean;
  isCreator?: boolean;
}

const timeAgo = (ts: number) => {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return `${diff}秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
};

// Deterministic avatar color based on author name
const avatarColor = (name: string) => {
  const colors = [
    'bg-white/20', 'bg-white/15', 'bg-white/10',
    'bg-gray-400/20', 'bg-gray-300/20',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

export const FeedCard: React.FC<FeedCardProps> = ({
  publication: pub,
  walletAddress,
  walletConnected,
  isCreator = false,
}) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(Math.floor(Math.random() * 50));
  const [showComment, setShowComment] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<string[]>([]);
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [reported, setReported] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (blocked) return null;

  const handleLike = () => {
    if (!walletConnected) return;
    setLiked(!liked);
    setLikeCount(c => liked ? c - 1 : c + 1);
  };

  const handleComment = () => {
    if (!walletConnected || !commentText.trim()) return;
    setComments(prev => [...prev, commentText.trim()]);
    setCommentText('');
    setShowComment(false);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/p/${pub.id}`;
    navigator.clipboard.writeText(url).then(() => {
      // Brief visual feedback - temporarily change button appearance handled inline
    }).catch(() => {
      // Fallback: prompt user to copy manually
      window.prompt('复制此链接分享内容：', url);
    });
  };

  const handleReport = () => {
    setReported(true);
    setShowReportMenu(false);
  };

  const handleBlock = () => {
    setBlocked(true);
    setShowReportMenu(false);
  };

  const content = pub.content;
  const isLong = content.length > 200;
  const displayContent = isLong && !expanded ? content.slice(0, 200) + '…' : content;

  const statusBadge: Record<string, { label: string; className: string }> = {
    pending:          { label: '待审核',    className: 'bg-white/5 text-gray-500 border border-white/10' },
    ai_reviewing:     { label: 'AI 审核中', className: 'bg-white/10 text-gray-300 border border-white/20' },
    human_reviewing:  { label: '人工审核中',className: 'bg-white/10 text-gray-300 border border-white/20' },
    approved:         { label: '已通过',    className: 'bg-white/15 text-white border border-white/30' },
    rejected:         { label: '已拒绝',    className: 'bg-white/5 text-gray-500 border border-white/10' },
  };
  const badge = statusBadge[pub.reviewStatus];

  return (
    <article className="border-b border-dark-border hover:bg-dark-hover/40 transition-colors duration-150">
      <div className="px-4 py-4">
        {/* Author row */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className={`w-10 h-10 rounded-full ${avatarColor(pub.author)} flex items-center justify-center text-white font-bold text-sm shrink-0 border border-white/10`}>
            {pub.author.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            {/* Author name + time + badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-white text-sm">{pub.author}</span>
              {isCreator && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-white/10 border border-white/20 text-gray-200 px-2 py-0.5 rounded-full font-medium">
                  ✦ Echo Creator
                </span>
              )}
              <span className="text-xs text-dark-secondary">· {timeAgo(pub.createdAt)}</span>
              {badge && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.className}`}>
                  {badge.label}
                </span>
              )}
              {pub.onChainProof && (
                <span className="inline-flex items-center gap-1 text-[10px] text-white bg-white/10 border border-white/20 px-2 py-0.5 rounded-full">
                  ⛓ 链上认证
                </span>
              )}
            </div>

            {/* Category */}
            <span className="inline-block text-[10px] bg-dark-hover text-dark-secondary px-2 py-0.5 rounded-full mt-1 border border-dark-border">
              {pub.category}
            </span>

            {/* Title */}
            <h3 className="font-bold text-white mt-2 text-sm leading-snug">{pub.title}</h3>

            {/* Content */}
            <p className="text-sm text-dark-secondary mt-1 leading-relaxed whitespace-pre-line">
              {displayContent}
            </p>
            {isLong && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-gray-400 hover:text-white mt-1 underline underline-offset-2"
              >
                {expanded ? '收起' : '展开全文'}
              </button>
            )}

            {/* Comments */}
            {comments.length > 0 && (
              <div className="mt-3 space-y-2 border-l-2 border-dark-border pl-3">
                {comments.map((c, i) => (
                  <p key={i} className="text-xs text-dark-secondary">
                    <span className="text-gray-400 font-medium">我：</span>{c}
                  </p>
                ))}
              </div>
            )}

            {/* Comment input */}
            {showComment && (
              <div className="mt-3 flex gap-2 animate-fadeIn">
                <input
                  type="text"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleComment()}
                  placeholder="发表评论..."
                  className="flex-1 bg-transparent border border-dark-border rounded-full px-3 py-1.5 text-xs text-dark-text placeholder-dark-secondary focus:outline-none focus:border-white/40"
                />
                <button
                  onClick={handleComment}
                  disabled={!commentText.trim()}
                  className="text-xs bg-white text-black font-semibold px-3 py-1.5 rounded-full disabled:opacity-40"
                >
                  发送
                </button>
              </div>
            )}

            {!walletConnected && showComment && (
              <p className="text-xs text-dark-secondary mt-2">请先连接钱包以评论</p>
            )}

            {/* Action bar */}
            <div className="flex items-center gap-1 mt-3 -ml-1.5">
              {/* Like */}
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs transition-all duration-150 ${
                  liked
                    ? 'text-white bg-white/10'
                    : 'text-dark-secondary hover:text-white hover:bg-white/5'
                }`}
                title={walletConnected ? '点赞' : '连接钱包后点赞'}
              >
                <span className={liked ? 'animate-heart' : ''}>
                  {liked ? '♥' : '♡'}
                </span>
                <span>{likeCount}</span>
              </button>

              {/* Comment */}
              <button
                onClick={() => setShowComment(!showComment)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs text-dark-secondary hover:text-white hover:bg-white/5 transition-all duration-150"
                title="评论"
              >
                <span>💬</span>
                <span>{comments.length || ''}</span>
              </button>

              {/* Share */}
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs text-dark-secondary hover:text-white hover:bg-white/5 transition-all duration-150"
                title="分享（复制链接）"
              >
                <span>🔗</span>
              </button>

              {/* Revenue info */}
              {pub.totalRevenue > 0 && (
                <span className="ml-auto text-xs text-gray-500 font-mono">
                  {pub.totalRevenue} ₳
                </span>
              )}

              {/* Report / Block */}
              <div className="relative ml-auto">
                <button
                  onClick={() => setShowReportMenu(!showReportMenu)}
                  className="flex items-center px-2.5 py-1.5 rounded-full text-xs text-dark-secondary hover:text-white hover:bg-white/5 transition-all duration-150"
                  title="举报或屏蔽"
                >
                  ···
                </button>
                {showReportMenu && (
                  <div className="absolute right-0 bottom-8 w-40 bg-dark-card border border-dark-border rounded-xl shadow-xl z-50 overflow-hidden animate-fadeIn">
                    <button
                      onClick={handleReport}
                      className="w-full text-left px-4 py-2.5 text-xs text-gray-400 hover:bg-dark-hover hover:text-white transition-colors"
                    >
                      🚩 举报内容
                    </button>
                    <button
                      onClick={handleBlock}
                      className="w-full text-left px-4 py-2.5 text-xs text-gray-400 hover:bg-dark-hover hover:text-red-400 transition-colors border-t border-dark-border"
                    >
                      🚫 屏蔽此人
                    </button>
                    <button
                      onClick={() => setShowReportMenu(false)}
                      className="w-full text-left px-4 py-2.5 text-xs text-dark-secondary hover:bg-dark-hover transition-colors border-t border-dark-border"
                    >
                      取消
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Reported notice */}
            {reported && (
              <p className="text-xs text-gray-500 mt-1">✓ 已举报，感谢反馈</p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
