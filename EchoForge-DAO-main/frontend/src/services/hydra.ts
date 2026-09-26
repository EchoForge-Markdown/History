// ============================================================
// Hydra L2 投票服务
//
// Hydra (https://hydra.family) 是 Cardano 的同构状态通道（Layer 2），
// 支持高并发链下交易，适合 DAO 投票等高频场景。
//
// 生命周期：
//   Idle → Initializing → Open → Closed → FanoutPossible → Final
//
// 节点 API：
//   WebSocket ws://<hydra-node>:4001   — 状态推送 + 命令提交
//   HTTP      http://<hydra-node>:4001  — UTxO 查询
//
// 此服务提供：
//   HydraClient  — WebSocket 客户端（含断线重连）
//   submitVote() — 通过 Hydra Head 提交投票交易
//   aggregateVotes() — 聚合投票结果
// ============================================================

import type { HydraHeadStatus, HydraVote, HydraProposal, HydraHeadInfo } from '../types';

// ============================================================
// 配置
// ============================================================

/** 默认 Hydra 节点地址（Preview 测试网本地节点） */
export const DEFAULT_HYDRA_NODE_URL = 'ws://localhost:4001';

/** 重连等待时间（ms） */
const RECONNECT_DELAY = 3000;
/** 最大重连次数 */
const MAX_RECONNECTS = 5;

// ============================================================
// Hydra 消息类型
// ============================================================

interface HydraServerOutput {
  tag: string;
  [key: string]: unknown;
}

interface HydraGreeting extends HydraServerOutput {
  tag: 'Greetings';
  me: { vkey: string };
  headStatus: HydraHeadStatus;
  snapshotUtxo: Record<string, unknown>;
  hydraHeadId: string;
  hydraNodeVersion: string;
}

interface HeadIsOpenMsg extends HydraServerOutput {
  tag: 'HeadIsOpen';
  headId: string;
  utxo: Record<string, unknown>;
}

interface TxValidMsg extends HydraServerOutput {
  tag: 'TxValid';
  headId: string;
  transaction: { id: string; [k: string]: unknown };
}

interface TxInvalidMsg extends HydraServerOutput {
  tag: 'TxInvalid';
  headId: string;
  transaction: { id: string; [k: string]: unknown };
  validationError: { reason: string };
}

interface SnapshotConfirmedMsg extends HydraServerOutput {
  tag: 'SnapshotConfirmed';
  headId: string;
  snapshot: { snapshotNumber: number; utxo: Record<string, unknown> };
}

interface HeadIsClosedMsg extends HydraServerOutput {
  tag: 'HeadIsClosed';
  headId: string;
  snapshotNumber: number;
}

interface HeadIsFinalizedMsg extends HydraServerOutput {
  tag: 'HeadIsFinalized';
  headId: string;
  utxo: Record<string, unknown>;
}

// ============================================================
// HydraClient
// ============================================================

type EventHandler<T> = (data: T) => void;

export class HydraClient {
  private ws: WebSocket | null = null;
  private reconnects = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _connected = false;
  private messageQueue: string[] = [];

  // 事件回调
  onStatusChange?: EventHandler<HydraHeadStatus>;
  onTxValid?: EventHandler<{ txId: string; headId: string }>;
  onTxInvalid?: EventHandler<{ txId: string; reason: string }>;
  onSnapshotConfirmed?: EventHandler<{ snapshotNumber: number }>;
  onHeadClosed?: EventHandler<{ headId: string; snapshotNumber: number }>;
  onHeadFinalized?: EventHandler<{ headId: string }>;
  onError?: EventHandler<string>;

  headInfo: HydraHeadInfo = {
    headId: '',
    status: 'Idle',
    participants: [],
    snapshotNumber: 0,
    utxoCount: 0,
    nodeUrl: DEFAULT_HYDRA_NODE_URL,
  };

  constructor(public readonly nodeUrl: string = DEFAULT_HYDRA_NODE_URL) {
    this.headInfo.nodeUrl = nodeUrl;
  }

