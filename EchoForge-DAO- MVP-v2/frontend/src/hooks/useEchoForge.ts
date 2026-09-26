// ============================================================
// useEchoForge Hook - 全局状态管理
// 新流程：发布 → 审核 → 链证 → 分成
// 作者 70% / 粉丝 20% / 平台 10%
// ============================================================

import { useState, useCallback } from 'react';
import type { Publication, ReviewRecord, RevenueRecord, FanRecord, SPLIT_RATIO } from '../types';
import { aiReview, mintOnChainProof, splitRevenueTx } from '../services/contract';
import { uploadToIPFS } from '../services/ipfs';

// 初始示例数据
const DEMO_PUBLICATIONS: Publication[] = [
  {
    id: 'pub_demo1',
    author: 'Charles Tao',
    authorAddress: 'addr_test1qz...charles',
    title: 'AI Agent 经济模型深度分析',
    content: '2026 年 AI Agent 将成为新的价值创造单元，本文从技术架构、经济模型、生态系统三个维度分析 AI Agent 的未来发展趋势...',
    category: 'AI & Tech',
    ipfsCid: 'QmDemo1234567890',
    createdAt: Math.floor(Date.now() / 1000) - 86400,
    reviewStatus: 'approved',
    aiScore: 92,
    aiComment: '内容质量优秀，原创性强，建议通过。',
    humanReviewer: 'DAO Reviewer #1',
    humanComment: '深度分析，逻辑清晰，通过审核。',
    reviewedAt: Math.floor(Date.now() / 1000) - 43200,
    onChainProof: {
      txHash: 'tx_cert_demo123456',
      policyId: 'policy_demo001',
      assetName: 'EchoForge_pub_demo1',
      mintedAt: Math.floor(Date.now() / 1000) - 36000,
    },
    referralCode: 'REF_CHARLES_001',
    fans: [
      { address: 'addr_test1qz...fan1', name: 'Alice', joinedAt: Math.floor(Date.now() / 1000) - 7200, referredBy: 'addr_test1qz...charles', contribution: 50, earned: 10 },
      { address: 'addr_test1qz...fan2', name: 'Bob', joinedAt: Math.floor(Date.now() / 1000) - 3600, referredBy: 'addr_test1qz...charles', contribution: 30, earned: 6 },
    ],
    totalRevenue: 200,
    authorEarned: 140,
    fansEarned: 40,
    platformEarned: 20,
  },
  {
    id: 'pub_demo2',
    author: '匿名作者A',
    authorAddress: 'addr_test1qz...anon_a',
    title: 'Cardano DeFi 生态投资指南 2026',
    content: 'Cardano 生态在 2026 年迎来爆发期，Hydra L2、Partner Chains、DeFi 协议全面成熟...',
    category: 'DeFi',
    createdAt: Math.floor(Date.now() / 1000) - 3600,
    reviewStatus: 'ai_reviewing',
    referralCode: 'REF_ANON_002',
    fans: [],
    totalRevenue: 0,
    authorEarned: 0,
    fansEarned: 0,
    platformEarned: 0,
  },
  {
    id: 'pub_demo3',
    author: '投稿者B',
    authorAddress: 'addr_test1qz...b',
    title: 'Web3 社交平台的未来形态',
    content: '去中心化社交平台正在重塑人类的信息传播方式...',
    category: 'Web3',
    createdAt: Math.floor(Date.now() / 1000) - 1800,
    reviewStatus: 'pending',
    referralCode: 'REF_B_003',
    fans: [],
    totalRevenue: 0,
    authorEarned: 0,
    fansEarned: 0,
    platformEarned: 0,
  },
];

