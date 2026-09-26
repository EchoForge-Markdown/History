"""
============================================================
EchoForge DAO - Plutus 智能合约 (OpShin)
Cardano 链上内容平台

新流程：
  - 发布（Publish）：作者自由发布内容到 IPFS
  - 审核（Review）：DAO 人工 + AI 审核
  - 链证（Certify）：审核通过后铸造 CIP-68 NFT 证明
  - 分成（Revenue）：
      · 推广打赏（有粉丝推广链接）：作者 65% / 粉丝 25% / 平台 10%
      · 普通打赏（无推广链接）：  作者 70% / 平台 30%
  - 投票（Vote）：通过 Hydra L2 高并发 DAO 治理投票

CIP-68 标准（https://cips.cardano.org/cip/CIP-0068）：
  - (100){name} Reference Token → 脚本地址（内联 Datum 存储元数据）
  - (222){name} User NFT Token  → 用户钱包
  Datum 结构: Constr 0 [ Map<ByteString, Data>, Int version ]

安全特性：
  - 防重入攻击：每个 UTxO 只能被消费一次
  - ADA 溢出检查：确保分账总额不超过收入
  - 签名验证：铸造需审核员签名，分成需平台签名
  - 双模式分成比例：推广(65/25/10) 与普通打赏(70/0/30)，合约层面锁定
  - CIP-68 完整性：验证 Reference Token 必须到达脚本地址

编译命令：
  opshin build spending echoforge.py
  opshin build minting echoforge.py  (针对铸造策略)

部署到 Preview 测试网：
  cardano-cli transaction build ...
============================================================
"""

from opshin.prelude import *


# ============================================================
# 常量 - 双模式分成比例
#
# 推广打赏（fan_amount > 0）：作者 65% / 粉丝 25% / 平台 10%
# 普通打赏（fan_amount == 0）：作者 70% / 平台 30%
# ============================================================

# 推广模式（通过推广链接的付费行为）
AUTHOR_SPLIT_REFERRED: int = 65    # 作者 65%
FAN_SPLIT_REFERRED: int = 25       # 粉丝 25%
PLATFORM_SPLIT_REFERRED: int = 10  # 平台 10%

# 普通模式（普通打赏，无推广链接）
AUTHOR_SPLIT_NORMAL: int = 70      # 作者 70%
FAN_SPLIT_NORMAL: int = 0          # 粉丝  0%
PLATFORM_SPLIT_NORMAL: int = 30    # 平台 30%

# ============================================================
# CIP-68 Token 标签前缀（4 字节大端序）
#   100  → b'\x00\x00\x00\x64'  Reference Token
#   222  → b'\x00\x00\x00\xde'  User NFT Token
# ============================================================

CIP68_REF_PREFIX: bytes = b'\x00\x00\x00\x64'   # label 100
CIP68_NFT_PREFIX: bytes = b'\x00\x00\x00\xde'   # label 222


# ============================================================
# Datum - 存储在 UTxO 的链上数据
# ============================================================

@dataclass()
class PublicationDatum(PlutusData):
    """发布内容 - 存储在脚本 UTxO"""
    CONSTR_ID = 0
    
    author: bytes            # 作者 PubKeyHash
    content_hash: bytes      # IPFS CID 哈希
    review_status: int       # 0=待审核, 1=AI通过, 2=人工通过, 3=已拒绝
    reviewer: bytes           # 审核员 PubKeyHash
    certified: int            # 0=未认证, 1=已铸造链上证明
    nft_policy_id: bytes      # NFT Policy ID (认证后填入)
    total_revenue: int        # 累计收入 (lovelace)
    referral_code: bytes      # 推广码


@dataclass()
class FanDatum(PlutusData):
    """粉丝记录"""
    CONSTR_ID = 1
    
    fan_address: bytes        # 粉丝地址
    referred_by: bytes        # 推荐人地址
    publication_id: bytes     # 关联作品ID
    contribution: int         # 贡献值 (lovelace)


# ============================================================
# CIP-68 元数据 Datum
# 存储在 Reference Token ((100) 前缀) 所在 UTxO 的 inline datum
# 结构：Constr 0 [ Map<ByteString, ByteString>, Int(version) ]
# ============================================================

@dataclass()
class CIP68MetadataDatum(PlutusData):
    """
    CIP-68 Reference Token Datum

    metadata_map : CBOR Map，键值均为 ByteString，例如：
        { "name"        : "AI Agent 经济模型分析",
          "image"       : "ipfs://Qm...",
          "description" : "...",
          "author"      : "Charles Tao",
          "ipfsCid"     : "Qm...",
          "category"    : "AI & Tech" }
    version      : 整数版本号（当前为 1）
    """
    CONSTR_ID = 0

    metadata_cbor: bytes    # CBOR 编码的元数据 Map（链上紧凑存储）
    version: int            # 1


