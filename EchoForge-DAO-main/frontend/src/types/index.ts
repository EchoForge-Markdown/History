// ============================================================
// EchoForge DAO 类型定义
// 新流程：发布 → 审核 → 链证 → 分成
// 分成比例：推广打赏 65/25/10，普通打赏 70/0/30
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
  type: 'purchase' | 'tip' | 'subscription' | 'promotion';
  amount: number;           // ADA
  payer: string;
  payerAddress: string;
  /** 分成明细 */
  authorShare: number;      // 65% (推广) 或 70% (普通打赏)
  fanShare: number;         // 25% (推广) 或 0% (普通打赏)
  platformShare: number;    // 10% (推广) 或 30% (普通打赏)
  /** 推广链 */
  referredFan?: string;     // 推荐粉丝地址（有则为推广分成）
  txHash: string;
  timestamp: number;
}

/** 分成比例 */
export const SPLIT_RATIO = {
  /** 通过推广链接的付费行为 */
  referred: { author: 65, fan: 25, platform: 10 },
  /** 普通打赏（非推广链接） */
  normal: { author: 70, fan: 0, platform: 30 },
} as const;

/** Echo Creator 认证信息 */
export interface CreatorCertification {
  address: string;
  name: string;
  certifiedAt: number;
  certificationFee: number;  // USDCx 或等值 ADA
  certificationTxHash: string;
  status: 'active' | 'cancelled';
}

/** 互动记录（点赞/评论/分享/举报） */
export interface Interaction {
  publicationId: string;
  userAddress: string;
  type: 'like' | 'comment' | 'share' | 'report' | 'block';
  content?: string;  // 评论内容
  timestamp: number;
}

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

// ===== CIP-68 NFT =====

/**
 * CIP-68 on-chain metadata stored in the reference-token datum.
 * Constr 0 [ Map<name→value>, version, extra ]
 */
export interface CIP68Metadata {
  name: string;
  image: string;           // ipfs://<CID> or https URL
  mediaType?: string;      // e.g. "image/png"
  description?: string;
  author?: string;
  ipfsCid?: string;
  approvedAt?: number;
  [key: string]: unknown;
}

/** A minted CIP-68 NFT pair (reference token + user token) */
export interface CIP68NFTPair {
  policyId: string;
  /** (100){assetName} — reference token */
  refTokenName: string;
  /** (222){assetName} — user NFT token */
  userTokenName: string;
  /** Script address holding the reference token + datum */
  refScriptAddress: string;
  metadata: CIP68Metadata;
  txHash: string;
  mintedAt: number;
}

// ===== Hydra L2 =====

/** Hydra Head status */
export type HydraHeadStatus =
  | 'Idle'
  | 'Initializing'
  | 'Open'
  | 'Closed'
  | 'FanoutPossible'
  | 'Final';

/** A single vote cast via Hydra L2 */
export interface HydraVote {
  id: string;
  proposalId: string;
  voter: string;
  voterAddress: string;
  choice: 'yes' | 'no' | 'abstain';
  weight: number;     // ADA weight
  txHash: string;     // Hydra internal tx hash
  timestamp: number;
  layer: 'L1' | 'L2'; // 'L2' when submitted through Hydra
}

/** A proposal available for Hydra voting */
export interface HydraProposal {
  id: string;
  publicationId: string;
  title: string;
  description: string;
  author: string;
  createdAt: number;
  deadline: number;
  votes: { yes: number; no: number; abstain: number };
  voters: HydraVote[];
  status: 'active' | 'closed' | 'settled';
  settleTxHash?: string;
}

/** Hydra Head info */
export interface HydraHeadInfo {
  headId: string;
  status: HydraHeadStatus;
  participants: string[];
  snapshotNumber: number;
  utxoCount: number;
  nodeUrl: string;
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