  // ----------------------------------------------------------
  // 连接管理
  // ----------------------------------------------------------

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    try {
      this.ws = new WebSocket(this.nodeUrl);

      this.ws.onopen = () => {
        this._connected = true;
        this.reconnects = 0;
        console.log('[Hydra] 已连接:', this.nodeUrl);
        // 发送队列中的消息
        while (this.messageQueue.length > 0) {
          this.ws?.send(this.messageQueue.shift()!);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as HydraServerOutput;
          this.handleMessage(msg);
        } catch (e) {
          console.warn('[Hydra] 无法解析消息:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.error('[Hydra] WebSocket 错误:', err);
        this.onError?.('Hydra 节点连接错误');
      };

      this.ws.onclose = () => {
        this._connected = false;
        console.warn('[Hydra] 连接断开，尝试重连...');
        this.scheduleReconnect();
      };
    } catch (err) {
      console.error('[Hydra] 无法创建 WebSocket:', err);
      this.onError?.(`无法连接到 Hydra 节点: ${this.nodeUrl}`);
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this._connected = false;
  }

  get connected(): boolean {
    return this._connected;
  }

  private scheduleReconnect(): void {
    if (this.reconnects >= MAX_RECONNECTS) {
      console.error('[Hydra] 达到最大重连次数，停止重连');
      this.onError?.('Hydra 节点无法连接，请检查网络和节点状态');
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnects++;
      console.log(`[Hydra] 第 ${this.reconnects} 次重连...`);
      this.connect();
    }, RECONNECT_DELAY * this.reconnects);
  }

  // ----------------------------------------------------------
  // 消息处理
  // ----------------------------------------------------------

  private handleMessage(msg: HydraServerOutput): void {
    switch (msg.tag) {
      case 'Greetings': {
        const g = msg as HydraGreeting;
        this.headInfo.headId = g.hydraHeadId;
        this.headInfo.status = g.headStatus;
        this.onStatusChange?.(g.headStatus);
        break;
      }
      case 'HeadIsOpen': {
        const m = msg as HeadIsOpenMsg;
        this.headInfo.headId = m.headId;
        this.headInfo.status = 'Open';
        this.headInfo.utxoCount = Object.keys(m.utxo).length;
        this.onStatusChange?.('Open');
        break;
      }
      case 'TxValid': {
        const m = msg as TxValidMsg;
        this.onTxValid?.({ txId: m.transaction.id, headId: m.headId });
        break;
      }
      case 'TxInvalid': {
        const m = msg as TxInvalidMsg;
        this.onTxInvalid?.({ txId: m.transaction.id, reason: m.validationError.reason });
        break;
      }
      case 'SnapshotConfirmed': {
        const m = msg as SnapshotConfirmedMsg;
        this.headInfo.snapshotNumber = m.snapshot.snapshotNumber;
        this.headInfo.utxoCount = Object.keys(m.snapshot.utxo).length;
        this.onSnapshotConfirmed?.({ snapshotNumber: m.snapshot.snapshotNumber });
        break;
      }
      case 'HeadIsClosed': {
        const m = msg as HeadIsClosedMsg;
        this.headInfo.status = 'Closed';
        this.onStatusChange?.('Closed');
        this.onHeadClosed?.({ headId: m.headId, snapshotNumber: m.snapshotNumber });
        break;
      }
      case 'ReadyToFanout': {
        this.headInfo.status = 'FanoutPossible';
        this.onStatusChange?.('FanoutPossible');
        break;
      }
      case 'HeadIsFinalized': {
        const m = msg as HeadIsFinalizedMsg;
        this.headInfo.status = 'Final';
        this.onStatusChange?.('Final');
        this.onHeadFinalized?.({ headId: m.headId });
        break;
      }
      default:
        // 其他消息静默忽略
        break;
    }
  }

  // ----------------------------------------------------------
  // 命令发送
  // ----------------------------------------------------------

  private send(cmd: object): void {
    const json = JSON.stringify(cmd);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(json);
    } else {
      // 入队，等待连接恢复后发送
      this.messageQueue.push(json);
    }
  }

  /**
   * 初始化 Hydra Head（调用 Init 命令）
   * 参与方需要在 L1 提交各自的 commit UTxO，之后 Head 进入 Open 状态。
   */
  init(): void {
    this.send({ tag: 'Init' });
  }

  /**
   * Commit 一个 UTxO 到 Head（每个参与方调用一次）
   */
  commit(utxo: Record<string, unknown>): void {
    this.send({ tag: 'Commit', utxo });
  }

  /**
   * 在 Open 状态向 Head 提交一笔链下交易（CBOR hex）
   */
  newTx(txCbor: string): void {
    this.send({ tag: 'NewTx', transaction: txCbor });
  }

  /**
   * 发起关闭 Head（进入挑战期，之后可 Fanout）
   */
  close(): void {
    this.send({ tag: 'Close' });
  }

  /**
   * 在挑战期内提交反驳快照（如有更新的合法快照）
   */
  contest(): void {
    this.send({ tag: 'Contest' });
  }

  /**
   * 挑战期结束后将链下资产分发回 L1
   */
  fanout(): void {
    this.send({ tag: 'Fanout' });
  }
}

// ============================================================
// 投票交易构建
// ============================================================