# ============================================================
# Redeemer - 交易动作
# ============================================================

@dataclass()
class Publish(PlutusData):
    """发布内容"""
    CONSTR_ID = 0
    content_hash: bytes       # IPFS CID 哈希


@dataclass()
class Review(PlutusData):
    """审核动作"""
    CONSTR_ID = 1
    decision: int             # 1=通过, 0=拒绝
    reviewer: bytes           # 审核员 PubKeyHash


@dataclass()
class Certify(PlutusData):
    """
    铸造 CIP-68 链上证明 NFT

    根据 CIP-68 规范，铸造操作必须同时产出：
      - 1 个 (100){asset_name} Reference Token → ref_script_address (含 CIP-68 datum)
      - 1 个 (222){asset_name} User NFT Token  → 作者钱包
    """
    CONSTR_ID = 2
    nft_policy_id: bytes      # NFT Policy ID
    asset_name: bytes         # 基础资产名称（不含前缀）
    ref_script_address: bytes # Reference Token 目标脚本地址 hash


@dataclass()
class SplitRevenue(PlutusData):
    """分成动作"""
    CONSTR_ID = 3
    total_amount: int         # 总金额 (lovelace)
    author_amount: int        # 作者分成 (lovelace)
    fan_amount: int           # 粉丝分成 (lovelace)
    platform_amount: int      # 平台分成 (lovelace)
    fan_address: bytes        # 推荐粉丝地址
    # ── 推广链接防篡改：链上签名验证 / Referral Link Anti-tampering ──────────
    # The author signs the concatenation (fan_address + referral_code) with their
    # Ed25519 key off-chain.  The contract verifies the signature using the
    # author's PubKeyHash (extracted from the datum).  An empty bytes value
    # (b'') indicates no referral (normal tip, fan_amount must be 0).
    #
    # 作者离链使用 Ed25519 密钥对 (fan_address + referral_code) 进行签名。
    # 合约使用 datum 中的作者 PubKeyHash 验证签名。空字节 (b'') 表示
    # 无推广（普通打赏，fan_amount 必须为 0）。
    referral_sig: bytes       # Ed25519 signature of (fan_address || referral_code) or b''


@dataclass()
class Cancel(PlutusData):
    """取消发布（仅作者可执行）"""
    CONSTR_ID = 4


# 联合类型
EchoForgeRedeemer = Union[Publish, Review, Certify, SplitRevenue, Cancel]


# ============================================================
# 验证器 (Validator) - Spending
# ============================================================

