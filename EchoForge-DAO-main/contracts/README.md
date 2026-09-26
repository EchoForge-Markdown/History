# EchoForge DAO — Smart Contracts / 智能合约 / Contrats intelligents / Contratos inteligentes / スマートコントラクト

## Overview / 概述 / Aperçu / Descripción general / 概要

Cardano smart contracts written with **OpShin** (Python-like Plutus).  
使用 **OpShin**（类 Python Plutus）编写的 Cardano 智能合约。  
Contrats intelligents Cardano rédigés avec **OpShin** (Plutus façon Python).  
Contratos inteligentes de Cardano escritos con **OpShin** (Plutus estilo Python).  
**OpShin**（Python ライク Plutus）で書かれた Cardano スマートコントラクト。

| Contract file / 合约文件          | Purpose / 用途 |
|------------------------------------|----------------|
| `echoforge.py`                     | Core publish → review → certify → split-revenue flow |
| `co_creation.py`                   | Co-creation / 共同创建 — promotion-package gated proposals & weighted voting |
| `settlement_engine.py`             | Settlement Engine / 结算引擎 — Sybil defence, anti-arbitrage cap, DAO governance hooks |
| `content_moderation_engine.py`     | Content Moderation Engine / 内容审核引擎 — AI/Jury/DAO governance modes, hard-reject spam filter |

---

## Contract File / 合约文件：`echoforge.py`

### 平台流程
```
发布 (Publish) → 审核 (Review) → CIP-68 链证 (Certify) → 分成 (SplitRevenue)
```
并行：**Hydra L2 DAO 治理投票**

---

## Datum (链上存储)

| Datum | 说明 |
|-------|------|
| `PublicationDatum` | 内容发布 UTxO：作者、IPFS CID、审核状态、认证状态、分成收入 |
| `FanDatum` | 粉丝记录：地址、推荐人、作品 ID、贡献值 |
| `CIP68MetadataDatum` | CIP-68 Reference Token 的 inline datum，存储 CBOR 元数据 Map |

---

## Redeemer (交易动作) — Spending Validator

| 动作 | 说明 | 权限 |
|------|------|------|
| `Publish` | 发布内容到 IPFS | 作者签名 |
| `Review` | AI/人工审核 | 授权审核员签名 |
| `Certify` | 铸造 **CIP-68 NFT** 链上证明 | 作者签名，审核通过后 |
| `SplitRevenue` | 按 70/20/10 分成 | 已链上认证后 |
| `Cancel` | 取消发布 | 仅作者，未认证时 |

---

## CIP-68 NFT 铸造标准