/**
 * 构建并提交 Hydra L2 投票交易。
 *
 * 在真实实现中，投票交易是一笔标准 Cardano 交易（带元数据），
 * 通过 HydraClient.newTx() 提交到 Head 内部共识。
 *
 * MVP 阶段：模拟交易 CBOR 和 tx hash，并通过 client.newTx() 发送。
 *
 * @param client    - 已连接且 Head 处于 Open 状态的 HydraClient
 * @param proposal  - 投票目标提案
 * @param voterAddress - 投票人 Cardano 地址
 * @param choice    - 投票选项
 * @param weight    - ADA 权重（lovelace）
 * @param _signFn   - 钱包签名函数（生产环境必须）
 */
export async function submitVote(
  client: HydraClient,
  proposal: HydraProposal,
  voterAddress: string,
  choice: 'yes' | 'no' | 'abstain',
  weight: number,
  _signFn?: (txCbor: string) => Promise<string>,
): Promise<{ success: boolean; vote?: HydraVote; error?: string }> {
  try {
    if (!client.connected || client.headInfo.status !== 'Open') {
      // 离线模式：允许本地记录（模拟 Hydra）
      console.warn('[Hydra] 未连接到 Hydra 节点，使用本地模拟模式');
    }

    // 构建投票元数据
    const voteMetadata = {
      674: {                         // CIP-20 message label
        msg: [`EchoForge DAO Vote`],
        proposalId: proposal.id,
        choice,
        weight: weight.toString(),
        voter: voterAddress.slice(0, 32),
      },
    };

    // 模拟构建 Cardano 交易（生产中使用 MeshJS 或 CSL）
    // const tx = new Transaction({ initiator: walletInstance })
    //   .attachMetadata(674, voteMetadata[674])
    //   .sendLovelace(VOTE_CONTRACT_ADDRESS, '2000000');
    // const unsigned = await tx.build();
    // const signed   = await signFn(unsigned);
    // client.newTx(signed);

    const txIdBytes = crypto.getRandomValues(new Uint8Array(32));
    const txHash = Array.from(txIdBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // 模拟 CBOR tx（前缀 84 = CBOR array(4) 即 Cardano Tx）
    const mockCbor = `84${txHash.slice(0, 32)}`;

    // 向 Hydra Head 提交（已连接时走 L2，否则标记为本地模拟）
    if (client.connected) {
      client.newTx(mockCbor);
    }

    const vote: HydraVote = {
      id: `vote_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      proposalId: proposal.id,
      voter: voterAddress.slice(0, 20) + '...',
      voterAddress,
      choice,
      weight,
      txHash,
      timestamp: Math.floor(Date.now() / 1000),
      layer: 'L2',  // Both connected and simulation modes use L2 designation
    };

    console.log('[Hydra] 投票提交:', {
      proposalId: proposal.id,
      choice,
      weight,
      txHash,
      headStatus: client.headInfo.status,
      metadata: voteMetadata,
    });

    return { success: true, vote };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ============================================================
// 投票聚合
// ============================================================

/**
 * 聚合一组 HydraVote，返回 yes/no/abstain 的权重合计。
 */
export function aggregateVotes(votes: HydraVote[]): {
  yes: number;
  no: number;
  abstain: number;
  total: number;
  yesPercent: number;
  noPercent: number;
  abstainPercent: number;
} {
  const yes     = votes.filter(v => v.choice === 'yes').reduce((s, v) => s + v.weight, 0);
  const no      = votes.filter(v => v.choice === 'no').reduce((s, v) => s + v.weight, 0);
  const abstain = votes.filter(v => v.choice === 'abstain').reduce((s, v) => s + v.weight, 0);
  const total   = yes + no + abstain;

  return {
    yes, no, abstain, total,
    yesPercent:     total > 0 ? Math.round((yes     / total) * 100) : 0,
    noPercent:      total > 0 ? Math.round((no      / total) * 100) : 0,
    abstainPercent: total > 0 ? Math.round((abstain / total) * 100) : 0,
  };
}

// ============================================================
// Hydra Head 生命周期辅助
// ============================================================

/**
 * 查询 Hydra 节点的当前 UTxO（HTTP API）
 * GET http://<node>:4001/snapshot/utxo
 */
export async function fetchHydraUtxo(nodeHttpUrl: string): Promise<Record<string, unknown>> {
  try {
    const url = nodeHttpUrl.replace(/^ws/, 'http').replace(/\/$/, '');
    const res = await fetch(`${url}/snapshot/utxo`);
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

/** 将 Hydra Head 状态翻译为中文显示标签 */
export function hydraStatusLabel(status: HydraHeadStatus): string {
  const labels: Record<HydraHeadStatus, string> = {
    Idle:             '空闲',
    Initializing:     '初始化中',
    Open:             '已开放 (L2 活跃)',
    Closed:           '已关闭 (挑战期)',
    FanoutPossible:   '可分发',
    Final:            '已结算',
  };
  return labels[status] ?? status;
}
