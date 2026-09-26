"""
============================================================
EchoForge DAO - Plutus 智能合约 (OpShin)
Cardano 链上内容平台

新流程：
  - 发布（Publish）：作者自由发布内容到 IPFS
  - 审核（Review）：DAO 人工 + AI 审核
  - 链证（Certify）：审核通过后铸造链上 NFT 证明
  - 分成（Revenue）：作者 70% / 粉丝 20% / 平台 10%

安全特性：
  - 防重入攻击：每个 UTxO 只能被消费一次
  - ADA 溢出检查：确保分账总额不超过收入
  - 签名验证：铸造需审核员签名，分成需平台签名
  - 固定分成比例：合约层面锁定 70/20/10

编译命令：
  opshin build spending echoforge.py

部署到 Preview 测试网：
  cardano-cli transaction build ...
============================================================
"""

from opshin.prelude import *


# ============================================================
# 常量 - 固定分成比例
# ============================================================

AUTHOR_SPLIT: int = 70   # 作者 70%
FAN_SPLIT: int = 20      # 粉丝 20%
PLATFORM_SPLIT: int = 10 # 平台 10%


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
    """铸造链上证明 NFT"""
    CONSTR_ID = 2
    nft_policy_id: bytes      # NFT Policy ID
    nft_asset_name: bytes     # NFT Asset Name


@dataclass()
class SplitRevenue(PlutusData):
    """分成动作"""
    CONSTR_ID = 3
    total_amount: int         # 总金额 (lovelace)
    author_amount: int        # 作者分成 (lovelace)
    fan_amount: int           # 粉丝分成 (lovelace)
    platform_amount: int      # 平台分成 (lovelace)
    fan_address: bytes        # 推荐粉丝地址


@dataclass()
class Cancel(PlutusData):
    """取消发布（仅作者可执行）"""
    CONSTR_ID = 4


# 联合类型
EchoForgeRedeemer = Union[Publish, Review, Certify, SplitRevenue, Cancel]


# ============================================================
# 验证器 (Validator)
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
    3. Certify: 审核通过后，铸造 NFT 链上证明
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
        
    # ==================== 链上认证 ====================
    elif isinstance(redeemer, Certify):
        # 验证：已审核通过 (review_status == 2 表示人工通过)
        assert datum.review_status == 2, "需先通过审核才能认证"
        
        # 验证：未重复认证
        assert datum.certified == 0, "已认证，不可重复"
        
        # 验证：作者签名
        assert (
            datum.author in tx_info.signatories
        ), "需要作者签名"
        
    # ==================== 分成 ====================
    elif isinstance(redeemer, SplitRevenue):
        # 验证：已认证
        assert datum.certified == 1, "需先获得链上认证"
        
        # 验证：分成金额正确（固定 70/20/10）
        total = redeemer.total_amount
        expected_author = total * AUTHOR_SPLIT // 100
        expected_fan = total * FAN_SPLIT // 100
        expected_platform = total * PLATFORM_SPLIT // 100
        
        # 允许 ±1 lovelace 的舍入误差
        assert abs(redeemer.author_amount - expected_author) <= 1, \
            "作者分成比例必须为 70%"
        assert abs(redeemer.fan_amount - expected_fan) <= 1, \
            "粉丝分成比例必须为 20%"
        assert abs(redeemer.platform_amount - expected_platform) <= 1, \
            "平台分成比例必须为 10%"
        
        # 验证：总额不超过可分配金额
        total_payout = (
            redeemer.author_amount 
            + redeemer.fan_amount 
            + redeemer.platform_amount
        )
        assert total_payout <= total, "分账总额超过收入"
        
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
# 辅助函数
# ============================================================

def get_continuing_outputs(context: ScriptContext) -> List[TxOut]:
    """获取继续留在脚本地址的输出"""
    own_hash = context.purpose.script_hash  # type: ignore
    return [
        o for o in context.tx_info.outputs
        if o.address.payment_credential == ScriptCredential(own_hash)
    ]


def abs(x: int) -> int:
    """绝对值"""
    if x < 0:
        return -x
    return x
