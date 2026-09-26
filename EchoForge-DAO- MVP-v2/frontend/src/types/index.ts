// ============================================================
// EchoForge DAO 类型定义
// 新流程：发布 → 审核 → 链证 → 分成
// 作者 70% / 粉丝 20% / 平台 10%
// ============================================================

/** 钱包状态 */
export interface WalletState {
  connected: boolean;
  address: string;
  balance: number; // lovelace
  walletName: string;
}

/** 审核状态 */
export type ReviewStatus = 'pending' | 'ai_reviewing' | 'human_reviewing' | 'approved' | 'rejected';

/** 内容发布 */
export interface Publication {
  id: string;
  author: string;
  authorAddress: string;
  title: string;
  content: string;
  category: string;
  ipfsCid?: string;
  createdAt: number;
  /** 审核相关 */
  reviewStatus: ReviewStatus;
  aiScore?: number;        // AI 审核评分 0-100
  aiComment?: string;      // AI 审核意见
  humanReviewer?: string;  // 人工审核员
  humanComment?: string;   // 人工审核意见
  reviewedAt?: number;
  /** 链上证明 */
  onChainProof?: {
    txHash: string;
    policyId: string;
    assetName: string;
    mintedAt: number;
  };
  /** 推广 & 分成 */
  referralCode: string;     // 推广码
  fans: FanRecord[];         // 粉丝列表
  totalRevenue: number;      // 总收入 (ADA)
  authorEarned: number;      // 作者已赚 (ADA)
  fansEarned: number;        // 粉丝已赚 (ADA)
  platformEarned: number;    // 平台已赚 (ADA)
}

/** 粉丝记录 */
export interface FanRecord {
  address: string;
  name: string;
  joinedAt: number;
  referredBy: string;      // 推荐人地址
  contribution: number;    // 贡献值 (ADA)
  earned: number;          // 已赚分成 (ADA)
}

/** 审核记录 */
export interface ReviewRecord {
  publicationId: string;
  reviewType: 'ai' | 'human';
  reviewer: string;
  score: number;
  comment: string;
  decision: 'approve' | 'reject' | 'revise';
  timestamp: number;
}

/** 链上证明 */
export interface OnChainProof {
  publicationId: string;
  txHash: string;
  policyId: string;
  assetName: string;
  metadata: {
    title: string;
    author: string;
    ipfsCid: string;
    approvedAt: number;
  };
  mintedAt: number;
}

/** 收入记录 */
export interface RevenueRecord {
  id: string;
  publicationId: string;
  type: 'purchase' | 'tip' | 'subscription';
  amount: number;           // ADA
  payer: string;
  payerAddress: string;
  /** 分成明细 */
  authorShare: number;      // 70%
  fanShare: number;         // 20%
  platformShare: number;    // 10%
  /** 推广链 */
  referredFan?: string;     // 推荐粉丝地址
  txHash: string;
  timestamp: number;
}

/** 分成比例 (固定) */
export const SPLIT_RATIO = {
  author: 70,
  fan: 20,
  platform: 10,
} as const;

/** 结算结果 (保持向后兼容) */
export interface Settlement {
  windowId: string;
  winnerProposalId: string;
  authorReward: number;
  voterRewards: { address: string; amount: number }[];
  platformFee: number;
  nftMinted: string;
  txHash: string;
  settledAt: number;
}

/** Tab 类型 */
export type TabType = 'publish' | 'review' | 'onchain' | 'revenue';

/** Blockfrost UTXO */
export interface BlockfrostUTxO {
  tx_hash: string;
  tx_index: number;
  output_index: number;
  amount: { unit: string; quantity: string }[];
  block: string;
  data_hash: string | null;
  inline_datum: string | null;
}

// ===== 向后兼容旧类型 (渐进迁移) =====
export interface WindowConfig {
  id: string;
  creator: string;
  creatorAddress: string;
  title: string;
  description: string;
  splitRatio: { author: number; voters: number; platform: number };
  poolAmount: number;
  deadline: number;
  status: 'open' | 'voting' | 'settled';
  createdAt: number;
  ipfsCid?: string;
}

export interface Proposal {
  id: string;
  windowId: string;
  author: string;
  authorAddress: string;
  title: string;
  content: string;
  ipfsCid?: string;
  votes: number;
  voters: string[];
  submittedAt: number;
  nftBadge?: string;
}

export interface Vote {
  proposalId: string;
  voter: string;
  voterAddress: string;
  timestamp: number;
  txHash?: string;
}
