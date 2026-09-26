# EchoForge DAO

<img src="https://github.com/user-attachments/assets/da293f85-2371-4549-936d-0c6ba1825a9c" alt="EchoForge DAO Banner" width="100%">

> **Cardano On-Chain Content Platform** — Publish Freely · AI+DAO Review · On-Chain Proof · Revenue Share

---

**Language / 语言 / Langue / Idioma / 言語:**
[English](#english) | [中文](#中文) | [Français](#français) | [Español](#español) | [日本語](#日本語)

---

## English

EchoForge DAO is a decentralised content platform built on the Cardano blockchain. Anyone can publish content freely; after passing dual AI+DAO review, the content receives an on-chain certificate (CIP-68 NFT) and revenue is split automatically via smart contract.

> **Cardano On-Chain Content Reshaper** — Publish Freely · AI+DAO Review · On-Chain Proof · Revenue Share

---

### Platform Flow

```
Publish (anyone may post)
  ↓
AI + DAO Review (quality gate)
  ↓
On-Chain Proof (approved → mint CIP-68 NFT, permanently recorded on-chain)
  ↓
Revenue Split (smart contract auto-executes revenue distribution)
```

---

### User Roles

#### General User
- Browse content without a wallet
- Create an account after connecting a wallet
- Publish articles **up to 400 characters, no revenue share**
- Like, comment, share, report/block content

#### Echo Creator (Certified Creator)
- Obtain Echo Creator status via a one-time certification fee
- Publish unlimited-length content and participate in revenue sharing
- Access review progress tracking and publication management (profit transaction details)
- Participate in the **Affiliate Referral Program**

---

### Echo Creator Certification

#### Certification Fee (one-time, no monthly fee)

| Slot | Fee | Note |
|------|-----|-------|
| First 10 | 10 USDCx (or equivalent ADA) | Early-bird price |
| From #11 | 20 USDCx (or equivalent ADA) | Standard price |

- Platform takes **10%** of the certification fee as a service charge
- The remaining **90%** enters the transparent DAO treasury (used for marketing, airdrops, development, and community building)
- Creators may cancel certification at any time; no forced subscription

---

### Revenue Split Rules

#### Normal Tip (no referral link)

| Recipient | Share |
|-----------|-------|
| Author | 70% |
| Platform | 30% |

#### Via Referral Link

| Recipient | Share |
|-----------|-------|
| Author | 65% |
| Referring Fan | 25% |
| Platform | 10% |

---

### Affiliate Referral Program

After purchasing a promotion package, the contract auto-generates a unique tracking link:
```
echoforge.app/p/12345?fan=<wallet_address>
```
All subsequent paid actions are tracked on-chain via a lightweight indexer.

#### Valid Paid Actions & Weights

| Action | Min Amount | Weight |
|--------|-----------|--------|
| New reader tips author's content | ≥ 2 ADA | ×1.0 (highest) |
| New reader buys author's promotion package | ≥ 5 ADA | ×0.8 (high) |
| New reader mints/purchases content NFT | ≥ 10 ADA | ×0.6 (medium) |
| Free click/follow | — | 5% consolation reward |

---

### Architecture

```
EchoForgeDAO/
├── frontend/           # React + Vite + Tailwind + MeshJS
│   └── src/
│       ├── App.tsx
│       ├── components/
│       ├── hooks/
│       ├── services/
│       └── types/
├── contracts/          # OpShin (Plutus) smart contracts
│   ├── echoforge.py
│   ├── co_creation.py
│   ├── settlement_engine.py
│   ├── content_moderation_engine.py
│   └── README.md
└── README.md
```

### Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 18** + **TypeScript** | Core framework |
| **Vite** | Build tool |
| **Tailwind CSS** | Twitter/X-style dark UI |
| **MeshJS** | Cardano wallet integration |
| **OpShin** | Plutus contracts (Python-like) |
| **CIP-68** | NFT metadata standard |
| **Blockfrost API** | On-chain data queries |
| **Pinata/IPFS** | Permanent content storage |

### Quick Start

```bash
# 1. Install dependencies
cd frontend && npm install

# 2. Set environment variables
# VITE_BLOCKFROST_API_KEY=your_key
# VITE_PINATA_JWT=your_jwt

# 3. Start dev server
npm run dev   # → http://localhost:5173

# 4. (Optional) Compile contracts
pip install opshin
cd contracts && opshin build spending echoforge.py
```

---

## 中文

EchoForge DAO 是一个基于 Cardano 区块链的去中心化内容平台。任何人均可自由发布内容，经过 AI+DAO 双重审核后获得链上证明（CIP-68 NFT），并通过智能合约自动实现收益分成。

> **Cardano 链上内容重塑者** — 自由发布 · AI+DAO 审核 · 链证 · 分成

---

### 平台流程

```
自由发布（任何人可发文）
  ↓
AI + DAO 审核（内容质量把关）
  ↓
链证（审核通过 → 铸造 CIP-68 NFT，永久链上存证）
  ↓
分成（智能合约自动执行收益分配）
```

---

### 用户角色

#### 普通用户
- 无需钱包即可浏览内容
- 连接钱包后可创建账号
- 可发布文章，**但仅限 400 字以内，无收益**
- 可点赞、评论、分享、举报/屏蔽内容

#### Echo Creator（认证创作者）
- 通过一次性支付认证费获得 Echo Creator 身份
- 可发布不限字数的内容并参与收益分成
- 拥有审核进度追踪、发布管理（盈利交易详情）
- 可参与「内容推广计划」（Affiliate Referral Program）

---

### 创作者认证（Echo Creator）

#### 认证费用（一次性，无月费）

| 名额 | 认证费 | 说明 |
|------|--------|------|
| 前 10 名 | 10 USDCx（或等值 ADA） | 早鸟价格 |
| 第 11 名起 | 20 USDCx（或等值 ADA） | 标准价格 |

- 平台收取认证费的 **10%** 作为手续费
- 其余 **90%** 进入透明 DAO 国库（用于营销、空投、开发和社区建设）
- 创作者可随时取消认证，无强制订阅压力

---

### 收益分成规则

#### 普通打赏（非推广链接）

| 收益方 | 比例 |
|--------|------|
| 作者 | 70% |
| 平台 | 30% |

#### 通过推广链接的付费行为

| 收益方 | 比例 |
|--------|------|
| 作者 | 65% |
| 宣传粉丝 | 25% |
| 平台 | 10% |

---

### 内容推广计划（Affiliate Referral Program）

粉丝购买推广包后，合约自动生成唯一追踪链接：
```
echoforge.app/p/12345?fan=<钱包地址>
```
所有后续付费行为通过轻量 indexer 链上追踪。

#### 有效付费行为与权重

| 行为 | 最低金额 | 权重 |
|------|----------|------|
| 新读者打赏作者内容 | ≥ 2 ADA | ×1.0（最高） |
| 新读者购买作者内容推广包 | ≥ 5 ADA | ×0.8（高） |
| 新读者铸造/购买内容 NFT | ≥ 10 ADA | ×0.6（中） |
| 免费点击/关注 | — | 5% 小额安慰奖 |

---

### 架构概览

```
EchoForgeDAO/
├── frontend/           # React + Vite + Tailwind + MeshJS
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   └── ...config files
├── contracts/          # OpShin (Plutus) 智能合约
│   ├── echoforge.py
│   ├── co_creation.py
│   ├── settlement_engine.py
│   ├── content_moderation_engine.py
│   └── README.md
└── README.md
```

### 技术栈

| 技术 | 用途 |
|------|------|
| **React 18** + **TypeScript** | 核心框架 |
| **Vite** | 构建工具 |
| **Tailwind CSS** | Twitter/X 风格暗色 UI |
| **MeshJS** | Cardano 钱包集成 |
| **OpShin** | Plutus 合约 (Python-like) |
| **CIP-68** | NFT 元数据标准（链证） |
| **Blockfrost API** | 链上数据查询 |
| **Pinata/IPFS** | 内容永久存储 |

### 快速开始

```bash
# 1. 安装前端依赖
cd frontend && npm install

# 2. 配置环境变量
# VITE_BLOCKFROST_API_KEY=your_blockfrost_api_key
# VITE_PINATA_JWT=your_pinata_jwt_token

# 3. 启动开发服务器
npm run dev   # 浏览器打开 http://localhost:5173

# 4. 编译合约（可选）
pip install opshin
cd contracts && opshin build spending echoforge.py
```

### MVP 特性
- ✅ 浏览器直接运行，无需服务器
- ✅ 钱包连接（支持模拟模式）
- ✅ 社交媒体风格 Feed 布局
- ✅ 普通用户 400 字免费发布
- ✅ Echo Creator 认证（USDCx/ADA 支付）
- ✅ AI+DAO 双重审核流程
- ✅ IPFS 内容上传 + CIP-68 链证
- ✅ 智能合约自动分成（推广 65/25/10，普通打赏 70/0/30）
- ✅ Hydra L2 高并发 DAO 投票

### 下一步
- [ ] 部署合约到 Preview 测试网
- [ ] 接入真实 Blockfrost API
- [ ] 接入真实 Hydra 节点
- [ ] 接入链上 DEX Oracle 获取 ADA/USDCx 实时汇率

---

## Français

EchoForge DAO est une plateforme de contenu décentralisée construite sur la blockchain Cardano. N'importe qui peut publier du contenu librement ; après avoir passé la double vérification IA+DAO, le contenu reçoit un certificat on-chain (CIP-68 NFT) et les revenus sont automatiquement partagés via le contrat intelligent.

> **Reconstructeur de Contenu On-Chain Cardano** — Publier Librement · Vérification IA+DAO · Preuve On-Chain · Partage des Revenus

---

### Flux de la plateforme

```
Publication libre (tout le monde peut poster)
  ↓
Vérification IA + DAO (contrôle qualité du contenu)
  ↓
Preuve on-chain (approuvé → frappe NFT CIP-68, stockage permanent on-chain)
  ↓
Partage des revenus (exécution automatique par le contrat intelligent)
```

---

### Rôles des utilisateurs

#### Utilisateur général
- Parcourir le contenu sans portefeuille
- Créer un compte après connexion du portefeuille
- Publier des articles **limités à 400 caractères, sans partage des revenus**
- Aimer, commenter, partager, signaler/bloquer du contenu

#### Echo Creator (Créateur certifié)
- Obtenir le statut Echo Creator via des frais de certification uniques
- Publier du contenu de longueur illimitée et participer au partage des revenus
- Accéder au suivi de l'avancement de la vérification et à la gestion des publications
- Participer au **Programme de Parrainage Affilié**

---

### Règles de partage des revenus

#### Pourboire ordinaire (sans lien de parrainage)

| Bénéficiaire | Part |
|--------------|------|
| Auteur | 70% |
| Plateforme | 30% |

#### Via lien de parrainage

| Bénéficiaire | Part |
|--------------|------|
| Auteur | 65% |
| Fan parrainant | 25% |
| Plateforme | 10% |

---

### Stack technique

| Technologie | Usage |
|-------------|-------|
| **React 18** + **TypeScript** | Framework principal |
| **Vite** | Outil de build |
| **Tailwind CSS** | Interface sombre style Twitter/X |
| **MeshJS** | Intégration portefeuille Cardano |
| **OpShin** | Contrats Plutus (Python-like) |
| **CIP-68** | Standard de métadonnées NFT |
| **Blockfrost API** | Requêtes de données on-chain |
| **Pinata/IPFS** | Stockage permanent du contenu |

### Démarrage rapide

```bash
# 1. Installer les dépendances
cd frontend && npm install

# 2. Configurer les variables d'environnement
# VITE_BLOCKFROST_API_KEY=votre_clé
# VITE_PINATA_JWT=votre_jwt

# 3. Démarrer le serveur de développement
npm run dev   # → http://localhost:5173

# 4. (Optionnel) Compiler les contrats
pip install opshin
cd contracts && opshin build spending echoforge.py
```

---

## Español

EchoForge DAO es una plataforma de contenido descentralizada construida sobre la blockchain de Cardano. Cualquiera puede publicar contenido libremente; después de pasar la doble revisión IA+DAO, el contenido recibe un certificado on-chain (CIP-68 NFT) y los ingresos se reparten automáticamente mediante contrato inteligente.

> **Reconstructor de Contenido On-Chain de Cardano** — Publicar Libremente · Revisión IA+DAO · Prueba On-Chain · Reparto de Ingresos

---

### Flujo de la plataforma

```
Publicación libre (cualquiera puede publicar)
  ↓
Revisión IA + DAO (control de calidad del contenido)
  ↓
Prueba on-chain (aprobado → acuñar NFT CIP-68, registro permanente on-chain)
  ↓
Reparto de ingresos (el contrato inteligente ejecuta automáticamente la distribución)
```

---

### Roles de usuario

#### Usuario general
- Navegar por el contenido sin billetera
- Crear una cuenta después de conectar la billetera
- Publicar artículos **de hasta 400 caracteres, sin reparto de ingresos**
- Dar me gusta, comentar, compartir, denunciar/bloquear contenido

#### Echo Creator (Creador certificado)
- Obtener el estatus de Echo Creator mediante una tarifa de certificación única
- Publicar contenido de longitud ilimitada y participar en el reparto de ingresos
- Acceder al seguimiento del progreso de revisión y la gestión de publicaciones
- Participar en el **Programa de Referidos Afiliados**

---

### Reglas de reparto de ingresos

#### Propina ordinaria (sin enlace de referido)

| Beneficiario | Porcentaje |
|--------------|-----------|
| Autor | 70% |
| Plataforma | 30% |

#### A través de enlace de referido

| Beneficiario | Porcentaje |
|--------------|-----------|
| Autor | 65% |
| Fan que refiere | 25% |
| Plataforma | 10% |

---

### Stack tecnológico

| Tecnología | Uso |
|------------|-----|
| **React 18** + **TypeScript** | Framework principal |
| **Vite** | Herramienta de build |
| **Tailwind CSS** | Interfaz oscura estilo Twitter/X |
| **MeshJS** | Integración de billetera Cardano |
| **OpShin** | Contratos Plutus (similar a Python) |
| **CIP-68** | Estándar de metadatos NFT |
| **Blockfrost API** | Consultas de datos on-chain |
| **Pinata/IPFS** | Almacenamiento permanente de contenido |

### Inicio rápido

```bash
# 1. Instalar dependencias
cd frontend && npm install

# 2. Configurar variables de entorno
# VITE_BLOCKFROST_API_KEY=tu_clave
# VITE_PINATA_JWT=tu_jwt

# 3. Iniciar servidor de desarrollo
npm run dev   # → http://localhost:5173

# 4. (Opcional) Compilar contratos
pip install opshin
cd contracts && opshin build spending echoforge.py
```

---

## 日本語

EchoForge DAO は、Cardano ブロックチェーン上に構築された分散型コンテンツプラットフォームです。誰でも自由にコンテンツを公開でき、AI+DAO のデュアル審査を通過した後、オンチェーン証明（CIP-68 NFT）を受け取り、スマートコントラクトにより収益が自動的に分配されます。

> **Cardano オンチェーン コンテンツ プラットフォーム** — 自由投稿 · AI+DAO 審査 · オンチェーン証明 · 収益分配

---

### プラットフォームの流れ

```
自由投稿（誰でも投稿可能）
  ↓
AI + DAO 審査（コンテンツ品質チェック）
  ↓
オンチェーン証明（承認 → CIP-68 NFT 発行、永続的なオンチェーン記録）
  ↓
収益分配（スマートコントラクトが自動的に収益を分配）
```

---

### ユーザーロール

#### 一般ユーザー
- ウォレットなしでコンテンツを閲覧可能
- ウォレット接続後にアカウントを作成可能
- **400文字以内の記事を投稿可能（収益分配なし）**
- いいね、コメント、シェア、報告・ブロックが可能

#### Echo Creator（認定クリエイター）
- 一回限りの認定料を支払い、Echo Creator ステータスを取得
- 文字数無制限のコンテンツを公開し、収益分配に参加
- 審査進捗追跡および投稿管理（収益取引の詳細）へのアクセス
- **アフィリエイト紹介プログラム**への参加が可能

---

### Echo Creator 認定

#### 認定料（一回限り、月額費用なし）

| 枠 | 認定料 | 備考 |
|----|--------|------|
| 先着10名 | 10 USDCx（または同等の ADA） | アーリーバード価格 |
| 11名目以降 | 20 USDCx（または同等の ADA） | 標準価格 |

- プラットフォームは認定料の **10%** を手数料として徴収
- 残りの **90%** は透明性のある DAO トレジャリーへ（マーケティング・エアドロップ・開発・コミュニティ構築に使用）
- クリエイターはいつでも認定をキャンセル可能（強制サブスクリプションなし）

---

### 収益分配ルール

#### 通常のチップ（紹介リンクなし）

| 受取人 | 割合 |
|--------|------|
| 著者 | 70% |
| プラットフォーム | 30% |

#### 紹介リンク経由の支払い

| 受取人 | 割合 |
|--------|------|
| 著者 | 65% |
| 紹介ファン | 25% |
| プラットフォーム | 10% |

---

### アフィリエイト紹介プログラム

ファンがプロモーションパッケージを購入すると、コントラクトが自動的に一意のトラッキングリンクを生成します：
```
echoforge.app/p/12345?fan=<ウォレットアドレス>
```
その後の全ての支払いアクションは、軽量インデクサーによりオンチェーンで追跡されます。

#### 有効な支払いアクションと重み

| アクション | 最低金額 | 重み |
|-----------|---------|------|
| 新規読者が著者のコンテンツにチップ | ≥ 2 ADA | ×1.0（最高） |
| 新規読者が著者のプロモーションパッケージを購入 | ≥ 5 ADA | ×0.8（高） |
| 新規読者がコンテンツ NFT を発行/購入 | ≥ 10 ADA | ×0.6（中） |
| 無料クリック/フォロー | — | 5% 少額報酬 |

---

### アーキテクチャ

```
EchoForgeDAO/
├── frontend/           # React + Vite + Tailwind + MeshJS
│   └── src/
│       ├── App.tsx
│       ├── components/
│       ├── hooks/
│       ├── services/
│       └── types/
├── contracts/          # OpShin (Plutus) スマートコントラクト
│   ├── echoforge.py
│   ├── co_creation.py
│   ├── settlement_engine.py
│   ├── content_moderation_engine.py
│   └── README.md
└── README.md
```

### 技術スタック

| 技術 | 用途 |
|------|------|
| **React 18** + **TypeScript** | コアフレームワーク |
| **Vite** | ビルドツール |
| **Tailwind CSS** | Twitter/X スタイルのダーク UI |
| **MeshJS** | Cardano ウォレット統合 |
| **OpShin** | Plutus コントラクト（Python ライク） |
| **CIP-68** | NFT メタデータ標準（オンチェーン証明） |
| **Blockfrost API** | オンチェーンデータクエリ |
| **Pinata/IPFS** | コンテンツの永続ストレージ |

### クイックスタート

```bash
# 1. 依存関係をインストール
cd frontend && npm install

# 2. 環境変数を設定
# VITE_BLOCKFROST_API_KEY=your_blockfrost_api_key
# VITE_PINATA_JWT=your_pinata_jwt_token

# 3. 開発サーバーを起動
npm run dev   # → http://localhost:5173

# 4. （オプション）コントラクトをコンパイル
pip install opshin
cd contracts && opshin build spending echoforge.py
```

### MVP 機能
- ✅ ブラウザで直接動作（サーバー不要）
- ✅ ウォレット接続（シミュレーションモード対応）
- ✅ ソーシャルメディア風 Feed レイアウト
- ✅ 一般ユーザー向け 400 文字無料投稿
- ✅ Echo Creator 認定（USDCx/ADA 支払い）
- ✅ AI+DAO デュアル審査フロー
- ✅ IPFS コンテンツアップロード + CIP-68 オンチェーン証明
- ✅ スマートコントラクト自動収益分配（紹介 65/25/10、通常チップ 70/0/30）
- ✅ Hydra L2 高並行 DAO 投票

### 次のステップ
- [ ] Preview テストネットへのコントラクトデプロイ
- [ ] 実際の Blockfrost API への接続
- [ ] 実際の Hydra ノードへの接続
- [ ] ADA/USDCx リアルタイムレートのためのオンチェーン DEX Oracle 統合

---
