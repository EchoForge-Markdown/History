// ============================================================
// 智能合约交互服务
// 新流程：发布 → 审核 → 链证 → 分成
// MVP 阶段使用模拟逻辑 + 本地状态
// ============================================================

import type { Publication, OnChainProof, RevenueRecord, SPLIT_RATIO } from '../types';

// 合约脚本地址（Preview 测试网 - 部署后替换）
export const SCRIPT_ADDRESS = 'addr_test1wp...placeholder';

/**
 * 模拟 AI 审核
 * 真实环境中调用 AI API 进行内容审核
 */
export async function aiReview(content: string, title: string): Promise<{
  score: number;
  comment: string;
  decision: 'approve' | 'reject' | 'revise';
}> {
  // MVP 模拟 AI 审核（延迟模拟）
  await new Promise(r => setTimeout(r, 1500));
  
  const score = 60 + Math.floor(Math.random() * 40); // 60-99
  const decisions: Array<'approve' | 'reject' | 'revise'> = ['approve', 'approve', 'approve', 'revise'];
  const decision = score >= 70 ? 'approve' : decisions[Math.floor(Math.random() * decisions.length)];
  
  const comments: Record<string, string> = {
    approve: '内容质量优秀，原创性强，建议通过。',
    reject: '内容涉嫌抄袭或质量不达标，建议拒绝。',
    revise: '内容有潜力，但需要修改部分段落后重新提交。',
  };

  return { score, comment: comments[decision], decision };
}

/**
 * 铸造链上证明 NFT
 * 审核通过后，在 Cardano 链上铸造 CIP-68 NFT
 */
export async function mintOnChainProof(publication: Publication): Promise<{
  success: boolean;
  proof?: OnChainProof;
  error?: string;
}> {
  try {
    const mockTxHash = `tx_cert_${Math.random().toString(36).slice(2, 18)}`;
    const mockPolicyId = `policy_${Math.random().toString(36).slice(2, 14)}`;
    const assetName = `EchoForge_${publication.id}`;

    console.log('🎖️ 铸造链上证明:', {
      author: publication.author,
      title: publication.title,
      ipfsCid: publication.ipfsCid,
    });

    const proof: OnChainProof = {
      publicationId: publication.id,
      txHash: mockTxHash,
      policyId: mockPolicyId,
      assetName,
      metadata: {
        title: publication.title,
        author: publication.author,
        ipfsCid: publication.ipfsCid || '',
        approvedAt: Math.floor(Date.now() / 1000),
      },
      mintedAt: Math.floor(Date.now() / 1000),
    };

    return { success: true, proof };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * 执行收入分成交易
 * 固定比例：作者 70% / 粉丝 20% / 平台 10%
 */
export async function splitRevenueTx(
  publicationId: string,
  totalAmount: number,
  authorAddress: string,
  fanAddress: string,
): Promise<{
  success: boolean;
  revenue?: RevenueRecord;
  error?: string;
}> {
  try {
    const authorShare = Math.floor(totalAmount * 70 / 100);
    const fanShare = Math.floor(totalAmount * 20 / 100);
    const platformShare = totalAmount - authorShare - fanShare; // 余额给平台

    const mockTxHash = `tx_rev_${Math.random().toString(36).slice(2, 18)}`;

    console.log('💰 分成交易:', {
      total: totalAmount,
      author: `${authorShare} ADA (70%)`,
      fan: `${fanShare} ADA (20%)`,
      platform: `${platformShare} ADA (10%)`,
    });

    const revenue: RevenueRecord = {
      id: `rev_${Date.now().toString(36)}`,
      publicationId,
      type: 'purchase',
      amount: totalAmount,
      payer: 'buyer',
      payerAddress: 'addr_test1qz...buyer',
      authorShare,
      fanShare,
      platformShare,
      referredFan: fanAddress,
      txHash: mockTxHash,
      timestamp: Math.floor(Date.now() / 1000),
    };

    return { success: true, revenue };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ===== 保留旧接口兼容 =====
import type { WindowConfig, Proposal, Settlement } from '../types';

export async function buildOpenWindowTx(config: Omit<WindowConfig, 'id' | 'status' | 'createdAt'>): Promise<{
  success: boolean; txHash?: string; windowId?: string; error?: string;
}> {
  const windowId = `win_${Date.now().toString(36)}`;
  const mockTxHash = `tx_${Math.random().toString(36).slice(2, 18)}`;
  return { success: true, txHash: mockTxHash, windowId };
}

export async function buildVoteTx(proposalId: string, voterAddress: string): Promise<{
  success: boolean; txHash?: string; error?: string;
}> {
  const mockTxHash = `tx_vote_${Math.random().toString(36).slice(2, 18)}`;
  return { success: true, txHash: mockTxHash };
}

export async function buildSettleTx(window: WindowConfig, proposals: Proposal[]): Promise<{
  success: boolean; settlement?: Settlement; error?: string;
}> {
  const winner = [...proposals].sort((a, b) => b.votes - a.votes)[0];
  if (!winner) return { success: false, error: '没有提案可结算' };
  const pool = window.poolAmount;
  const settlement: Settlement = {
    windowId: window.id,
    winnerProposalId: winner.id,
    authorReward: pool * 0.7,
    voterRewards: [],
    platformFee: pool * 0.1,
    nftMinted: `NFT_${winner.id}`,
    txHash: `tx_settle_${Math.random().toString(36).slice(2, 18)}`,
    settledAt: Math.floor(Date.now() / 1000),
  };
  return { success: true, settlement };
}
