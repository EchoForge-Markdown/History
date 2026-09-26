# EchoForge DAO

Overview: EchoForge DAO is an AI-powered content echo system structured as a DAO. It enables creators to amplify their knowledge and content across distributed nodes through AI-assisted generation, curation, and redistribution.

> **Cardano 链上内容重塑者** — 区块链驱动的去中心化内容征集、投票与分成平台  


## 架构概览

```
EchoForgeDAO/
├── frontend/           # React + Vite + Tailwind + MeshJS
│   ├── src/
│   │   ├── App.tsx             # 主应用（Tab 导航）
│   │   ├── components/         # UI 组件
│   │   │   ├── WalletConnect.tsx   # Yoroi/Eternl/Nami 钱包连接
│   │   │   ├── WindowTab.tsx       # 开窗（创建征集）
│   │   │   ├── ProposalTab.tsx     # 提案（投稿）
│   │   │   ├── VoteTab.tsx         # 投票
│   │   │   └── SettlementTab.tsx   # 结算（自动分账 + NFT）
│   │   ├── hooks/
│   │   │   ├── useWallet.ts        # 钱包状态管理
│   │   │   └── useEchoForge.ts     # 全局业务状态
│   │   ├── services/
│   │   │   ├── blockfrost.ts       # Blockfrost API
│   │   │   ├── ipfs.ts             # IPFS/Pinata 上传
│   │   │   └── contract.ts         # 智能合约交互
│   │   └── types/
│   │       └── index.ts            # TypeScript 类型定义
│   └── ...config files
├── contracts/          # OpShin (Plutus) 智能合约
│   ├── echoforge.py              # 主合约：开窗/投票/结算
│   └── README.md                 # 合约文档
└── README.md           # 本文件
```

## 技术栈

### 前端
| 技术 | 用途 |
|------|------|
| **React 18** + **TypeScript** | 核心框架 |
| **Vite** | 构建工具 |
| **Tailwind CSS** | Twitter/X 风格 UI |
| **MeshJS** | Cardano 钱包集成 |
| **Blockfrost API** | 链上数据查询 |
| **Pinata/IPFS** | 内容永久存储 |

### 后端（链上）
| 技术 | 用途 |
|------|------|
| **OpShin** | Plutus 合约 (Python-like) |
| **CIP-68** | NFT 元数据标准 |
| **Cardano Preview** | 测试网 |

## 快速开始

### 1. 安装前端依赖
```bash
cd frontend
npm install
```

### 2. 配置环境变量
```bash
# frontend/.env
VITE_BLOCKFROST_API_KEY=your_blockfrost_api_key
VITE_PINATA_JWT=your_pinata_jwt_token
```

- 获取 Blockfrost API Key: https://blockfrost.io
- 获取 Pinata JWT: https://pinata.cloud

### 3. 启动开发服务器
```bash
npm run dev
```
浏览器打开 http://localhost:5173

### 4. 编译合约（可选）
```bash
pip install opshin
cd contracts
opshin build spending echoforge.py
```

## 功能流程

```
开窗 → 设置奖池/分成比例/截止时间
  ↓
提案 → 投稿者提交内容（上传 IPFS）
  ↓
投票 → 社区投票选出最佳内容
  ↓
结算 → 智能合约自动分账
         ├── 50% → 胜出作者
         ├── 30% → 投票者均分
         └── 20% → 平台
  ↓
NFT 空投 → 胜出者获得 CIP-68 徽章
```

## MVP 特性
- ✅ 浏览器直接运行，无需服务器
- ✅ 钱包连接（支持模拟模式）
- ✅ Twitter/X 风格暗色 UI
- ✅ IPFS 内容上传
- ✅ 链上交易模拟
- ✅ OpShin 智能合约（可编译部署）

## 下一步
- [ ] 部署合约到 Preview 测试网
- [ ] 接入真实 Blockfrost API
- [ ] 实现 CIP-68 NFT 铸造
- [ ] Hydra L2 高并发投票
- [ ] StoryForge 子模块合并
- [ ] Hydra L2 高并发投票