export function useEchoForge() {
  const [publications, setPublications] = useState<Publication[]>(DEMO_PUBLICATIONS);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [revenues, setRevenues] = useState<RevenueRecord[]>([]);
  const [loading, setLoading] = useState(false);

  /** 发布内容 */
  const publish = useCallback(async (data: {
    author: string;
    authorAddress: string;
    title: string;
    content: string;
    category: string;
  }) => {
    setLoading(true);
    try {
      // 上传到 IPFS
      const ipfsCid = await uploadToIPFS({
        title: data.title,
        body: data.content,
        author: data.author,
        timestamp: Date.now(),
      });

      const pub: Publication = {
        id: `pub_${Date.now().toString(36)}`,
        author: data.author,
        authorAddress: data.authorAddress,
        title: data.title,
        content: data.content,
        category: data.category,
        ipfsCid,
        createdAt: Math.floor(Date.now() / 1000),
        reviewStatus: 'pending',
        referralCode: `REF_${data.author.replace(/\s/g, '_').toUpperCase()}_${Date.now().toString(36).slice(-4)}`,
        fans: [],
        totalRevenue: 0,
        authorEarned: 0,
        fansEarned: 0,
        platformEarned: 0,
      };

      setPublications(prev => [pub, ...prev]);
      return { success: true, publicationId: pub.id, ipfsCid };
    } finally {
      setLoading(false);
    }
  }, []);

  /** 触发 AI 审核 */
  const triggerAIReview = useCallback(async (publicationId: string) => {
    setLoading(true);
    try {
      const pub = publications.find(p => p.id === publicationId);
      if (!pub) return { success: false, error: '内容未找到' };

      // 更新状态为 AI 审核中
      setPublications(prev => prev.map(p =>
        p.id === publicationId ? { ...p, reviewStatus: 'ai_reviewing' as const } : p
      ));

      // 调用 AI 审核
      const result = await aiReview(pub.content, pub.title);

      const review: ReviewRecord = {
        publicationId,
        reviewType: 'ai',
        reviewer: 'EchoForge AI',
        score: result.score,
        comment: result.comment,
        decision: result.decision,
        timestamp: Math.floor(Date.now() / 1000),
      };

      setReviews(prev => [review, ...prev]);

      // 更新发布状态
      const newStatus = result.decision === 'approve' ? 'human_reviewing' : 
                        result.decision === 'reject' ? 'rejected' : 'pending';
      
      setPublications(prev => prev.map(p =>
        p.id === publicationId ? {
          ...p,
          reviewStatus: newStatus as Publication['reviewStatus'],
          aiScore: result.score,
          aiComment: result.comment,
        } : p
      ));

      return { success: true, review };
    } finally {
      setLoading(false);
    }
  }, [publications]);

  /** 人工审核 */
  const humanReview = useCallback(async (
    publicationId: string,
    reviewer: string,
    decision: 'approve' | 'reject',
    comment: string,
  ) => {
    setLoading(true);
    try {
      const review: ReviewRecord = {
        publicationId,
        reviewType: 'human',
        reviewer,
        score: decision === 'approve' ? 100 : 0,
        comment,
        decision,
        timestamp: Math.floor(Date.now() / 1000),
      };

      setReviews(prev => [review, ...prev]);

      setPublications(prev => prev.map(p =>
        p.id === publicationId ? {
          ...p,
          reviewStatus: decision === 'approve' ? 'approved' as const : 'rejected' as const,
          humanReviewer: reviewer,
          humanComment: comment,
          reviewedAt: Math.floor(Date.now() / 1000),
        } : p
      ));

      return { success: true };
    } finally {
      setLoading(false);
    }
  }, []);

  /** 铸造链上证明 */
  const certifyOnChain = useCallback(async (publicationId: string) => {
    setLoading(true);
    try {
      const pub = publications.find(p => p.id === publicationId);
      if (!pub) return { success: false, error: '内容未找到' };
      if (pub.reviewStatus !== 'approved') return { success: false, error: '需先通过审核' };

      const result = await mintOnChainProof(pub);
      if (result.success && result.proof) {
        setPublications(prev => prev.map(p =>
          p.id === publicationId ? {
            ...p,
            onChainProof: {
              txHash: result.proof!.txHash,
              policyId: result.proof!.policyId,
              assetName: result.proof!.assetName,
              mintedAt: result.proof!.mintedAt,
            },
          } : p
        ));
        return { success: true, proof: result.proof };
      }
      return { success: false, error: result.error };
    } finally {
      setLoading(false);
    }
  }, [publications]);

  /** 添加粉丝 (通过推广码) */
  const addFan = useCallback(async (referralCode: string, fanName: string, fanAddress: string) => {
    const pub = publications.find(p => p.referralCode === referralCode);
    if (!pub) return { success: false, error: '无效的推广码' };
    if (!pub.onChainProof) return { success: false, error: '该作品尚未获得链上认证' };

    const fan: FanRecord = {
      address: fanAddress,
      name: fanName,
      joinedAt: Math.floor(Date.now() / 1000),
      referredBy: pub.authorAddress,
      contribution: 0,
      earned: 0,
    };

    setPublications(prev => prev.map(p =>
      p.id === pub.id ? { ...p, fans: [...p.fans, fan] } : p
    ));

    return { success: true, publicationId: pub.id };
  }, [publications]);

  /** 执行分成 */
  const executeRevenue = useCallback(async (publicationId: string, amount: number, fanAddress?: string) => {
    setLoading(true);
    try {
      const pub = publications.find(p => p.id === publicationId);
      if (!pub) return { success: false, error: '内容未找到' };
      if (!pub.onChainProof) return { success: false, error: '需先获得链上认证' };

      const targetFan = fanAddress || pub.fans[0]?.address || '';
      const result = await splitRevenueTx(publicationId, amount, pub.authorAddress, targetFan);

      if (result.success && result.revenue) {
        setRevenues(prev => [result.revenue!, ...prev]);

        // 更新发布统计
        setPublications(prev => prev.map(p =>
          p.id === publicationId ? {
            ...p,
            totalRevenue: p.totalRevenue + amount,
            authorEarned: p.authorEarned + result.revenue!.authorShare,
            fansEarned: p.fansEarned + result.revenue!.fanShare,
            platformEarned: p.platformEarned + result.revenue!.platformShare,
            fans: p.fans.map(f =>
              f.address === targetFan
                ? { ...f, contribution: f.contribution + amount, earned: f.earned + result.revenue!.fanShare }
                : f
            ),
          } : p
        ));

        return { success: true, revenue: result.revenue };
      }
      return { success: false, error: result.error };
    } finally {
      setLoading(false);
    }
  }, [publications]);

  /** 统计 */
  const stats = {
    totalPublications: publications.length,
    pendingReview: publications.filter(p => p.reviewStatus === 'pending' || p.reviewStatus === 'ai_reviewing' || p.reviewStatus === 'human_reviewing').length,
    approved: publications.filter(p => p.reviewStatus === 'approved').length,
    certified: publications.filter(p => p.onChainProof).length,
    totalRevenue: publications.reduce((sum, p) => sum + p.totalRevenue, 0),
    totalFans: publications.reduce((sum, p) => sum + p.fans.length, 0),
  };

  return {
    publications,
    reviews,
    revenues,
    loading,
    stats,
    publish,
    triggerAIReview,
    humanReview,
    certifyOnChain,
    addFan,
    executeRevenue,
  };
}