[CIP-68](https://cips.cardano.org/cip/CIP-0068) 是 Cardano 的链上 NFT 元数据标准：

### Token 对
| Token | 前缀 (4字节大端序) | 目标 |
|-------|-------------------|------|
| `(100){name}` Reference Token | `0x00000064` | 脚本地址（含元数据 Datum） |
| `(222){name}` User NFT Token  | `0x000000de` | 用户/作者钱包 |

### CIP68MetadataDatum 结构
```python
Constr 0 [
  Map {
    "name"        → "文章标题",
    "image"       → "ipfs://QmXxx...",
    "description" → "内容摘要",
    "author"      → "作者名称",
    "ipfsCid"     → "QmXxx...",
    "category"    → "AI & Tech",
    "approvedAt"  → Unix 时间戳
  },
  Int 1              # version
]
```

### 铸造策略 (`minting_validator`)
验证规则：
1. 必须同时铸造 `(100)` 和 `(222)` 各 1 个
2. `(100)` Reference Token 必须发送到指定脚本地址并携带 `CIP68MetadataDatum`
3. 销毁时两个 token 均须同时销毁（数量 `-1`）

### Spending 验证器中的 CIP-68 检查
`Certify` Redeemer 新增字段：
- `asset_name: bytes` — 基础名称（不含前缀）
- `ref_script_address: bytes` — Reference Token 目标脚本地址 hash
额外检查：`(100)` 去往脚本地址且含 inline datum；`(222)` 铸造数量为 1。

---

## Hydra L2 投票

[Hydra](https://hydra.family) 是 Cardano 同构状态通道（Layer 2），适合高并发 DAO 投票：

### 生命周期
```
Idle → Initializing → Open → Closed → FanoutPossible → Final
```

### 投票流程
1. 参与方在 L1 提交 Commit UTxO，开启 Hydra Head
2. Head 进入 `Open` 状态，投票交易通过 WebSocket API 高速提交（毫秒级）
3. 每个快照（Snapshot）由所有参与方签名，保证安全性
4. 投票结束后关闭 Head，最终状态通过 Fanout 写回 Cardano L1

### Hydra 节点 API
```
WebSocket: ws://<hydra-node>:4001   # 状态推送 + 命令提交
HTTP:      http://<hydra-node>:4001/snapshot/utxo  # UTxO 查询
```

---

## 安全特性

- ✅ 防止重入攻击（UTxO 模型天然防重入）
- ✅ ADA 溢出检查（分账总额 ≤ 收入）
- ✅ 签名验证（铸造/分成需对应签名）
- ✅ 固定分成比例 70/20/10（合约层面锁定）
- ✅ CIP-68 完整性（Reference Token 必须到达脚本地址并附带合规 Datum）
- ✅ 防重复认证（`certified` 标志位检查）

---

## 编译与部署

### 前置要求
```bash
pip install opshin
```

### 编译合约
```bash
# Spending 验证器
opshin build spending echoforge.py

# CIP-68 铸造策略
opshin build minting echoforge.py
```

### 部署到 Preview 测试网

```bash
# 1. 生成脚本地址
cardano-cli address build \
  --payment-script-file echoforge.plutus \
  --testnet-magic 2 \
  --out-file script.addr

# 2. 锁定 ADA 到脚本（发布内容）
cardano-cli transaction build \
  --tx-in <UTXO> \
  --tx-out $(cat script.addr)+2000000 \
  --tx-out-datum-embed-file publication_datum.json \
  --change-address <AUTHOR_ADDR> \
  --testnet-magic 2 \
  --out-file tx.raw

# 3. 签名并提交
cardano-cli transaction sign \
  --tx-body-file tx.raw \
  --signing-key-file payment.skey \
  --out-file tx.signed
cardano-cli transaction submit --tx-file tx.signed --testnet-magic 2
```

### 铸造 CIP-68 NFT（认证内容）
```bash
# 1. 生成铸造策略地址
opshin build minting echoforge.py
cardano-cli transaction policyid \
  --script-file echoforge_minting.plutus > policy.id

# 2. 读取 Policy ID
POLICY_ID=$(cat policy.id)

# 3. 构建 CIP-68 元数据 Datum
cat > cip68_datum.json << 'EOF'
{
  "constructor": 0,
  "fields": [
    {
      "map": [
        { "k": { "bytes": "6e616d65" }, "v": { "bytes": "...(UTF-8 hex of title)" } },
        { "k": { "bytes": "696d616765" }, "v": { "bytes": "...(ipfs:// CID hex)" } }
      ]
    },
    { "int": 1 }
  ]
}
EOF

# 3. 铸造 (100) + (222) token 对
ASSET_NAME_HEX=$(echo -n "EchoForge_pub_001" | xxd -p)
REF_TOKEN="${POLICY_ID}.00000064${ASSET_NAME_HEX}"
NFT_TOKEN="${POLICY_ID}.000000de${ASSET_NAME_HEX}"

cardano-cli transaction build \
  --tx-in <SCRIPT_UTXO> \
  --mint "1 ${REF_TOKEN} + 1 ${NFT_TOKEN}" \
  --mint-script-file echoforge_minting.plutus \
  --mint-redeemer-file certify_redeemer.json \
  --tx-out $(cat script.addr)+2000000+"1 ${REF_TOKEN}" \
  --tx-out-inline-datum-file cip68_datum.json \
  --tx-out <AUTHOR_ADDR>+2000000+"1 ${NFT_TOKEN}" \
  --change-address <AUTHOR_ADDR> \
  --testnet-magic 2 \
  --out-file tx_mint.raw
```

---

## `echoforge.py` — 日本語 / Japanese

### プラットフォームフロー

```
公開 (Publish) → 審査 (Review) → CIP-68 オンチェーン証明 (Certify) → 収益分配 (SplitRevenue)
```
並行: **Hydra L2 DAO ガバナンス投票**

---

### Datum（オンチェーンストレージ）

| Datum | 説明 |
|-------|------|
| `PublicationDatum` | コンテンツ公開 UTxO：著者、IPFS CID、審査ステータス、認証ステータス、収益分配 |
| `FanDatum` | ファン記録：アドレス、紹介者、コンテンツID、貢献値 |
| `CIP68MetadataDatum` | CIP-68 Reference Token のインラインデータム、CBOR メタデータ Map を格納 |

---

### Redeemer（トランザクションアクション）— Spending Validator

| アクション | 説明 | 権限 |
|-----------|------|------|
| `Publish` | IPFS へコンテンツを公開 | 著者の署名 |
| `Review` | AI/人工審査 | 認定審査員の署名 |
| `Certify` | **CIP-68 NFT** オンチェーン証明を発行 | 著者の署名、審査通過後 |
| `SplitRevenue` | 紹介あり 65/25/10、通常チップ 70/0/30 で分配 | オンチェーン認証後 |
| `Cancel` | 公開をキャンセル | 著者のみ、未認証時 |

---

### CIP-68 NFT 発行標準

[CIP-68](https://cips.cardano.org/cip/CIP-0068) は Cardano のオンチェーン NFT メタデータ標準です：

#### トークンペア
| Token | プレフィックス（4 バイト ビッグエンディアン） | 送先 |
|-------|----------------------------------------------|------|
| `(100){name}` Reference Token | `0x00000064` | スクリプトアドレス（メタデータ Datum 含む） |
| `(222){name}` User NFT Token  | `0x000000de` | ユーザー/著者ウォレット |

---

### 収益分配（デュアルモード）

| モード | 著者 | 紹介ファン | プラットフォーム |
|--------|------|-----------|----------------|
| 紹介経由（fan_amount > 0） | 65% | 25% | 10% |
| 通常チップ（fan_amount == 0） | 70% | 0% | 30% |

---

### セキュリティ機能

- ✅ リエントランシー攻撃防止（UTxO モデルにより自然に防止）
- ✅ ADA オーバーフローチェック（分配合計 ≤ 収益）
- ✅ 署名検証（発行/分配には対応する署名が必要）
- ✅ デュアルモード分配比率（コントラクトレベルでロック）
- ✅ CIP-68 完整性（Reference Token は必ずスクリプトアドレスへ送信）
- ✅ 重複認証防止（`certified` フラグチェック）

---

### コンパイルとデプロイ

```bash
pip install opshin

# Spending バリデーター
opshin build spending echoforge.py

# CIP-68 ミンティングポリシー
opshin build minting echoforge.py
```

---

## Co-Creation Contract / 共创合约 / Contrat de co-création / Contrato de co-creación: `co_creation.py`

---

### English

The **Co-Creation** module (`co_creation.py`) implements on-chain governance for collaborative
content creation within EchoForge DAO.  It lives under the **Publication Management**
(发布管理) section of the platform.

#### Key Concepts

| Concept | Description |
|---------|-------------|
| **Promotion Package** | A UTxO locked at the script address carrying `PromotionPackageDatum`.  Minimum value: **5 ADA**.  Acts as the on-chain voting credential. |
| **Co-Creation Session** | Tracked by `CoCreationStateDatum`.  Bound to a specific `content_id`. |
| **Proposal** | Stored in `ProposalDatum`.  Accumulates weighted yes/no votes. |
| **Contribution Score** | Computed by `calculate_contribution_score(package_amount, verified_votes)`. |

#### Datum Types

| Datum | `CONSTR_ID` | Description |
|-------|------------|-------------|
| `CoCreationStateDatum` | 0 | Session state: content_id, status, counters, platform fees collected |
| `PromotionPackageDatum` | 1 | Voting credential: holder PKH, bound content_id, amount, has_voted flag |
| `ProposalDatum` | 2 | Proposal state: yes/no votes, total weight, status, platform_fee_due |

#### Redeemers

| Redeemer | `CONSTR_ID` | Authorization | Description |
|----------|------------|---------------|-------------|
| `PurchasePackage` | 0 | Holder signs | Lock ≥ 5 ADA; bind to a content_id |
| `SubmitProposal` | 1 | Valid package holder | Submit a co-creation proposal |
| `VoteOnProposal` | 2 | Valid package holder | Cast a weighted vote; package content_id must match |
| `FinalizeProposal` | 3 | Anyone (platform validates) | Close voting; enforce 10 % platform fee |
| `ReclaimPackage` | 4 | Original holder | Reclaim ADA from unused package |

#### `calculate_contribution_score`

```python
base_score  = (package_amount // 5_000_000) * 100   # paid interaction weight
bonus_score = verified_vote_count * 50               # bonus for verified co-creation votes
total_score = base_score + bonus_score
```

#### Anti-Double-Vote Constraint

* `VoteOnProposal` requires `datum.has_voted == 0`.
* `datum.content_id` must equal `redeemer.content_id` — a package bound to content A **cannot** vote on content B's proposals.
* After voting, the package is re-locked with `has_voted = 1`; it cannot be reused.

#### 10 % Platform Fee

`FinalizeProposal` validates that `platform_amount == total_payout * 10 / 100` (±1 lovelace rounding tolerance) and that the platform treasury address receives at least that amount.

#### Build

```bash
pip install opshin
opshin build spending co_creation.py
```

---

### 中文 / Chinese

**共同创建**模块（`co_creation.py`）为 EchoForge DAO 协作内容创作提供链上治理，属于平台**发布管理**板块。

#### 核心概念

| 概念 | 说明 |
|------|------|
| **推广包** | 锁定在脚本地址、携带 `PromotionPackageDatum` 的 UTxO，最低 **5 ADA**，作为链上投票凭证。 |
| **共创会话** | 由 `CoCreationStateDatum` 跟踪，绑定特定 `content_id`。 |
| **提案** | 存储于 `ProposalDatum`，累计加权赞成/反对票数。 |
| **贡献得分** | 由 `calculate_contribution_score(package_amount, verified_votes)` 计算。 |

#### Datum 类型

| Datum | `CONSTR_ID` | 说明 |
|-------|-------------|------|
| `CoCreationStateDatum` | 0 | 会话状态：content_id、状态、计数器、已收平台手续费 |
| `PromotionPackageDatum` | 1 | 投票凭证：持有人 PKH、绑定 content_id、金额、has_voted 标志 |
| `ProposalDatum` | 2 | 提案状态：赞成/反对票、总权重、状态、platform_fee_due |

#### Redeemer 操作

| Redeemer | `CONSTR_ID` | 授权 | 说明 |
|----------|-------------|------|------|
| `PurchasePackage` | 0 | 持有人签名 | 锁定 ≥ 5 ADA；绑定 content_id |
| `SubmitProposal` | 1 | 有效包持有人 | 提交共创提案 |
| `VoteOnProposal` | 2 | 有效包持有人 | 投加权票；包的 content_id 必须匹配 |
| `FinalizeProposal` | 3 | 任何人（平台验证） | 关闭投票；强制 10% 平台手续费 |
| `ReclaimPackage` | 4 | 原始持有人 | 从未使用包中取回 ADA |

#### `calculate_contribution_score` — 贡献得分计算

```python
base_score  = (package_amount // 5_000_000) * 100   # 付费互动权重（EchoForge 当前逻辑）
bonus_score = verified_vote_count * 50               # 已验证共创投票奖励分
total_score = base_score + bonus_score
```

#### 防重复投票约束

* `VoteOnProposal` 要求 `datum.has_voted == 0`。
* `datum.content_id` 必须等于 `redeemer.content_id`——绑定内容 A 的包**不能**对内容 B 的提案投票。
* 投票后包以 `has_voted = 1` 重新锁定，不可再使用。

#### 10% 平台手续费

`FinalizeProposal` 验证 `platform_amount == total_payout × 10%`（允许 ±1 lovelace 舍入误差），并确认平台国库地址至少收到该金额。

#### 编译

```bash
pip install opshin
opshin build spending co_creation.py
```

---

### Français / French

Le module de **co-création** (`co_creation.py`) implémente la gouvernance on-chain pour
la création collaborative de contenu au sein d'EchoForge DAO.  Il se trouve dans la section
**Gestion des publications** (发布管理) de la plateforme.

#### Concepts clés

| Concept | Description |
|---------|-------------|
| **Pack de promotion** | UTxO verrouillé à l'adresse script portant `PromotionPackageDatum`.  Valeur minimale : **5 ADA**.  Sert de justificatif de vote on-chain. |
| **Session de co-création** | Suivie par `CoCreationStateDatum`, liée à un `content_id` spécifique. |
| **Proposition** | Stockée dans `ProposalDatum`, cumule les votes pondérés pour/contre. |
| **Score de contribution** | Calculé par `calculate_contribution_score(package_amount, verified_votes)`. |

#### Types de Datum

| Datum | `CONSTR_ID` | Description |
|-------|-------------|-------------|
| `CoCreationStateDatum` | 0 | État de session : content_id, statut, compteurs, commissions cumulées |
| `PromotionPackageDatum` | 1 | Justificatif de vote : PKH du détenteur, content_id lié, montant, indicateur has_voted |
| `ProposalDatum` | 2 | État de la proposition : votes pour/contre, poids total, statut, platform_fee_due |

#### Redeemers

| Redeemer | `CONSTR_ID` | Autorisation | Description |
|----------|-------------|--------------|-------------|
| `PurchasePackage` | 0 | Signature du détenteur | Verrouiller ≥ 5 ADA ; lier à un content_id |
| `SubmitProposal` | 1 | Détenteur de pack valide | Soumettre une proposition de co-création |
| `VoteOnProposal` | 2 | Détenteur de pack valide | Voter de façon pondérée ; le content_id du pack doit correspondre |
| `FinalizeProposal` | 3 | Tout le monde (validation plateforme) | Clore le vote ; imposer 10 % de commission |
| `ReclaimPackage` | 4 | Détenteur original | Récupérer les ADA d'un pack inutilisé |

#### `calculate_contribution_score` — Calcul du score de contribution

```python
base_score  = (package_amount // 5_000_000) * 100   # pondération des interactions payantes
bonus_score = verified_vote_count * 50               # bonus pour votes de co-création vérifiés
total_score = base_score + bonus_score
```

#### Contrainte anti-double vote

* `VoteOnProposal` exige `datum.has_voted == 0`.
* `datum.content_id` doit être égal à `redeemer.content_id` — un pack lié au contenu A **ne peut pas** voter sur les propositions du contenu B.
* Après le vote, le pack est re-verrouillé avec `has_voted = 1` ; il ne peut plus être réutilisé.

#### Commission de plateforme de 10 %

`FinalizeProposal` vérifie que `platform_amount == total_payout × 10 %` (tolérance d'arrondi de ±1 lovelace) et que l'adresse de trésorerie de la plateforme reçoit au moins ce montant.

#### Compilation

```bash
pip install opshin
opshin build spending co_creation.py
```

---

### Español / Spanish

El módulo de **co-creación** (`co_creation.py`) implementa la gobernanza on-chain para la
creación colaborativa de contenido dentro de EchoForge DAO.  Se encuentra en la sección
**Gestión de publicaciones** (发布管理) de la plataforma.

#### Conceptos clave

| Concepto | Descripción |
|----------|-------------|
| **Paquete de Promoción** | UTxO bloqueado en la dirección del script con `PromotionPackageDatum`.  Valor mínimo: **5 ADA**.  Funciona como credencial de voto on-chain. |
| **Sesión de co-creación** | Rastreada por `CoCreationStateDatum`, vinculada a un `content_id` específico. |
| **Propuesta** | Almacenada en `ProposalDatum`, acumula votos ponderados a favor/en contra. |
| **Puntuación de contribución** | Calculada por `calculate_contribution_score(package_amount, verified_votes)`. |

#### Tipos de Datum

| Datum | `CONSTR_ID` | Descripción |
|-------|-------------|-------------|
| `CoCreationStateDatum` | 0 | Estado de sesión: content_id, estado, contadores, comisiones acumuladas |
| `PromotionPackageDatum` | 1 | Credencial de voto: PKH del titular, content_id vinculado, monto, indicador has_voted |
| `ProposalDatum` | 2 | Estado de propuesta: votos a favor/en contra, peso total, estado, platform_fee_due |

#### Redeemers

| Redeemer | `CONSTR_ID` | Autorización | Descripción |
|----------|-------------|--------------|-------------|
| `PurchasePackage` | 0 | Firma del titular | Bloquear ≥ 5 ADA; vincular a un content_id |
| `SubmitProposal` | 1 | Titular de paquete válido | Enviar una propuesta de co-creación |
| `VoteOnProposal` | 2 | Titular de paquete válido | Emitir voto ponderado; el content_id del paquete debe coincidir |
| `FinalizeProposal` | 3 | Cualquiera (validación de plataforma) | Cerrar votación; aplicar 10 % de comisión |
| `ReclaimPackage` | 4 | Titular original | Recuperar ADA de paquete no utilizado |

#### `calculate_contribution_score` — Cálculo de la puntuación de contribución

```python
base_score  = (package_amount // 5_000_000) * 100   # peso de interacción pagada
bonus_score = verified_vote_count * 50               # bonus por votos de co-creación verificados
total_score = base_score + bonus_score
```

#### Restricción anti-doble voto

* `VoteOnProposal` requiere `datum.has_voted == 0`.
* `datum.content_id` debe ser igual a `redeemer.content_id` — un paquete vinculado al contenido A **no puede** votar en propuestas del contenido B.
* Después de votar, el paquete se vuelve a bloquear con `has_voted = 1`; no puede reutilizarse.

#### Comisión del 10 % de la plataforma

`FinalizeProposal` valida que `platform_amount == total_payout × 10 %` (tolerancia de redondeo de ±1 lovelace) y que la dirección del tesoro de la plataforma recibe al menos ese monto.

#### Compilación

```bash
pip install opshin
opshin build spending co_creation.py
```

---

### 日本語 / Japanese

**共同制作**モジュール（`co_creation.py`）は、EchoForge DAO における協調コンテンツ制作のためのオンチェーンガバナンスを実装します。プラットフォームの**公開管理**（发布管理）セクションに属します。

#### 主要概念

| 概念 | 説明 |
|------|------|
| **プロモーションパッケージ** | `PromotionPackageDatum` を持つスクリプトアドレスにロックされた UTxO。最低 **5 ADA**。オンチェーン投票資格として機能。 |
| **共同制作セッション** | `CoCreationStateDatum` で追跡され、特定の `content_id` に紐付けられる。 |
| **提案** | `ProposalDatum` に格納。加重賛成/反対票を累積。 |
| **貢献スコア** | `calculate_contribution_score(package_amount, verified_votes)` で計算。 |

#### Datum タイプ

| Datum | `CONSTR_ID` | 説明 |
|-------|------------|------|
| `CoCreationStateDatum` | 0 | セッション状態：content_id、ステータス、カウンター、累積プラットフォーム手数料 |
| `PromotionPackageDatum` | 1 | 投票資格：保有者 PKH、紐付き content_id、金額、has_voted フラグ |
| `ProposalDatum` | 2 | 提案状態：賛成/反対票、総重み、ステータス、platform_fee_due |

#### Redeemer

| Redeemer | `CONSTR_ID` | 承認 | 説明 |
|----------|------------|------|------|
| `PurchasePackage` | 0 | 保有者の署名 | ≥ 5 ADA をロック；content_id に紐付け |
| `SubmitProposal` | 1 | 有効なパッケージ保有者 | 共同制作提案を送信 |
| `VoteOnProposal` | 2 | 有効なパッケージ保有者 | 加重投票；パッケージの content_id が一致する必要あり |
| `FinalizeProposal` | 3 | 誰でも（プラットフォームが検証） | 投票終了；10% プラットフォーム手数料を強制 |
| `ReclaimPackage` | 4 | 元の保有者 | 未使用パッケージから ADA を回収 |

#### `calculate_contribution_score` — 貢献スコアの計算

```python
base_score  = (package_amount // 5_000_000) * 100   # 有料インタラクション重み
bonus_score = verified_vote_count * 50               # 検証済み共同制作投票のボーナス
total_score = base_score + bonus_score
```

#### 二重投票防止制約

* `VoteOnProposal` は `datum.has_voted == 0` を要求。
* `datum.content_id` は `redeemer.content_id` と等しくなければならない — コンテンツ A に紐付いたパッケージは、コンテンツ B の提案に投票**できない**。
* 投票後、パッケージは `has_voted = 1` で再ロックされ、再利用不可。

#### 10% プラットフォーム手数料

`FinalizeProposal` は `platform_amount == total_payout × 10%`（±1 lovelace の丸め許容誤差）を検証し、プラットフォームトレジャリーアドレスが少なくともその金額を受け取ることを確認します。

#### コンパイル

```bash
pip install opshin
opshin build spending co_creation.py
```

---

## Settlement Engine / 结算引擎: `settlement_engine.py`

---

### English

The **Settlement Engine** (`settlement_engine.py`) provides three critical pillars for
EchoForge DAO's economic layer:

#### 1. Staking-based Sybil Defence (MVP-ready)

| Constant | Default | Description |
|----------|---------|-------------|
| `ADA_STAKE_THRESHOLD` | 50 ADA | Minimum lovelace stake required to qualify as EchoCreator or initiate promotions |

A `StakingVaultDatum` UTxO (one per staker) is presented as a **reference input** in
`SubmitContent` and `InitiateReferral` transactions.  The helper `require_active_stake`
checks `is_active == 1` and `staked_amount >= threshold` — no slashing, pure state
validation.

#### 2. Dynamic Anti-Arbitrage Cap (10× multiplier)

```python
# All arithmetic uses integer scaling (PRECISION = 1 000) — no floats
cap          = promotion_package_value * arbitrage_cap_mult   # default: value × 10
final_payout = min(gross_payout, cap)
```

`calculate_payout(gross_payout, promotion_package_value, arbitrage_cap_mult)` enforces
the cap; `arbitrage_cap_mult` defaults to **10** and can be updated by the DAO.

#### 3. Governance Hooks (DAO-ready)

`GovernanceConstants` is an **on-chain Datum** (not a compile-time constant):

| Field | Type | Description |
|-------|------|-------------|
| `ada_stake_threshold` | int | Min lovelace stake (default 50 ADA) |
| `platform_fee_percent` | int | Platform fee out of 100 (default 10) |
| `arbitrage_cap_mult` | int | Payout cap multiplier (default 10) |
| `effect_coefficient` | int | Creator share out of 1 000 (e.g. 850 = 85 %) |
| `dao_governance_active` | int | 0 = locked; 1 = DAO can update |
| `dao_voting_contract` | bytes | Authorised DAO script hash |

`is_dao_authorized(datum, tx_info)` returns `True` only when `dao_governance_active == 1`
and `dao_voting_contract` is in `tx_info.signatories`.

#### Fee Routing (10 % platform fee + effect_coefficient)

```
final_payout  = min(gross_payout, package_value × 10)
platform_fee  = final_payout × platform_fee_percent // 100   # strict 10 %
post_fee      = final_payout − platform_fee
creator_share = post_fee × effect_coefficient // 1 000       # e.g. 85 %
referral_share= post_fee − creator_share                     # e.g. 15 %
```

#### Datum Types

| Datum | `CONSTR_ID` | Description |
|-------|-------------|-------------|
| `GovernanceConstants` | 0 | Mutable DAO parameters (stored as inline datum) |
| `StakingVaultDatum` | 1 | Per-staker ADA vault: PKH, amount, is_active flag |
| `SettlementDatum` | 2 | Content settlement state: creator, package value, content_id, referral, status |

#### Redeemers

| Redeemer | `CONSTR_ID` | Authorization | Description |
|----------|-------------|---------------|-------------|
| `SubmitContent` | 0 | Creator signs + active stake | Sybil-gated content submission |
| `InitiateReferral` | 1 | Creator signs + active stake | Sybil-gated referral initiation |
| `Settle` | 2 | Anyone (platform validates amounts) | Anti-arbitrage-capped payout |
| `UpdateGovernance` | 3 | DAO voting contract | Update `GovernanceConstants` datum |
| `CancelSettlement` | 4 | Creator signs | Cancel pending settlement |

#### Build

```bash
pip install opshin
opshin build spending settlement_engine.py
```

---

### 中文 / Chinese

**结算引擎**（`settlement_engine.py`）为 EchoForge DAO 经济层提供三个核心支柱：

#### 1. 基于质押的 Sybil 防护（MVP 就绪）

`require_active_stake` 函数在 `SubmitContent` 和 `InitiateReferral` 交易中验证：
- 引用输入中存在调用者的 `StakingVaultDatum` UTxO
- `is_active == 1` 且 `staked_amount >= ada_stake_threshold`（默认 50 ADA）
- **无惩罚机制**，仅状态验证

#### 2. 动态防套利上限（10 倍乘数）

```python
# PRECISION = 1 000，所有运算使用整数，无浮点数
cap          = promotion_package_value * arbitrage_cap_mult   # 默认：价值 × 10
final_payout = min(gross_payout, cap)
```

`calculate_payout` 强制执行上限；`arbitrage_cap_mult` 默认为 **10**，可由 DAO 更新。

#### 3. 治理钩子（DAO 就绪）

`GovernanceConstants` 以**链上 Datum** 形式存储（非编译时常量），支持：
- `dao_governance_active=1` 时，仅 `dao_voting_contract` 脚本哈希可更新参数
- `is_dao_authorized(datum, tx_info)` 进行授权检查

#### 费用路由（10% 平台费 + effect_coefficient）

```
final_payout  = min(gross_payout, 包价值 × 10)
platform_fee  = final_payout × platform_fee_percent // 100   # 严格 10%
post_fee      = final_payout − platform_fee
creator_share = post_fee × effect_coefficient // 1000        # 例如 85%
referral_share= post_fee − creator_share                     # 例如 15%
```

#### 编译

```bash
pip install opshin
opshin build spending settlement_engine.py
```

---

### Français / French

Le **Moteur de Règlement** (`settlement_engine.py`) fournit trois piliers critiques pour la
couche économique d'EchoForge DAO :

#### 1. Défense Sybil par le staking (prêt pour MVP)

`require_active_stake` vérifie dans les transactions `SubmitContent` et `InitiateReferral` :
- Présence du UTxO `StakingVaultDatum` de l'appelant comme entrée de référence
- `is_active == 1` et `staked_amount >= ada_stake_threshold` (50 ADA par défaut)
- **Aucun mécanisme de sanction**, validation d'état uniquement

#### 2. Plafond anti-arbitrage dynamique (multiplicateur 10×)

```python
# PRECISION = 1 000, toutes les opérations utilisent des entiers, pas de virgule flottante
cap          = promotion_package_value * arbitrage_cap_mult   # par défaut : valeur × 10
final_payout = min(gross_payout, cap)
```

#### 3. Hooks de gouvernance (prêt pour DAO)

`GovernanceConstants` est stocké comme **Datum on-chain** (pas une constante de compilation).

#### Routage des frais (10 % + effect_coefficient)

```
final_payout  = min(gross_payout, valeur_package × 10)
platform_fee  = final_payout × platform_fee_percent // 100
post_fee      = final_payout − platform_fee
creator_share = post_fee × effect_coefficient // 1 000
referral_share= post_fee − creator_share
```

#### Compilation

```bash
pip install opshin
opshin build spending settlement_engine.py
```

---

### Español / Spanish

El **Motor de Liquidación** (`settlement_engine.py`) proporciona tres pilares críticos para
la capa económica de EchoForge DAO:

#### 1. Defensa Sybil basada en staking (listo para MVP)

`require_active_stake` valida en las transacciones `SubmitContent` e `InitiateReferral`:
- Presencia del UTxO `StakingVaultDatum` del llamante como entrada de referencia
- `is_active == 1` y `staked_amount >= ada_stake_threshold` (50 ADA por defecto)
- **Sin mecanismo de penalización**, solo validación de estado

#### 2. Límite anti-arbitraje dinámico (multiplicador 10×)

```python
# PRECISION = 1 000, operaciones con enteros, sin punto flotante
cap          = promotion_package_value * arbitrage_cap_mult   # por defecto: valor × 10
final_payout = min(gross_payout, cap)
```

#### 3. Hooks de gobernanza (listo para DAO)

`GovernanceConstants` se almacena como **Datum on-chain** (no constante de compilación).

#### Enrutamiento de comisiones (10 % + effect_coefficient)

```
final_payout  = min(gross_payout, valor_paquete × 10)
platform_fee  = final_payout × platform_fee_percent // 100
post_fee      = final_payout − platform_fee
creator_share = post_fee × effect_coefficient // 1 000
referral_share= post_fee − creator_share
```

#### Compilación

```bash
pip install opshin
opshin build spending settlement_engine.py
```

---

### 日本語 / Japanese

**決済エンジン**（`settlement_engine.py`）は、EchoForge DAO の経済レイヤーに3つの重要な柱を提供します：

#### 1. ステーキングベースの Sybil 防御（MVP 対応済み）

`require_active_stake` は `SubmitContent` と `InitiateReferral` トランザクションで検証します：
- 呼び出し元の `StakingVaultDatum` UTxO が参照入力として存在する
- `is_active == 1` かつ `staked_amount >= ada_stake_threshold`（デフォルト 50 ADA）
- **ペナルティ機構なし**、純粋な状態検証のみ

#### 2. 動的アンチアービトラージキャップ（10× 乗数）

```python
# PRECISION = 1 000 — 整数演算のみ（浮動小数点なし）
cap          = promotion_package_value * arbitrage_cap_mult   # デフォルト：価値 × 10
final_payout = min(gross_payout, cap)
```

#### 3. ガバナンスフック（DAO 対応済み）

`GovernanceConstants` はコンパイル時定数ではなく、**オンチェーン Datum** として格納されます。

| フィールド | 型 | 説明 |
|-----------|------|------|
| `ada_stake_threshold` | int | 最小ステーキング lovelace（デフォルト 50 ADA） |
| `platform_fee_percent` | int | 100 分のプラットフォーム手数料（デフォルト 10） |
| `arbitrage_cap_mult` | int | ペイアウトキャップ乗数（デフォルト 10） |
| `effect_coefficient` | int | 1 000 分のクリエイターシェア（例：850 = 85%） |
| `dao_governance_active` | int | 0 = ロック；1 = DAO が更新可能 |
| `dao_voting_contract` | bytes | 承認済み DAO スクリプトハッシュ |

#### 手数料ルーティング（10% プラットフォーム手数料 + effect_coefficient）

```
final_payout  = min(gross_payout, パッケージ価値 × 10)
platform_fee  = final_payout × platform_fee_percent // 100
post_fee      = final_payout − platform_fee
creator_share = post_fee × effect_coefficient // 1 000
referral_share= post_fee − creator_share
```

#### Datum タイプ

| Datum | `CONSTR_ID` | 説明 |
|-------|------------|------|
| `GovernanceConstants` | 0 | 変更可能な DAO パラメーター（インラインデータムとして格納） |
| `StakingVaultDatum` | 1 | ステーカーごとの ADA ボールト |
| `SettlementDatum` | 2 | コンテンツ決済状態 |

#### Redeemer

| Redeemer | `CONSTR_ID` | 承認 | 説明 |
|----------|------------|------|------|
| `SubmitContent` | 0 | クリエイターの署名 + アクティブステーク | Sybil ゲート付きコンテンツ送信 |
| `InitiateReferral` | 1 | クリエイターの署名 + アクティブステーク | Sybil ゲート付き紹介開始 |
| `Settle` | 2 | 誰でも（プラットフォームが金額を検証） | アンチアービトラージキャップ付きペイアウト |
| `UpdateGovernance` | 3 | DAO 投票コントラクト | `GovernanceConstants` Datum を更新 |
| `CancelSettlement` | 4 | クリエイターの署名 | 保留中の決済をキャンセル |

#### コンパイル

```bash
pip install opshin
opshin build spending settlement_engine.py
```

---

## Content Moderation Engine / 内容审核引擎: `content_moderation_engine.py`

---

### English

The **ContentModerationEngine** (`content_moderation_engine.py`) implements modular,
state-driven content moderation for EchoForge DAO, supporting three distinct governance
modes that can be upgraded by the DAO as the project evolves.

#### Governance Modes

| Mode | Constant | Description |
|------|----------|-------------|
| **AI_ONLY** | `MODE_AI_ONLY = 0` | Content pass/fail decided solely by AI score threshold (`AI_PASS_THRESHOLD = 70`). |
| **AI_PLUS_JURY** | `MODE_AI_PLUS_JURY = 1` | AI performs pre-filter at threshold 70.  Borderline content (40–69) is queued for a minimum of 3 high-reputation jurors (`jury_threshold`). |
| **FULLY_DAO** | `MODE_FULLY_DAO = 2` | All content requires a general DAO vote.  The `dao_voting_contract` script hash must co-sign the approval transaction. |

#### Safety Constraint — Hard-Reject List

**AI score < 40 is always blocked regardless of governance mode.**  This is enforced in
every redeemer path to prevent spam overflow.

```python
AI_HARD_REJECT_THRESHOLD: int = 40   # hard-reject below this score
AI_PASS_THRESHOLD:         int = 70   # AI filter pass threshold
MIN_JURY_VOTES:            int = 3    # minimum jurors in AI_PLUS_JURY mode
```

#### Datum Types

| Datum | `CONSTR_ID` | Description |
|-------|-------------|-------------|
| `GovernanceConfig` | 0 | Active governance mode, jury threshold, DAO voting contract hash, upgrade lock |
| `ContentModerationDatum` | 1 | Per-content state: content_id, author, ai_score, jury votes, DAO approval, lifecycle status |

**`GovernanceConfig` fields:**

| Field | Type | Description |
|-------|------|-------------|
| `moderation_mode` | int | 0 = AI_ONLY, 1 = AI_PLUS_JURY, 2 = FULLY_DAO |
| `jury_threshold` | int | Min jury yes-votes for approval (≥ 3) |
| `dao_voting_contract` | bytes | 28-byte script hash of the authorised DAO voting contract |
| `dao_governance_active` | int | 0 = upgrades locked; 1 = DAO may upgrade |

**`ContentModerationDatum` status codes:**

| Constant | Value | Meaning |
|----------|-------|---------|
| `STATUS_PENDING` | 0 | Awaiting AI moderation |
| `STATUS_JURY_QUEUED` | 1 | Borderline; queued for jury vote |
| `STATUS_APPROVED` | 2 | Approved for publication |
| `STATUS_REJECTED` | 3 | Rejected |

#### Redeemers

| Redeemer | `CONSTR_ID` | Authorization | Description |
|----------|-------------|---------------|-------------|
| `SubmitContent` | 0 | Author signs | Submit content; hard-reject gate applied to ai_score |
| `CastJuryVote` | 1 | Juror signs | Cast jury vote (AI_PLUS_JURY mode; content must be STATUS_JURY_QUEUED) |
| `FinalizeModeration` | 2 | Anyone (contract validates) | Resolve final approved/rejected status via `is_content_eligible` |
| `UpgradeGovernance` | 3 | DAO voting contract signs | Switch governance mode; requires `dao_governance_active == 1` |

#### Key Helper Functions

| Function | Description |
|----------|-------------|
| `is_hard_reject(ai_score)` | Returns `True` iff `ai_score < 40` |
| `is_content_eligible(content, gov, tx_info)` | Mode-aware eligibility check; calls `verify_community_consensus` for modes 1 and 2 |
| `verify_community_consensus(content, gov, tx_info)` | Validates jury quorum (mode 1) or DAO co-signature + `dao_approved` flag (mode 2) |
| `upgrade_governance(current_config, new_mode, new_jury_threshold, tx_info)` | Validates DAO-authorised governance transition |
| `get_governance_config(ref_inputs)` | Reads `GovernanceConfig` from reference inputs |

#### Eligibility Decision Tree

```
ai_score < 40            → HARD REJECT (all modes)
MODE_AI_ONLY (0)         → approve iff ai_score >= 70
MODE_AI_PLUS_JURY (1)    → approve iff ai_score >= 70
                            OR jury_yes_votes >= jury_threshold (min 3)
MODE_FULLY_DAO (2)       → approve iff dao_approved == 1
                            AND dao_voting_contract in tx.signatories
```

#### Governance Transition

```
upgrade_governance(new_mode, new_jury_threshold):
  1. dao_governance_active must be 1
  2. dao_voting_contract must co-sign
  3. new_mode in {0, 1, 2}
  4. new_jury_threshold >= 3  (when new_mode == 1)
```

#### Build

```bash
pip install opshin
opshin build spending content_moderation_engine.py
```

---

### 中文 / Chinese

**内容审核引擎**（`content_moderation_engine.py`）为 EchoForge DAO 实现模块化、状态驱动的
内容审核，支持三种不同治理模式，可随项目发展由 DAO 升级。

#### 治理模式

| 模式 | 常量 | 说明 |
|------|------|------|
| **AI_ONLY** | `MODE_AI_ONLY = 0` | 内容通过/拒绝完全由 AI 分数阈值决定（`AI_PASS_THRESHOLD = 70`）。 |
| **AI_PLUS_JURY** | `MODE_AI_PLUS_JURY = 1` | AI 在阈值 70 进行预过滤；边界内容（40–69）排队等待至少 3 名高声誉陪审员投票。 |
| **FULLY_DAO** | `MODE_FULLY_DAO = 2` | 所有内容需要 DAO 全体投票；`dao_voting_contract` 脚本哈希必须联合签署批准交易。 |

#### 安全约束——硬性拒绝列表

**AI 分数 < 40 的内容无论治理模式如何均被阻止**，在每个 Redeemer 路径中强制执行，防止垃圾内容溢出。

```python
AI_HARD_REJECT_THRESHOLD: int = 40   # 低于此分数硬性拒绝
AI_PASS_THRESHOLD:         int = 70   # AI 过滤通过阈值
MIN_JURY_VOTES:            int = 3    # AI_PLUS_JURY 模式下最少陪审员数量
```

#### Datum 类型

| Datum | `CONSTR_ID` | 说明 |
|-------|-------------|------|
| `GovernanceConfig` | 0 | 当前治理模式、陪审团阈值、DAO 投票合约哈希、升级锁定 |
| `ContentModerationDatum` | 1 | 每条内容状态：content_id、作者、ai_score、陪审团票数、DAO 批准、生命周期状态 |

#### Redeemer 操作

| Redeemer | `CONSTR_ID` | 授权 | 说明 |
|----------|-------------|------|------|
| `SubmitContent` | 0 | 作者签名 | 提交内容；对 ai_score 应用硬性拒绝门 |
| `CastJuryVote` | 1 | 陪审员签名 | 陪审团投票（AI_PLUS_JURY 模式；内容须处于 STATUS_JURY_QUEUED） |
| `FinalizeModeration` | 2 | 任何人（合约验证） | 通过 `is_content_eligible` 解决最终批准/拒绝状态 |
| `UpgradeGovernance` | 3 | DAO 投票合约签名 | 切换治理模式；需要 `dao_governance_active == 1` |

#### 资格判断决策树

```
ai_score < 40            → 硬性拒绝（所有模式）
MODE_AI_ONLY (0)         → ai_score >= 70 则批准
MODE_AI_PLUS_JURY (1)    → ai_score >= 70 则批准
                            或 jury_yes_votes >= jury_threshold（最少 3）
MODE_FULLY_DAO (2)       → dao_approved == 1
                            且 dao_voting_contract 在 tx.signatories 中
```

#### 治理转换

```
upgrade_governance(new_mode, new_jury_threshold):
  1. dao_governance_active 必须为 1
  2. dao_voting_contract 必须联合签名
  3. new_mode 必须在 {0, 1, 2} 中
  4. new_jury_threshold >= 3（当 new_mode == 1 时）
```

#### 编译

```bash
pip install opshin
opshin build spending content_moderation_engine.py
```

---

### Français / French

Le **Moteur de Modération de Contenu** (`content_moderation_engine.py`) implémente une
modération de contenu modulaire et pilotée par état pour EchoForge DAO, supportant trois
modes de gouvernance distincts pouvant être mis à niveau par le DAO.

#### Modes de gouvernance

| Mode | Constante | Description |
|------|-----------|-------------|
| **AI_ONLY** | `MODE_AI_ONLY = 0` | Passage/échec du contenu décidé uniquement par le seuil de score IA (`AI_PASS_THRESHOLD = 70`). |
| **AI_PLUS_JURY** | `MODE_AI_PLUS_JURY = 1` | L'IA effectue un pré-filtre à 70. Le contenu borderline (40–69) est mis en file pour un minimum de 3 jurés (`jury_threshold`). |
| **FULLY_DAO** | `MODE_FULLY_DAO = 2` | Tout contenu nécessite un vote DAO général. Le hash du script `dao_voting_contract` doit co-signer la transaction d'approbation. |

#### Contrainte de sécurité — Rejet automatique

**Score IA < 40 est toujours bloqué quel que soit le mode de gouvernance.**

```python
AI_HARD_REJECT_THRESHOLD: int = 40
AI_PASS_THRESHOLD:         int = 70
MIN_JURY_VOTES:            int = 3
```

#### Arbre de décision d'éligibilité

```
ai_score < 40            → REJET AUTOMATIQUE (tous modes)
MODE_AI_ONLY (0)         → approuver si ai_score >= 70
MODE_AI_PLUS_JURY (1)    → approuver si ai_score >= 70
                            OU jury_yes_votes >= jury_threshold (min 3)
MODE_FULLY_DAO (2)       → approuver si dao_approved == 1
                            ET dao_voting_contract dans tx.signatories
```

#### Compilation

```bash
pip install opshin
opshin build spending content_moderation_engine.py
```

---

### Español / Spanish

El **Motor de Moderación de Contenido** (`content_moderation_engine.py`) implementa una
moderación de contenido modular y orientada por estado para EchoForge DAO, soportando tres
modos de gobernanza distintos que pueden ser actualizados por el DAO.

#### Modos de gobernanza

| Modo | Constante | Descripción |
|------|-----------|-------------|
| **AI_ONLY** | `MODE_AI_ONLY = 0` | Aprobación/rechazo del contenido decidido únicamente por el umbral de puntuación de IA (`AI_PASS_THRESHOLD = 70`). |
| **AI_PLUS_JURY** | `MODE_AI_PLUS_JURY = 1` | La IA realiza un pre-filtro a 70. El contenido limítrofe (40–69) se pone en cola para un mínimo de 3 jurados (`jury_threshold`). |
| **FULLY_DAO** | `MODE_FULLY_DAO = 2` | Todo el contenido requiere una votación general del DAO. El hash del script `dao_voting_contract` debe co-firmar la transacción de aprobación. |

#### Restricción de seguridad — Rechazo automático

**La puntuación IA < 40 siempre se bloquea independientemente del modo de gobernanza.**

```python
AI_HARD_REJECT_THRESHOLD: int = 40
AI_PASS_THRESHOLD:         int = 70
MIN_JURY_VOTES:            int = 3
```

#### Árbol de decisión de elegibilidad

```
ai_score < 40            → RECHAZO AUTOMÁTICO (todos los modos)
MODE_AI_ONLY (0)         → aprobar si ai_score >= 70
MODE_AI_PLUS_JURY (1)    → aprobar si ai_score >= 70
                            O jury_yes_votes >= jury_threshold (mín 3)
MODE_FULLY_DAO (2)       → aprobar si dao_approved == 1
                            Y dao_voting_contract en tx.signatories
```

#### Compilación

```bash
pip install opshin
opshin build spending content_moderation_engine.py
```

---

### 日本語 / Japanese

**コンテンツモデレーションエンジン**（`content_moderation_engine.py`）は、EchoForge DAO のためのモジュラーかつ状態駆動のコンテンツモデレーションを実装し、プロジェクトの進化に応じて DAO がアップグレードできる3つの異なるガバナンスモードをサポートします。

#### ガバナンスモード

| モード | 定数 | 説明 |
|--------|------|------|
| **AI_ONLY** | `MODE_AI_ONLY = 0` | コンテンツの合否は AI スコアしきい値のみで決定（`AI_PASS_THRESHOLD = 70`）。 |
| **AI_PLUS_JURY** | `MODE_AI_PLUS_JURY = 1` | AI がしきい値 70 で事前フィルタリング。ボーダーラインコンテンツ（40–69）は最低 3 名の高評価陪審員の投票待ちキューに入る。 |
| **FULLY_DAO** | `MODE_FULLY_DAO = 2` | 全コンテンツが DAO の一般投票を必要とする。`dao_voting_contract` スクリプトハッシュが承認トランザクションに共同署名する必要あり。 |

#### セキュリティ制約 — 強制拒否リスト

**AI スコア < 40 はガバナンスモードに関わらず常にブロックされます。**

```python
AI_HARD_REJECT_THRESHOLD: int = 40   # このスコア未満は強制拒否
AI_PASS_THRESHOLD:         int = 70   # AI フィルター合格しきい値
MIN_JURY_VOTES:            int = 3    # AI_PLUS_JURY モードの最小陪審員数
```

#### Datum タイプ

| Datum | `CONSTR_ID` | 説明 |
|-------|------------|------|
| `GovernanceConfig` | 0 | アクティブなガバナンスモード、陪審しきい値、DAO 投票コントラクトハッシュ、アップグレードロック |
| `ContentModerationDatum` | 1 | コンテンツごとの状態：content_id、著者、ai_score、陪審票数、DAO 承認、ライフサイクルステータス |

#### Redeemer

| Redeemer | `CONSTR_ID` | 承認 | 説明 |
|----------|------------|------|------|
| `SubmitContent` | 0 | 著者の署名 | コンテンツを送信；ai_score に強制拒否ゲートを適用 |
| `CastJuryVote` | 1 | 陪審員の署名 | 陪審投票（AI_PLUS_JURY モード；コンテンツは STATUS_JURY_QUEUED である必要あり） |
| `FinalizeModeration` | 2 | 誰でも（コントラクトが検証） | `is_content_eligible` で最終承認/拒否ステータスを解決 |
| `UpgradeGovernance` | 3 | DAO 投票コントラクトの署名 | ガバナンスモードを切り替え；`dao_governance_active == 1` が必要 |

#### 適格性判断ツリー

```
ai_score < 40            → 強制拒否（全モード）
MODE_AI_ONLY (0)         → ai_score >= 70 なら承認
MODE_AI_PLUS_JURY (1)    → ai_score >= 70 なら承認
                            または jury_yes_votes >= jury_threshold（最低 3）
MODE_FULLY_DAO (2)       → dao_approved == 1
                            かつ dao_voting_contract が tx.signatories に含まれる
```

#### ガバナンス遷移

```
upgrade_governance(new_mode, new_jury_threshold):
  1. dao_governance_active は 1 である必要あり
  2. dao_voting_contract が共同署名する必要あり
  3. new_mode は {0, 1, 2} に含まれる必要あり
  4. new_jury_threshold >= 3（new_mode == 1 の場合）
```

#### コンパイル

```bash
pip install opshin
opshin build spending content_moderation_engine.py
```
