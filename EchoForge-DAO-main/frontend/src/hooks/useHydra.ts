// ============================================================
// useHydra Hook — Hydra L2 状态管理
//
// 提供：
//   • Hydra Head 生命周期控制（连接/初始化/关闭）
//   • 提案管理（创建/查询）
//   • 高并发投票提交（通过 Hydra L2 通道）
//   • 实时投票聚合统计
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import type { HydraHeadStatus, HydraVote, HydraProposal, HydraHeadInfo } from '../types';
import {
  HydraClient,
  DEFAULT_HYDRA_NODE_URL,
  submitVote,
  aggregateVotes,
  hydraStatusLabel,
} from '../services/hydra';

// ============================================================
// 示例提案数据
// ============================================================

const DEMO_PROPOSALS: HydraProposal[] = [
  {
    id: 'prop_hydra_001',
    publicationId: 'pub_demo1',
    title: 'EchoForge DAO 治理提案 #1：升级分成比例',
    description:
      '提议将粉丝分成比例从 20% 调整至 25%，平台费率从 10% 降至 5%，以激励更多内容创作者。',
    author: 'Charles Tao',
    createdAt: Math.floor(Date.now() / 1000) - 7200,
    deadline: Math.floor(Date.now() / 1000) + 86400,
    votes: { yes: 0, no: 0, abstain: 0 },
    voters: [],
    status: 'active',
  },
  {
    id: 'prop_hydra_002',
    publicationId: 'pub_demo2',
    title: 'EchoForge DAO 治理提案 #2：接入 Hydra 永久存储',
    description:
      '提议使用 Arweave 作为 IPFS 的冷备份，确保内容永久性存储，并在链上记录 Arweave 交易 ID。',
    author: '匿名作者A',
    createdAt: Math.floor(Date.now() / 1000) - 3600,
    deadline: Math.floor(Date.now() / 1000) + 172800,
    votes: { yes: 0, no: 0, abstain: 0 },
    voters: [],
    status: 'active',
  },
];

// ============================================================
// Hook
// ============================================================

