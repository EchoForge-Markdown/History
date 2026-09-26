// ============================================================
// Co-Creation Tab — Publication Management / 共同创建 — 发布管理
//
// EN: Allows valid Promotion Package holders (≥ 5 ADA) to submit and vote
//     on co-creation proposals for specific content pieces.
//     Contribution scores are weighted by package value and verified votes.
//
// ZH: 允许持有有效推广包（≥ 5 ADA）的用户对特定内容提交共创提案并进行加权投票。
//     贡献得分由包金额和已验证投票数加权计算。
//
// FR: Permet aux détenteurs d'un Pack de promotion valide (≥ 5 ADA) de soumettre
//     et de voter sur des propositions de co-création pour des contenus spécifiques.
//
// ES: Permite a los titulares de Paquetes de Promoción válidos (≥ 5 ADA) enviar
//     y votar propuestas de co-creación para contenidos específicos.
// ============================================================

import React, { useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PromotionPackage {
  packageId: string;
  contentId: string;
  holder: string;       // wallet address
  amountADA: number;    // must be >= 5 ADA
  hasVoted: boolean;
  verifiedVotes: number;
}

export interface CoCreationProposal {
  proposalId: string;
  contentId: string;
  contentTitle: string;
  proposer: string;
  descriptionHash: string;  // IPFS CID
  description: string;      // off-chain preview
  yesVotes: number;
  noVotes: number;
  totalWeight: number;
  status: 'active' | 'approved' | 'rejected';
  platformFeeADA: number;
  createdAt: number;
}

interface CoCreationTabProps {
  walletAddress: string;
  walletConnected: boolean;
  loading: boolean;
  packages: PromotionPackage[];
  proposals: CoCreationProposal[];
  onPurchasePackage: (contentId: string, amountADA: number) => Promise<{ success: boolean; pkg?: PromotionPackage }>;
  onSubmitProposal: (packageId: string, contentId: string, description: string) => Promise<{ success: boolean; proposal?: CoCreationProposal }>;
  onVoteOnProposal: (proposalId: string, packageId: string, vote: 'yes' | 'no') => Promise<{ success: boolean }>;
  onFinalizeProposal: (proposalId: string) => Promise<{ success: boolean }>;
}

// ── calculate_contribution_score (mirrors on-chain logic) ─────────────────────
// EN: Base score from package value + bonus from verified co-creation votes.
// ZH: 基础分来自包金额，奖励分来自已验证共创投票数。
const MIN_PACKAGE_ADA = 5;
const BASE_SCORE_UNIT = 100;
const VOTE_BONUS = 50;

export function calculateContributionScore(amountADA: number, verifiedVotes: number): number {
  const baseScore = Math.floor(amountADA / MIN_PACKAGE_ADA) * BASE_SCORE_UNIT;
  const bonusScore = verifiedVotes * VOTE_BONUS;
  return baseScore + bonusScore;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const CoCreationTab: React.FC<CoCreationTabProps> = ({
  walletAddress,
  walletConnected,
  loading,
  packages,
  proposals,
  onPurchasePackage,
  onSubmitProposal,
  onVoteOnProposal,
  onFinalizeProposal,
}) => {
  // Panel visibility
  const [showBuyPanel, setShowBuyPanel] = useState(false);
  const [showProposalPanel, setShowProposalPanel] = useState(false);

  // Purchase form state
  const [buyContentId, setBuyContentId] = useState('');
  const [buyAmount, setBuyAmount] = useState(5);

  // Submit proposal form state
  const [propContentId, setPropContentId] = useState('');
  const [propDescription, setPropDescription] = useState('');
  const [propPackageId, setPropPackageId] = useState('');

  // Voting state
  const [votingProposalId, setVotingProposalId] = useState<string | null>(null);
  const [votePackageId, setVotePackageId] = useState('');

  // Feedback
  const [result, setResult] = useState<string | null>(null);

  const flash = (msg: string) => {
    setResult(msg);
    setTimeout(() => setResult(null), 5000);
  };

  // My packages
  const myPackages = packages.filter(p => p.holder === walletAddress);
  const unusedPackages = myPackages.filter(p => !p.hasVoted);

  // Packages usable for a given contentId
  const usablePackagesFor = (contentId: string) =>
    unusedPackages.filter(p => p.contentId === contentId);

  const activeProposals = proposals.filter(p => p.status === 'active');
  const closedProposals = proposals.filter(p => p.status !== 'active');

  const timeAgo = (ts: number) => {
    const diff = Math.floor(Date.now() / 1000) - ts;
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleBuyPackage = async () => {
    if (!buyContentId.trim() || buyAmount < MIN_PACKAGE_ADA) return;
    const res = await onPurchasePackage(buyContentId.trim(), buyAmount);
    if (res.success) {
      flash(`✅ Promotion Package purchased! Bound to content: ${buyContentId}`);
      setShowBuyPanel(false);
      setBuyContentId('');
      setBuyAmount(5);
    } else {
      flash('❌ Purchase failed — check wallet connection and amount.');
    }
  };

  const handleSubmitProposal = async () => {
    if (!propContentId.trim() || !propDescription.trim() || !propPackageId) return;
    const res = await onSubmitProposal(propPackageId, propContentId.trim(), propDescription.trim());
    if (res.success) {
      flash('✅ Proposal submitted successfully!');
      setShowProposalPanel(false);
      setPropContentId('');
      setPropDescription('');
      setPropPackageId('');
    } else {
      flash('❌ Submission failed — ensure you hold a valid package for this content.');
    }
  };

  const handleVote = async (proposalId: string, vote: 'yes' | 'no') => {
    if (!votePackageId) return;
    const res = await onVoteOnProposal(proposalId, votePackageId, vote);
    if (res.success) {
      flash(`✅ Vote cast: ${vote === 'yes' ? '👍 Yes' : '👎 No'}`);
      setVotingProposalId(null);
      setVotePackageId('');
    } else {
      flash('❌ Vote failed — check your package credentials.');
    }
  };

  const handleFinalize = async (proposalId: string) => {
    const res = await onFinalizeProposal(proposalId);
    if (res.success) {
      flash('✅ Proposal finalized — 10% platform fee distributed.');
    } else {
      flash('❌ Finalization failed.');
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">
            共同创建 · Co-Creation
          </h2>
          <p className="text-sm text-dark-secondary mt-1">
            Purchase a Promotion Package (≥ 5 ADA) · Submit &amp; vote on proposals · Weighted by contribution score
          </p>
        </div>
        {walletConnected && (
          <div className="flex gap-2">
            <button
              onClick={() => { setShowBuyPanel(!showBuyPanel); setShowProposalPanel(false); }}
              className="btn-outline text-xs"
            >
              {showBuyPanel ? '✕ Cancel' : '＋ Buy Package'}
            </button>
            <button
              onClick={() => { setShowProposalPanel(!showProposalPanel); setShowBuyPanel(false); }}
              className="btn-primary text-xs"
              disabled={unusedPackages.length === 0}
            >
              {showProposalPanel ? '✕ Cancel' : '✍ Propose'}
            </button>
          </div>
        )}
      </div>

      {/* Connect wallet prompt */}
      {!walletConnected && (
        <div className="card border-white/10 bg-white/5">
          <p className="text-gray-300 text-sm">
            Connect your wallet to purchase a Promotion Package and participate in co-creation.
            <br />
            <span className="text-dark-secondary text-xs">
              连接钱包以购买推广包并参与共创 · Connectez votre portefeuille pour participer · Conecte su monedero para participar
            </span>
          </p>
        </div>
      )}

      {/* Feedback banner */}
      {result && (
        <div className="card border-white/20 bg-white/5 animate-fadeIn">
          <p className="text-white text-sm">{result}</p>
        </div>
      )}

      {/* ── Buy Package Panel ────────────────────────────────────────────── */}
      {showBuyPanel && (
        <div className="card space-y-4 border-white/20 animate-slideUp">
          <h3 className="font-semibold text-white text-sm">
            Purchase Promotion Package / 购买推广包
          </h3>
          <p className="text-xs text-dark-secondary">
            EN: Lock ≥ 5 ADA to obtain a voting credential bound to a specific content piece.<br />
            ZH: 锁定 ≥ 5 ADA，获得绑定特定内容的投票凭证。<br />
            FR: Verrouillez ≥ 5 ADA pour obtenir un justificatif de vote lié à un contenu.<br />
            ES: Bloquee ≥ 5 ADA para obtener una credencial de voto vinculada a un contenido.
          </p>

          <div>
            <label className="text-xs text-dark-secondary mb-1 block">Content ID (IPFS CID / on-chain ID)</label>
            <input
              type="text"
              placeholder="e.g. QmXxx... or pub_001"
              className="input-field"
              value={buyContentId}
              onChange={e => setBuyContentId(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-dark-secondary mb-1 block">
              Amount (ADA) — minimum 5 ADA
            </label>
            <input
              type="number"
              min={5}
              step={1}
              className="input-field"
              value={buyAmount}
              onChange={e => setBuyAmount(Number(e.target.value))}
            />
            {buyAmount >= MIN_PACKAGE_ADA && (
              <p className="text-xs text-gray-400 mt-1">
                Contribution score: <span className="text-white font-semibold">
                  {calculateContributionScore(buyAmount, 0)}
                </span> pts (base)
              </p>
            )}
          </div>

          {/* Fee breakdown */}
          <div className="bg-dark-bg rounded-xl p-3 border border-dark-border text-xs">
            <p className="text-dark-secondary mb-2">Platform fee breakdown / 平台费用说明</p>
            <div className="flex justify-between">
              <span className="text-dark-secondary">Platform fee (10%)</span>
              <span className="text-white font-semibold">{(buyAmount * 0.1).toFixed(2)} ADA</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-dark-secondary">Locked in package</span>
              <span className="text-white font-semibold">{(buyAmount * 0.9).toFixed(2)} ADA</span>
            </div>
          </div>

          <button
            onClick={handleBuyPackage}
            disabled={loading || !buyContentId.trim() || buyAmount < MIN_PACKAGE_ADA || !walletConnected}
            className="btn-primary w-full text-sm"
          >
            {loading ? 'Processing...' : `Purchase Package (${buyAmount} ADA)`}
          </button>
        </div>
      )}

      {/* ── Submit Proposal Panel ────────────────────────────────────────── */}
      {showProposalPanel && (
        <div className="card space-y-4 border-white/20 animate-slideUp">
          <h3 className="font-semibold text-white text-sm">
            Submit Co-Creation Proposal / 提交共创提案
          </h3>

          <div>
            <label className="text-xs text-dark-secondary mb-1 block">Select Package (your unused packages)</label>
            <select
              className="input-field"
              value={propPackageId}
              onChange={e => {
                setPropPackageId(e.target.value);
                const pkg = unusedPackages.find(p => p.packageId === e.target.value);
                if (pkg) setPropContentId(pkg.contentId);
              }}
            >
              <option value="">Choose a package…</option>
              {unusedPackages.map(pkg => (
                <option key={pkg.packageId} value={pkg.packageId}>
                  {pkg.packageId} · {pkg.amountADA} ADA · content: {pkg.contentId.slice(0, 16)}…
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-dark-secondary mb-1 block">Content ID (auto-filled from package)</label>
            <input
              type="text"
              className="input-field opacity-60"
              value={propContentId}
              readOnly
            />
          </div>

          <div>
            <label className="text-xs text-dark-secondary mb-1 block">Proposal Description</label>
            <textarea
              placeholder="Describe your co-creation proposal… (will be uploaded to IPFS)"
              className="input-field min-h-[100px] resize-none"
              value={propDescription}
              onChange={e => setPropDescription(e.target.value)}
            />
          </div>

          <button
            onClick={handleSubmitProposal}
            disabled={loading || !propPackageId || !propDescription.trim()}
            className="btn-primary w-full text-sm"
          >
            {loading ? 'Submitting…' : 'Submit Proposal (on-chain)'}
          </button>
        </div>
      )}

      {/* ── My Packages Panel ───────────────────────────────────────────── */}
      {walletConnected && myPackages.length > 0 && (
        <div>
          <h3 className="font-semibold text-dark-secondary text-sm mb-3">
            My Promotion Packages / 我的推广包
          </h3>
          <div className="space-y-2">
            {myPackages.map(pkg => {
              const score = calculateContributionScore(pkg.amountADA, pkg.verifiedVotes);
              return (
                <div key={pkg.packageId} className="card py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-xs font-mono text-gray-300 bg-dark-hover px-2 py-0.5 rounded border border-dark-border truncate">
                        {pkg.packageId}
                      </code>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${pkg.hasVoted ? 'bg-white/5 text-gray-500 border border-white/10' : 'bg-white/10 text-white border border-white/20'}`}>
                        {pkg.hasVoted ? 'Used / 已使用' : 'Active / 活跃'}
                      </span>
                    </div>
                    <p className="text-xs text-dark-secondary mt-1 truncate">
                      Content: {pkg.contentId}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {pkg.amountADA} ADA · Score: <span className="text-white font-semibold">{score}</span> pts
                      {pkg.verifiedVotes > 0 && (
                        <span className="text-gray-400"> (+{pkg.verifiedVotes * VOTE_BONUS} bonus)</span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Active Proposals ────────────────────────────────────────────── */}
      <div>
        <h3 className="font-semibold text-dark-secondary text-sm mb-3">
          Active Proposals / 活跃提案
          {activeProposals.length > 0 && (
            <span className="ml-2 text-xs text-white bg-white/10 px-2 py-0.5 rounded-full">{activeProposals.length}</span>
          )}
        </h3>

        {activeProposals.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-dark-secondary text-sm">No active proposals yet.</p>
            <p className="text-xs text-dark-secondary mt-1">
              暂无活跃提案 · Aucune proposition active · No hay propuestas activas
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeProposals.map(proposal => {
              const totalVotes = proposal.yesVotes + proposal.noVotes;
              const yesPercent = totalVotes > 0 ? (proposal.yesVotes / totalVotes) * 100 : 50;
              const usable = usablePackagesFor(proposal.contentId);
              const isVoting = votingProposalId === proposal.proposalId;

              return (
                <div key={proposal.proposalId} className="card space-y-3">
                  {/* Proposal header */}
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {proposal.proposer.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white text-sm">{proposal.proposer}</span>
                        <span className="text-xs text-dark-secondary">· {timeAgo(proposal.createdAt)}</span>
                        <span className="text-xs bg-dark-hover px-2 py-0.5 rounded-full text-gray-300 border border-dark-border">
                          {proposal.contentTitle}
                        </span>
                      </div>
                      <p className="text-sm text-dark-secondary mt-1 line-clamp-2">{proposal.description}</p>
                      {proposal.descriptionHash && (
                        <a
                          href={`https://gateway.pinata.cloud/ipfs/${proposal.descriptionHash}`}
                          target="_blank" rel="noreferrer"
                          className="text-xs text-gray-400 hover:text-white mt-1 inline-block"
                        >
                          IPFS ↗
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Vote bar */}
                  <div>
                    <div className="flex justify-between text-xs text-dark-secondary mb-1">
                      <span>Yes {proposal.yesVotes} · No {proposal.noVotes} · Weight {proposal.totalWeight}</span>
                      <span>{yesPercent.toFixed(1)}% yes</span>
                    </div>
                    <div className="h-2 rounded-full bg-dark-hover overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full transition-all duration-500"
                        style={{ width: `${yesPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Platform fee info */}
                  <div className="text-xs text-dark-secondary">
                    Platform fee (10%): <span className="text-gray-400">{proposal.platformFeeADA.toFixed(2)} ADA</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {walletConnected && usable.length > 0 && !isVoting && (
                      <button
                        onClick={() => {
                          setVotingProposalId(proposal.proposalId);
                          setVotePackageId(usable[0].packageId);
                        }}
                        className="btn-outline text-xs py-1.5 px-3"
                      >
                        Vote
                      </button>
                    )}

                    {walletConnected && usable.length === 0 && (
                      <span className="text-xs text-dark-secondary">
                        No unused packages for this content · 无可用推广包
                      </span>
                    )}

                    {isVoting && (
                      <div className="flex-1 space-y-2 animate-fadeIn">
                        <div>
                          <label className="text-xs text-dark-secondary mb-1 block">Select Package</label>
                          <select
                            className="input-field text-xs"
                            value={votePackageId}
                            onChange={e => setVotePackageId(e.target.value)}
                          >
                            {usable.map(pkg => (
                              <option key={pkg.packageId} value={pkg.packageId}>
                                {pkg.packageId} · {pkg.amountADA} ADA · score {calculateContributionScore(pkg.amountADA, pkg.verifiedVotes)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVote(proposal.proposalId, 'yes')}
                            disabled={loading || !votePackageId}
                            className="btn-success text-xs py-1.5 px-3"
                          >
                            👍 Yes
                          </button>
                          <button
                            onClick={() => handleVote(proposal.proposalId, 'no')}
                            disabled={loading || !votePackageId}
                            className="btn-danger text-xs py-1.5 px-3"
                          >
                            👎 No
                          </button>
                          <button
                            onClick={() => { setVotingProposalId(null); setVotePackageId(''); }}
                            className="btn-outline text-xs py-1.5 px-3"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => handleFinalize(proposal.proposalId)}
                      disabled={loading}
                      className="btn-outline text-xs py-1.5 px-3 ml-auto"
                    >
                      Finalize &amp; Distribute Fee
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Closed Proposals ────────────────────────────────────────────── */}
      {closedProposals.length > 0 && (
        <div>
          <h3 className="font-semibold text-dark-secondary text-sm mb-3">
            Closed Proposals / 已结算提案
          </h3>
          <div className="space-y-2">
            {closedProposals.map(proposal => (
              <div key={proposal.proposalId} className="card py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-sm font-medium">{proposal.proposer}</span>
                      <span className="text-xs text-dark-secondary">· {proposal.contentTitle}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        proposal.status === 'approved'
                          ? 'bg-white/15 text-white border border-white/30'
                          : 'bg-white/5 text-gray-500 border border-white/10'
                      }`}>
                        {proposal.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                      </span>
                    </div>
                    <p className="text-xs text-dark-secondary mt-1 line-clamp-1">{proposal.description}</p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="text-white font-semibold">{proposal.yesVotes} yes</p>
                    <p className="text-gray-500">{proposal.noVotes} no</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────── */}
      {myPackages.length === 0 && proposals.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-3xl mb-3">🤝</p>
          <p className="text-dark-secondary">No co-creation activity yet.</p>
          <p className="text-xs text-dark-secondary mt-1">
            Buy a Promotion Package (≥ 5 ADA) to participate.
            <br />
            购买推广包（≥ 5 ADA）参与共创 · Achetez un Pack de promotion · Compre un Paquete de Promoción
          </p>
        </div>
      )}

      {/* ── How it works (multilingual) ─────────────────────────────────── */}
      <div className="card bg-dark-bg border-dark-border text-xs space-y-2">
        <p className="font-semibold text-white mb-1">How it works / 如何运作 / Comment ça marche / Cómo funciona</p>
        <div className="grid grid-cols-1 gap-1 text-dark-secondary">
          <div className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white font-bold shrink-0">1</span>
            <span>EN: Purchase a Promotion Package (≥ 5 ADA) bound to a content piece to earn voting rights.</span>
          </div>
          <div className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white font-bold shrink-0 opacity-50">↳</span>
            <span>ZH: 购买绑定特定内容的推广包（≥ 5 ADA）以获得投票权。</span>
          </div>
          <div className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white font-bold shrink-0">2</span>
            <span>EN / ZH / FR / ES: Contribution score = (package ADA ÷ 5) × 100 + verified_votes × 50</span>
          </div>
          <div className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white font-bold shrink-0">3</span>
            <span>EN: Each package is permanently bound to one content_id — cannot vote on different content.</span>
          </div>
          <div className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white font-bold shrink-0 opacity-50">↳</span>
            <span>ZH: 每个包永久绑定一个 content_id，防止对不同内容重复投票。</span>
          </div>
          <div className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white font-bold shrink-0">4</span>
            <span>EN / FR / ES: 10% platform fee is enforced on-chain at finalization. / 结算时链上强制收取 10% 平台手续费。</span>
          </div>
        </div>
      </div>
    </div>
  );
};
