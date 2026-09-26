// ============================================================
// Hydra L2 投票 Tab
//
// 功能：
//   • 连接/断开 Hydra 节点，显示 Head 状态
//   • 创建治理提案
//   • 通过 Hydra L2 高并发投票（yes / no / abstain）
//   • 实时显示投票聚合结果
//   • 关闭提案并结算
// 纯黑白灰风格，与其他 Tab 保持一致
// ============================================================

import React, { useState } from 'react';
import type { HydraProposal } from '../types';
import { hydraStatusLabel } from '../services/hydra';
import type { useHydra } from '../hooks/useHydra';

type HydraHook = ReturnType<typeof useHydra>;

interface HydraVoteTabProps {
  hydra: HydraHook;
  walletAddress: string;
  walletConnected: boolean;
}

export const HydraVoteTab: React.FC<HydraVoteTabProps> = ({
  hydra,
  walletAddress,
  walletConnected,
}) => {
  const [showCreateForm, setShowCreateForm]   = useState(false);
  const [newTitle, setNewTitle]               = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDeadlineH, setNewDeadlineH]       = useState(24);
  const [result, setResult]                   = useState<string | null>(null);
  const [weightAda, setWeightAda]             = useState(1);

  const { headInfo, proposals, loading, connected, error } = hydra;

  // ── 辅助 ──────────────────────────────────────────────────

  const timeLeft = (deadline: number) => {
    const diff = deadline - Math.floor(Date.now() / 1000);
    if (diff <= 0) return '已截止';
    if (diff < 3600)  return `${Math.floor(diff / 60)} 分钟后截止`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时后截止`;
    return `${Math.floor(diff / 86400)} 天后截止`;
  };

  const timeAgo = (ts: number) => {
    const diff = Math.floor(Date.now() / 1000) - ts;
    if (diff < 60)    return `${diff} 秒前`;
    if (diff < 3600)  return `${Math.floor(diff / 60)} 分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
    return `${Math.floor(diff / 86400)} 天前`;
  };

  const totalVotes = (p: HydraProposal) => p.votes.yes + p.votes.no + p.votes.abstain;

  const pct = (part: number, total: number) =>
    total === 0 ? 0 : Math.round((part / total) * 100);

  // ── 处理函数 ─────────────────────────────────────────────

  const handleCreateProposal = () => {
    if (!newTitle || !newDescription) return;
    hydra.createProposal({
      title: newTitle,
      description: newDescription,
      author: walletAddress
        ? `${walletAddress.slice(0, 12)}...`
        : '匿名',
      deadlineHours: newDeadlineH,
    });
    setNewTitle('');
    setNewDescription('');
    setShowCreateForm(false);
    setResult('提案已创建，等待 DAO 成员投票');
    setTimeout(() => setResult(null), 4000);
  };

  const handleVote = async (
    proposalId: string,
    choice: 'yes' | 'no' | 'abstain',
  ) => {
    const addr = walletAddress || `addr_sim_${Math.random().toString(36).slice(2, 10)}`;
    const res  = await hydra.vote(proposalId, addr, choice, weightAda);
    if (res.success) {
      const label = choice === 'yes' ? '✅ 赞成' : choice === 'no' ? '❌ 反对' : '🔘 弃权';
      setResult(`投票成功！${label} · TxHash: ${res.vote?.txHash.slice(0, 16)}... (L2)`);
      setTimeout(() => setResult(null), 5000);
    } else {
      setResult(`投票失败：${res.error}`);
      setTimeout(() => setResult(null), 4000);
    }
  };

  const handleClose = async (proposalId: string) => {
    await hydra.closeProposal(proposalId);
    setResult('提案已关闭，结果已记录');
    setTimeout(() => setResult(null), 4000);
  };

  // ── 渲染 ─────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* 标题 + 操作栏 */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Hydra L2 投票</h2>
          <p className="text-sm text-dark-secondary mt-1">
            通过 Cardano Hydra 状态通道实现高并发 DAO 治理投票
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {connected ? (
            <button
              onClick={hydra.disconnect}
              className="btn-outline text-xs"
            >
              断开
            </button>
          ) : (
            <button
              onClick={hydra.connect}
              disabled={loading}
              className="btn-primary text-xs"
            >
              {loading ? '连接中...' : '连接 Hydra'}
            </button>
          )}
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            disabled={!walletConnected && !connected}
            className="btn-glow text-xs"
          >
            {showCreateForm ? '✕ 取消' : '＋ 新提案'}
          </button>
        </div>
      </div>

      {/* Hydra Head 状态面板 */}
      <div className="card bg-dark-bg border-dark-border">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-dark-secondary">Hydra Head 状态</p>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              connected && headInfo.status === 'Open'
                ? 'bg-white animate-pulse'
                : connected
                ? 'bg-gray-400'
                : 'bg-gray-700'
            }`} />
            <span className="text-xs text-white font-medium">
              {hydraStatusLabel(headInfo.status)}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <p className="text-dark-muted">节点</p>
            <p className="text-gray-300 font-mono truncate mt-0.5">{headInfo.nodeUrl}</p>
          </div>
          <div>
            <p className="text-dark-muted">Head ID</p>
            <p className="text-gray-300 font-mono truncate mt-0.5">
              {headInfo.headId ? headInfo.headId.slice(0, 18) + '...' : '—'}
            </p>
          </div>
          <div>
            <p className="text-dark-muted">快照号</p>
            <p className="text-white font-bold mt-0.5">#{headInfo.snapshotNumber}</p>
          </div>
          <div>
            <p className="text-dark-muted">UTxO 数</p>
            <p className="text-white font-bold mt-0.5">{headInfo.utxoCount}</p>
          </div>
        </div>

        {/* Hydra 生命周期说明 */}
        <div className="mt-4 flex items-center gap-1 overflow-x-auto text-[10px] text-dark-secondary">
          {(['Idle', 'Initializing', 'Open', 'Closed', 'FanoutPossible', 'Final'] as const).map(
            (s, i, arr) => (
              <React.Fragment key={s}>
                <span className={`whitespace-nowrap px-2 py-0.5 rounded-full border ${
                  headInfo.status === s
                    ? 'border-white/40 text-white bg-white/10'
                    : 'border-dark-border text-dark-muted'
                }`}>
                  {hydraStatusLabel(s)}
                </span>
                {i < arr.length - 1 && (
                  <span className="text-dark-border shrink-0">→</span>
                )}
              </React.Fragment>
            )
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="card border-white/10 bg-white/5">
          <p className="text-gray-400 text-xs">{error}</p>
        </div>
      )}

      {/* 操作结果提示 */}
      {result && (
        <div className="card border-white/20 bg-white/5 animate-fadeIn">
          <p className="text-white text-sm">{result}</p>
        </div>
      )}

      {/* 新建提案表单 */}
      {showCreateForm && (
        <div className="card space-y-3 border-white/20 animate-slideUp">
          <h3 className="font-semibold text-white text-sm">创建治理提案</h3>
          <input
            type="text"
            placeholder="提案标题"
            className="input-field"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
          />
          <textarea
            placeholder="提案描述（说明背景、动机和预期影响）"
            className="input-field min-h-[100px] resize-none"
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
          />
          <div>
            <label className="text-xs text-dark-secondary mb-1 block">
              投票截止（小时）
            </label>
            <input
              type="number"
              className="input-field"
              value={newDeadlineH}
              onChange={e => setNewDeadlineH(Number(e.target.value))}
              min={1}
              max={720}
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-dark-secondary">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            投票将通过 Hydra L2 状态通道处理，支持高并发、低延迟
          </div>
          <button
            onClick={handleCreateProposal}
            disabled={!newTitle || !newDescription}
            className="btn-glow w-full text-sm"
          >
            创建提案
          </button>
        </div>
      )}

      {/* 投票权重设置 */}
      {proposals.some(p => p.status === 'active') && (
        <div className="flex items-center gap-3 text-xs text-dark-secondary">
          <span>投票权重 (ADA):</span>
          <input
            type="number"
            className="input-field w-24 text-xs py-1"
            value={weightAda}
            onChange={e => setWeightAda(Math.max(1, Number(e.target.value)))}
            min={1}
          />
          <span className="text-dark-muted">≥ 1 ADA</span>
        </div>
      )}

      {/* 提案列表 */}
      <div className="space-y-4">
        {proposals.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-3xl mb-3">🗳️</p>
            <p className="text-dark-secondary">暂无治理提案</p>
            <p className="text-xs text-dark-secondary mt-1">
              连接 Hydra 节点后创建提案，开始高并发 DAO 投票
            </p>
          </div>
        ) : (
          proposals.map(proposal => {
            const total  = totalVotes(proposal);
            const yPct   = pct(proposal.votes.yes,     total);
            const nPct   = pct(proposal.votes.no,      total);
            const aPct   = pct(proposal.votes.abstain, total);
            const closed = proposal.status !== 'active' ||
                           proposal.deadline < Math.floor(Date.now() / 1000);
            const alreadyVoted = proposal.voters.some(
              v => v.voterAddress === walletAddress
            );
            const hasSimVoted = !walletAddress && proposal.voters.some(
              v => v.voterAddress.startsWith('addr_sim_')
            );

            return (
              <div key={proposal.id} className={`card border-white/20 ${
                proposal.status === 'settled' ? 'opacity-70' : ''
              }`}>
                {/* 提案头 */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                        proposal.status === 'active' && !closed
                          ? 'bg-white/10 border-white/30 text-white'
                          : proposal.status === 'settled'
                          ? 'bg-white/5 border-white/10 text-gray-500'
                          : 'bg-white/5 border-white/10 text-gray-400'
                      }`}>
                        {proposal.status === 'settled' ? '✓ 已结算'
                          : closed ? '截止'
                          : '🗳️ 投票中'}
                      </span>
                      <span className="text-xs text-dark-secondary">
                        {timeLeft(proposal.deadline)}
                      </span>
                      <span className="text-xs bg-dark-hover px-2 py-0.5 rounded-full text-dark-secondary">
                        L2 · Hydra
                      </span>
                    </div>
                    <h4 className="font-bold text-white mt-2">{proposal.title}</h4>
                    <p className="text-sm text-dark-secondary mt-1 line-clamp-2">
                      {proposal.description}
                    </p>
                    <p className="text-xs text-dark-muted mt-1">
                      by {proposal.author} · {timeAgo(proposal.createdAt)}
                    </p>
                  </div>
                </div>

                {/* 投票结果可视化 */}
                <div className="mb-3">
                  <div className="flex gap-0.5 h-2 rounded-full overflow-hidden bg-dark-bg">
                    {yPct > 0 && (
                      <div
                        className="bg-white rounded-l-full transition-all duration-500"
                        style={{ width: `${yPct}%` }}
                      />
                    )}
                    {nPct > 0 && (
                      <div
                        className="bg-gray-600 transition-all duration-500"
                        style={{ width: `${nPct}%` }}
                      />
                    )}
                    {aPct > 0 && (
                      <div
                        className="bg-gray-800 rounded-r-full transition-all duration-500"
                        style={{ width: `${aPct}%` }}
                      />
                    )}
                    {total === 0 && (
                      <div className="w-full bg-dark-hover rounded-full" />
                    )}
                  </div>
                  <div className="flex justify-between text-xs text-dark-secondary mt-1.5">
                    <span className="text-white">
                      赞成 {proposal.votes.yes} ADA ({yPct}%)
                    </span>
                    <span className="text-gray-400">
                      反对 {proposal.votes.no} ADA ({nPct}%)
                    </span>
                    <span className="text-gray-600">
                      弃权 {proposal.votes.abstain} ADA ({aPct}%)
                    </span>
                  </div>
                  {total > 0 && (
                    <p className="text-xs text-dark-muted mt-1">
                      {proposal.voters.length} 票 · 共 {total} ADA · 均通过 Hydra L2
                    </p>
                  )}
                </div>

                {/* 投票按钮 */}
                {!closed && !alreadyVoted && !hasSimVoted && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleVote(proposal.id, 'yes')}
                      disabled={loading}
                      className="flex-1 py-2 text-xs font-semibold rounded-xl
                                 bg-white text-black hover:bg-white/90 
                                 disabled:opacity-50 transition-all duration-200"
                    >
                      {loading ? '...' : '✅ 赞成'}
                    </button>
                    <button
                      onClick={() => handleVote(proposal.id, 'no')}
                      disabled={loading}
                      className="flex-1 py-2 text-xs font-semibold rounded-xl
                                 bg-dark-hover text-gray-300 border border-dark-border
                                 hover:border-white/30 disabled:opacity-50 transition-all duration-200"
                    >
                      {loading ? '...' : '❌ 反对'}
                    </button>
                    <button
                      onClick={() => handleVote(proposal.id, 'abstain')}
                      disabled={loading}
                      className="flex-1 py-2 text-xs font-semibold rounded-xl
                                 bg-dark-hover text-gray-500 border border-dark-border
                                 hover:border-white/20 disabled:opacity-50 transition-all duration-200"
                    >
                      {loading ? '...' : '🔘 弃权'}
                    </button>
                  </div>
                )}

                {(alreadyVoted || hasSimVoted) && !closed && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-dark-secondary">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    你已投票 (L2)
                  </div>
                )}

                {/* 结算按钮（已截止且未结算） */}
                {closed && proposal.status === 'active' && (
                  <button
                    onClick={() => handleClose(proposal.id)}
                    disabled={loading}
                    className="mt-3 w-full py-2 text-xs font-semibold rounded-xl
                               bg-dark-hover text-gray-300 border border-dark-border
                               hover:border-white/30 transition-all duration-200"
                  >
                    {loading ? '结算中...' : '关闭并结算提案'}
                  </button>
                )}

                {/* 结算信息 */}
                {proposal.status === 'settled' && proposal.settleTxHash && (
                  <div className="mt-3 bg-dark-bg rounded-xl p-3 border border-dark-border">
                    <p className="text-[10px] text-dark-muted">
                      结算 TxHash: {proposal.settleTxHash.slice(0, 24)}...
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Hydra 技术说明 */}
      <div className="card bg-dark-bg border-dark-border text-xs text-dark-secondary space-y-1">
        <p className="font-semibold text-gray-300">🔷 Hydra L2 工作原理</p>
        <p>① 参与方在 L1 提交 Commit UTxO，开启 Hydra Head（状态通道）</p>
        <p>② Head 进入 Open 状态后，投票交易在链下高速处理（~毫秒级确认）</p>
        <p>③ 每次快照（Snapshot）对所有参与方签名，保证安全性</p>
        <p>④ 投票结束后关闭 Head，最终状态通过 Fanout 写回 Cardano L1</p>
      </div>
    </div>
  );
};