export function useHydra(nodeUrl?: string) {
  const clientRef = useRef<HydraClient | null>(null);

  const [headInfo, setHeadInfo] = useState<HydraHeadInfo>({
    headId: '',
    status: 'Idle',
    participants: [],
    snapshotNumber: 0,
    utxoCount: 0,
    nodeUrl: nodeUrl ?? DEFAULT_HYDRA_NODE_URL,
  });

  const [proposals, setProposals] = useState<HydraProposal[]>(DEMO_PROPOSALS);
  const [loading, setLoading]     = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [lastTxId, setLastTxId]   = useState<string | null>(null);

  // ----------------------------------------------------------
  // 初始化 HydraClient
  // ----------------------------------------------------------

  const getClient = useCallback((): HydraClient => {
    if (!clientRef.current) {
      const client = new HydraClient(nodeUrl ?? DEFAULT_HYDRA_NODE_URL);

      client.onStatusChange = (status: HydraHeadStatus) => {
        setHeadInfo(prev => ({ ...prev, status }));
        console.log('[Hydra] 状态变更:', status, hydraStatusLabel(status));
      };

      client.onTxValid = ({ txId }) => {
        setLastTxId(txId);
        console.log('[Hydra] 交易确认:', txId);
      };

      client.onTxInvalid = ({ txId, reason }) => {
        setError(`交易 ${txId.slice(0, 12)}... 无效：${reason}`);
      };

      client.onSnapshotConfirmed = ({ snapshotNumber }) => {
        setHeadInfo(prev => ({ ...prev, snapshotNumber }));
      };

      client.onHeadClosed = ({ snapshotNumber }) => {
        setHeadInfo(prev => ({ ...prev, snapshotNumber, status: 'Closed' }));
      };

      client.onHeadFinalized = () => {
        setHeadInfo(prev => ({ ...prev, status: 'Final' }));
      };

      client.onError = (msg: string) => {
        setError(msg);
        setConnected(false);
      };

      clientRef.current = client;
    }
    return clientRef.current;
  }, [nodeUrl]);

  // 组件卸载时断开连接
  useEffect(() => {
    return () => {
      clientRef.current?.disconnect();
    };
  }, []);

  // ----------------------------------------------------------
  // 连接到 Hydra 节点
  // ----------------------------------------------------------

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const client = getClient();
      client.connect();

      // 等待连接（最多 3 秒）；节点不可达时降级为"模拟模式"
      await new Promise<void>(resolve => {
        const timer = setTimeout(() => {
          // 降级：即使连接失败也允许使用模拟模式
          setConnected(true);
          setHeadInfo(prev => ({
            ...prev,
            headId:   'hydra_sim_head_001',
            status:   'Open',      // 模拟模式直接视为 Open
          }));
          console.warn('[Hydra] 节点不可达，进入模拟模式');
          resolve();
        }, 3000);

        const originalOnStatusChange = client.onStatusChange;
        client.onStatusChange = (status) => {
          originalOnStatusChange?.(status);
          if (status === 'Open' || status === 'Idle') {
            clearTimeout(timer);
            setConnected(true);
            resolve();
          }
        };
      });
    } finally {
      setLoading(false);
    }
  }, [getClient]);

  // ----------------------------------------------------------
  // 断开连接
  // ----------------------------------------------------------

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
    setConnected(false);
    setHeadInfo(prev => ({ ...prev, status: 'Idle' }));
  }, []);

  // ----------------------------------------------------------
  // 创建提案
  // ----------------------------------------------------------

  const createProposal = useCallback((data: {
    title: string;
    description: string;
    author: string;
    publicationId?: string;
    deadlineHours?: number;
  }) => {
    const proposal: HydraProposal = {
      id: `prop_${Date.now().toString(36)}`,
      publicationId: data.publicationId ?? '',
      title: data.title,
      description: data.description,
      author: data.author,
      createdAt: Math.floor(Date.now() / 1000),
      deadline: Math.floor(Date.now() / 1000) + (data.deadlineHours ?? 24) * 3600,
      votes: { yes: 0, no: 0, abstain: 0 },
      voters: [],
      status: 'active',
    };

    setProposals(prev => [proposal, ...prev]);
    return proposal;
  }, []);

  // ----------------------------------------------------------
  // 提交投票（Hydra L2）
  // ----------------------------------------------------------

  const vote = useCallback(async (
    proposalId: string,
    voterAddress: string,
    choice: 'yes' | 'no' | 'abstain',
    weightAda = 1,
    signFn?: (txCbor: string) => Promise<string>,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const proposal = proposals.find(p => p.id === proposalId);
      if (!proposal) return { success: false, error: '提案未找到' };
      if (proposal.status !== 'active') return { success: false, error: '提案已关闭' };
      if (proposal.deadline < Math.floor(Date.now() / 1000)) {
        return { success: false, error: '投票截止时间已过' };
      }
      // 防止重复投票
      if (proposal.voters.some(v => v.voterAddress === voterAddress)) {
        return { success: false, error: '你已经对此提案投过票' };
      }

      const client = getClient();
      const result = await submitVote(
        client,
        proposal,
        voterAddress,
        choice,
        weightAda * 1_000_000,  // 转换为 lovelace
        signFn,
      );

      if (result.success && result.vote) {
        const newVote = result.vote;
        setProposals(prev => prev.map(p => {
          if (p.id !== proposalId) return p;
          const updatedVotes = {
            yes:     p.votes.yes     + (choice === 'yes'     ? weightAda : 0),
            no:      p.votes.no      + (choice === 'no'      ? weightAda : 0),
            abstain: p.votes.abstain + (choice === 'abstain' ? weightAda : 0),
          };
          return { ...p, votes: updatedVotes, voters: [...p.voters, newVote] };
        }));
        setLastTxId(newVote.txHash);
        return { success: true, vote: newVote };
      }

      setError(result.error ?? '投票失败');
      return { success: false, error: result.error };
    } finally {
      setLoading(false);
    }
  }, [proposals, getClient]);

  // ----------------------------------------------------------
  // 关闭提案 / 结算
  // ----------------------------------------------------------

  const closeProposal = useCallback(async (proposalId: string) => {
    setProposals(prev => prev.map(p => {
      if (p.id !== proposalId) return p;
      const settleTxHash = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      return { ...p, status: 'settled' as const, settleTxHash };
    }));
    return { success: true };
  }, []);

  // ----------------------------------------------------------
  // 计算统计
  // ----------------------------------------------------------

  const getProposalStats = useCallback((proposalId: string) => {
    const proposal = proposals.find(p => p.id === proposalId);
    if (!proposal) return null;
    return aggregateVotes(proposal.voters);
  }, [proposals]);

  // ----------------------------------------------------------
  // 暴露 API
  // ----------------------------------------------------------

  return {
    headInfo,
    proposals,
    loading,
    connected,
    error,
    lastTxId,
    connect,
    disconnect,
    createProposal,
    vote,
    closeProposal,
    getProposalStats,
  };
}