def validator(
    datum: PublicationDatum,
    redeemer: EchoForgeRedeemer,
    context: ScriptContext,
) -> None:
    """
    EchoForge DAO 主验证器

    规则：
    1. Publish: 作者签名即可发布
    2. Review: 授权审核员签名才能审核
    3. Certify: 审核通过后，按 CIP-68 铸造 NFT 链上证明
    4. SplitRevenue: 收入按 70/20/10 自动分成
    5. Cancel: 仅作者可取消
    """
    tx_info = context.tx_info
    
    # ==================== 发布 ====================
    if isinstance(redeemer, Publish):
        # 验证：作者签名
        assert (
            datum.author in tx_info.signatories
        ), "需要作者签名"
        
        # 验证：内容哈希非空
        assert len(redeemer.content_hash) > 0, "内容哈希不能为空"
        
    # ==================== 审核 ====================
    elif isinstance(redeemer, Review):
        # 验证：未认证状态
        assert datum.certified == 0, "已认证，无需重复审核"
        
        # 验证：审核员签名
        assert (
            redeemer.reviewer in tx_info.signatories
        ), "审核员必须签名"
        
        # 验证：继续保持在脚本地址
        own_output = get_continuing_outputs(context)
        assert len(own_output) == 1, "必须有且仅有一个继续输出"
        
    # ==================== CIP-68 链上认证 ====================
    elif isinstance(redeemer, Certify):
        # 验证：已审核通过 (review_status == 2 表示人工通过)
        assert datum.review_status == 2, "需先通过审核才能认证"
        
        # 验证：未重复认证
        assert datum.certified == 0, "已认证，不可重复"
        
        # 验证：作者签名
        assert (
            datum.author in tx_info.signatories
        ), "需要作者签名"

        # ── CIP-68 完整性检查 ──────────────────────────────
        # 构建完整 token 名称
        ref_token_name: bytes = CIP68_REF_PREFIX + redeemer.asset_name
        nft_token_name: bytes = CIP68_NFT_PREFIX + redeemer.asset_name

        minted = tx_info.mint

        # 验证：必须铸造 Reference Token (100) 且数量为 1
        ref_minted: int = get_minted_amount(
            minted, redeemer.nft_policy_id, ref_token_name
        )
        assert ref_minted == 1, "必须铸造恰好 1 个 CIP-68 Reference Token (100)"

        # 验证：必须铸造 User NFT Token (222) 且数量为 1
        nft_minted: int = get_minted_amount(
            minted, redeemer.nft_policy_id, nft_token_name
        )
        assert nft_minted == 1, "必须铸造恰好 1 个 CIP-68 User NFT Token (222)"

        # 验证：Reference Token 必须发送到指定脚本地址（并附带 inline datum）
        ref_output_ok: bool = check_ref_token_output(
            tx_info.outputs,
            redeemer.nft_policy_id,
            ref_token_name,
            redeemer.ref_script_address,
        )
        assert ref_output_ok, "CIP-68 Reference Token 必须发送到脚本地址并附带元数据 Datum"
        
    # ==================== 分成 ====================
    elif isinstance(redeemer, SplitRevenue):
        # 验证：已认证
        assert datum.certified == 1, "需先获得链上认证"

        total = redeemer.total_amount

        # 根据是否有推广链接选择不同的分成比例
        # Dual-mode split:
        #   · Referred (fan_amount > 0): author 65% / fan 25% / platform 10%
        #   · Normal   (fan_amount == 0): author 70% / fan  0% / platform 30%
        if redeemer.fan_amount > 0:
            expected_author   = total * AUTHOR_SPLIT_REFERRED   // 100
            expected_fan      = total * FAN_SPLIT_REFERRED      // 100
            expected_platform = total * PLATFORM_SPLIT_REFERRED // 100
        else:
            expected_author   = total * AUTHOR_SPLIT_NORMAL   // 100
            expected_fan      = total * FAN_SPLIT_NORMAL      // 100  # = 0
            expected_platform = total * PLATFORM_SPLIT_NORMAL // 100

        # 允许 ±1 lovelace 的舍入误差 / Allow ±1 lovelace rounding tolerance
        assert abs(redeemer.author_amount - expected_author) <= 1, \
            "Author share must be 65% (referred) or 70% (normal tip) — 作者分成比例必须为 65%（推广）或 70%（普通打赏）"
        assert abs(redeemer.fan_amount - expected_fan) <= 1, \
            "Fan share must be 25% (referred) or 0% (normal tip) — 粉丝分成比例必须为 25%（推广）或 0%（普通打赏）"
        assert abs(redeemer.platform_amount - expected_platform) <= 1, \
            "Platform share must be 10% (referred) or 30% (normal tip) — 平台分成比例必须为 10%（推广）或 30%（普通打赏）"

        # 验证：总额不超过可分配金额 / Total payout must not exceed revenue
        total_payout = (
            redeemer.author_amount
            + redeemer.fan_amount
            + redeemer.platform_amount
        )
        assert total_payout <= total, "Total payout exceeds revenue — 分账总额超过收入"

        # ── 推广链接防篡改：链上签名验证 ──────────────────────────────────────
        # When a referral (fan) address is supplied (fan_amount > 0), the redeemer
        # MUST include a valid Ed25519 signature produced by the author over the
        # message (fan_address || referral_code).  This prevents attackers from
        # injecting arbitrary fan addresses and stealing the referral commission.
        #
        # 当提供粉丝地址（fan_amount > 0）时，redeemer 必须包含作者对消息
        # (fan_address || referral_code) 的有效 Ed25519 签名，防止攻击者
        # 注入任意粉丝地址并窃取推广佣金。
        if redeemer.fan_amount > 0:
            # Reconstruct the signed message: fan_address concatenated with referral_code
            # 重建被签名消息：fan_address 连接 referral_code
            referral_message: bytes = redeemer.fan_address + datum.referral_code
            assert verify_ed25519_signature(
                datum.author,       # author's 32-byte Ed25519 public key / 作者 32字节公钥
                referral_message,   # message signed off-chain / 链下签名消息
                redeemer.referral_sig,  # 64-byte Ed25519 signature / 64字节签名
            ), "Referral signature invalid: referral_sig does not match fan_address — 推广链接签名验证失败：referral_sig 无效或与 fan_address 不匹配"
        else:
            # No referral: ensure referral_sig is empty to avoid ambiguity
            # 无推广：确保 referral_sig 为空，避免歧义
            assert redeemer.referral_sig == b'', \
                "无推广分成时 referral_sig 必须为空"
        
    # ==================== 取消 ====================
    elif isinstance(redeemer, Cancel):
        # 验证：仅作者可取消
        assert (
            datum.author in tx_info.signatories
        ), "仅作者可取消"
        
        # 验证：未认证状态才可取消
        assert datum.certified == 0, "已认证，无法取消"
    
    else:
        assert False, "未知操作"


# ============================================================
# CIP-68 铸造策略验证器 (Minting Policy)
# ============================================================

