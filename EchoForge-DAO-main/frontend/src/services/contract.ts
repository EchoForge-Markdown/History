// ============================================================
// 智能合约交互服务
// 新流程：发布 → 审核 → 链证 → 分成
// 分成比例：推广打赏 65/25/10，普通打赏 70/0/30
// MVP 阶段使用模拟逻辑 + 本地状态
// 链证模块已升级为 CIP-68 标准
// ============================================================

import type { Publication, OnChainProof, RevenueRecord } from '../types';
import { mintCIP68NFT } from './cip68';

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
 * 铸造链上证明 NFT（CIP-68 标准）
 *
 * CIP-68 流程：
 *   1. 生成 (100){name} Reference Token → 脚本地址（含元数据 Datum）
 *   2. 生成 (222){name} User NFT Token  → 作者钱包
 *
 * 元数据存储在 Reference Token 的 inline Datum 中，
 * 不依赖链外元数据服务（去中心化）。
 */
export async function mintOnChainProof(
  publication: Publication,
  authorAddress?: string,
  walletSignFn?: (txCbor: string) => Promise<string>,
): Promise<{
  success: boolean;
  proof?: OnChainProof;
  error?: string;
}> {
  try {
    const result = await mintCIP68NFT(
      publication,
      authorAddress || publication.authorAddress,
      undefined,   // ref script address (使用默认占位符)
      walletSignFn,
    );

    if (!result.success || !result.nft) {
      return { success: false, error: result.error ?? '铸造失败' };
    }

    const { nft } = result;

    console.log('🎖️ [CIP-68] 铸造完成:', {
      policyId:      nft.policyId,
      refToken:      nft.refTokenName,
      userToken:     nft.userTokenName,
      txHash:        nft.txHash,
    });

    const proof: OnChainProof = {
      publicationId: publication.id,
      txHash:        nft.txHash,
      policyId:      nft.policyId,
      assetName:     nft.userTokenName,  // 用户持有的 (222) token
      metadata: {
        title:      nft.metadata.name,
        author:     nft.metadata.author ?? publication.author,
        ipfsCid:    nft.metadata.ipfsCid ?? publication.ipfsCid ?? '',
        approvedAt: nft.metadata.approvedAt ?? Math.floor(Date.now() / 1000),
      },
      mintedAt: nft.mintedAt,
    };

    return { success: true, proof };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * 执行收入分成交易
 * - 推广链接付费：作者 65% / 宣传粉丝 25% / 平台 10%
 * - 普通打赏（无推广链接）：作者 70% / 平台 30%（无粉丝分成）
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
    const isReferred = !!(fanAddress && fanAddress.trim().length > 0);

    // Split ratios
    const authorPct    = isReferred ? 65 : 70;
    const fanPct       = isReferred ? 25 : 0;

    const authorShare   = Math.floor(totalAmount * authorPct / 100);
    const fanShare      = Math.floor(totalAmount * fanPct / 100);
    const platformShare = totalAmount - authorShare - fanShare;

    const mockTxHash = `tx_rev_${Math.random().toString(36).slice(2, 18)}`;

    console.log('💰 分成交易:', {
      total:    totalAmount,
      author:   `${authorShare} ADA (${authorPct}%)`,
      fan:      `${fanShare} ADA (${fanPct}%)`,
      platform: `${platformShare} ADA`,
      mode:     isReferred ? '推广' : '普通打赏',
    });

    const revenue: RevenueRecord = {
      id: `rev_${Date.now().toString(36)}`,
      publicationId,
      type: isReferred ? 'promotion' : 'tip',
      amount: totalAmount,
      payer: 'buyer',
      payerAddress: 'addr_test1qz...buyer',
      authorShare,
      fanShare,
      platformShare,
      referredFan: isReferred ? fanAddress : undefined,
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
  // Integer scaling: avoid floating-point by using integer division
  const authorReward = Math.floor(pool * 70 / 100);
  const platformFee  = Math.floor(pool * 10 / 100);
  const settlement: Settlement = {
    windowId: window.id,
    winnerProposalId: winner.id,
    authorReward,
    voterRewards: [],
    platformFee,
    nftMinted: `NFT_${winner.id}`,
    txHash: `tx_settle_${Math.random().toString(36).slice(2, 18)}`,
    settledAt: Math.floor(Date.now() / 1000),
  };
  return { success: true, settlement };
}