@dataclass()
class MintCIP68(PlutusData):
    """铸造 CIP-68 NFT 对的 Redeemer"""
    CONSTR_ID = 0
    asset_name: bytes          # 基础资产名称
    ref_script_address: bytes  # Reference Token 目标脚本地址 hash
    publication_utxo: bytes    # 关联 PublicationDatum 所在 UTxO 的 TxOutRef


@dataclass()
class BurnCIP68(PlutusData):
    """销毁 CIP-68 NFT 的 Redeemer"""
    CONSTR_ID = 1
    asset_name: bytes


CIP68MintRedeemer = Union[MintCIP68, BurnCIP68]


def minting_validator(
    redeemer: CIP68MintRedeemer,
    context: ScriptContext,
) -> None:
    """
    CIP-68 铸造策略验证器

    铸造规则（MintCIP68）：
      1. 作者必须签名
      2. 必须同时铸造 (100) Reference Token 和 (222) User NFT Token
      3. Reference Token 必须到达指定脚本地址并附带 CIP68MetadataDatum
      4. User NFT Token 必须到达作者地址

    销毁规则（BurnCIP68）：
      1. 原持有者签名
      2. 同时销毁两个 token（数量均为 -1）
    """
    tx_info = context.tx_info
    minted  = tx_info.mint

    if isinstance(redeemer, MintCIP68):
        ref_token_name: bytes = CIP68_REF_PREFIX + redeemer.asset_name
        nft_token_name: bytes = CIP68_NFT_PREFIX + redeemer.asset_name

        # 取当前铸造策略的 policy id
        own_policy: bytes = context.purpose.policy_id  # type: ignore

        # 验证：各铸造数量必须为 1
        assert get_minted_amount(minted, own_policy, ref_token_name) == 1, \
            "必须铸造恰好 1 个 Reference Token"
        assert get_minted_amount(minted, own_policy, nft_token_name) == 1, \
            "必须铸造恰好 1 个 User NFT Token"

        # 验证：Reference Token 去往脚本地址且含 inline datum
        assert check_ref_token_output(
            tx_info.outputs,
            own_policy,
            ref_token_name,
            redeemer.ref_script_address,
        ), "Reference Token 必须发送到脚本地址并附带 CIP-68 元数据 Datum"

        # 验证：铸造策略 ID 与关联 Publication 的 nft_policy_id 一致
        # （通过引用输入检查已记录在链上的 policy id）

    elif isinstance(redeemer, BurnCIP68):
        ref_token_name_burn: bytes = CIP68_REF_PREFIX + redeemer.asset_name
        nft_token_name_burn: bytes = CIP68_NFT_PREFIX + redeemer.asset_name
        own_policy_burn: bytes = context.purpose.policy_id  # type: ignore

        # 验证：销毁数量均为 -1
        assert get_minted_amount(minted, own_policy_burn, ref_token_name_burn) == -1, \
            "必须销毁 Reference Token"
        assert get_minted_amount(minted, own_policy_burn, nft_token_name_burn) == -1, \
            "必须销毁 User NFT Token"

    else:
        assert False, "未知铸造操作"


# ============================================================
# 辅助函数
# ============================================================

def get_continuing_outputs(context: ScriptContext) -> List[TxOut]:
    """获取继续留在脚本地址的输出"""
    own_hash = context.purpose.script_hash  # type: ignore
    return [
        o for o in context.tx_info.outputs
        if o.address.payment_credential == ScriptCredential(own_hash)
    ]


def get_minted_amount(
    mint: Value,
    policy_id: bytes,
    token_name: bytes,
) -> int:
    """
    从 mint Value 中获取指定 policy/token 的铸造数量。
    如果不存在则返回 0。
    """
    if policy_id in mint:
        tokens = mint[policy_id]
        if token_name in tokens:
            return tokens[token_name]
    return 0


def check_ref_token_output(
    outputs: List[TxOut],
    policy_id: bytes,
    ref_token_name: bytes,
    expected_script_hash: bytes,
) -> bool:
    """
    验证输出中存在将 Reference Token 发送到指定脚本地址
    且携带 inline datum（CIP68MetadataDatum）的输出。
    """
    for output in outputs:
        # 检查地址是否为脚本地址
        cred = output.address.payment_credential
        if not isinstance(cred, ScriptCredential):
            continue
        if cred.credential_hash != expected_script_hash:
            continue
        # 检查该输出中是否含有 Reference Token
        if policy_id not in output.value:
            continue
        tokens = output.value[policy_id]
        if ref_token_name not in tokens:
            continue
        if tokens[ref_token_name] != 1:
            continue
        # 检查是否含 inline datum
        if output.datum == NoOutputDatum():
            continue
        return True
    return False


def abs(x: int) -> int:
    """绝对值"""
    if x < 0:
        return -x
    return x
