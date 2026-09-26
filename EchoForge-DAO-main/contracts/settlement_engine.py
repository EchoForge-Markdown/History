"""
============================================================
EchoForge DAO — Settlement Engine  (OpShin / Plutus)
结算引擎模块                         (OpShin / Plutus)

English
-------
This spending validator implements the SettlementEngine for EchoForge DAO,
providing three key pillars:

  1. Staking-based Sybil Defence (MVP-ready)
     A minimum ADA_STAKE_THRESHOLD must be met before an address qualifies as
     an EchoCreator or may initiate content promotions.  SubmitContent and
     InitiateReferral redeemers both call require_active_stake, which verifies
     that a StakingVaultDatum UTxO for the caller is present among the
     transaction reference inputs with a staked_amount >= ADA_STAKE_THRESHOLD.
     No slashing is performed; this is pure state validation.

  2. Dynamic Anti-Arbitrage Cap (10× multiplier)
     calculate_payout enforces:
       final_payout = min(calculated_payout, promotion_package_value * 10)
     All intermediate values are scaled by PRECISION (1_000) so that
     effect_coefficient fractions (e.g. 850 = 0.85) are handled as integers,
     eliminating floating-point errors inside the Plutus evaluator.

  3. Governance Hooks (DAO-ready)
     GovernanceConstants is stored as an inline Datum rather than compile-time
     constants.  is_dao_authorized checks the dao_governance_active flag; when
     set, only the DAO_VOTING_CONTRACT script hash may update parameters.
     Every settlement enforces a 10 % platform fee and routes the remainder
     according to effect_coefficient read from the governance datum.

中文
------
本花费验证器为 EchoForge DAO 实现结算引擎，提供三个核心模块：

  1. 基于质押的 Sybil 防护（MVP 就绪）
     地址在成为 EchoCreator 或发起内容推广之前，必须满足 ADA_STAKE_THRESHOLD
     最低质押要求。SubmitContent 和 InitiateReferral Redeemer 均调用
     require_active_stake，验证交易引用输入中存在调用者的 StakingVaultDatum
     UTxO 且 staked_amount >= ADA_STAKE_THRESHOLD。无惩罚机制；仅状态验证。

  2. 动态防套利上限（10 倍乘数）
     calculate_payout 强制：
       final_payout = min(calculated_payout, promotion_package_value * 10)
     所有中间值按 PRECISION（1_000）缩放，effect_coefficient 分数（如 850 =
     0.85）以整数形式处理，消除 Plutus 评估器中的浮点误差。

  3. 治理钩子（DAO 就绪）
     GovernanceConstants 以内联 Datum 而非编译时常量形式存储。
     is_dao_authorized 检查 dao_governance_active 标志；启用时，只有
     DAO_VOTING_CONTRACT 脚本哈希才能更新参数。每次结算强制收取 10% 平台费，
     并根据治理 Datum 中的 effect_coefficient 路由剩余资金。

Build / 编译:
  opshin build spending settlement_engine.py
============================================================
"""

from opshin.prelude import *


# ============================================================
# Compile-time fallback constants
# 编译时回退常量（治理 Datum 不可用时使用）
# ============================================================

# Minimum staked lovelace required to qualify as an EchoCreator or to
# initiate content promotions.  50 ADA = 50_000_000 lovelace.
# 成为 EchoCreator 或发起内容推广所需的最低质押量（50 ADA）
ADA_STAKE_THRESHOLD: int = 50_000_000

# Integer precision multiplier — all fractional coefficients are expressed as
# integer numerators over this denominator to avoid floating-point arithmetic.
# 整数精度乘数——所有分数系数均表示为该分母上的整数分子
PRECISION: int = 1_000

# Platform fee percentage (10 %)
# 平台手续费比例（10%）
PLATFORM_FEE_PERCENT: int = 10

# Maximum payout multiplier relative to promotion package value (10×)
# 相对于推广包价值的最大支付乘数（10×）
ARBITRAGE_CAP_MULTIPLIER: int = 10


# ============================================================
# Datum Types / Datum 类型
# ============================================================

@dataclass()
class GovernanceConstants(PlutusData):
    """
    Mutable governance parameters stored on-chain as an inline Datum.
    Replaces compile-time constants so the DAO can update them via vote.

    以内联 Datum 形式存储在链上的可变治理参数。
    替换编译时常量，使 DAO 可通过投票更新参数。

    Fields / 字段:
      ada_stake_threshold  : Minimum lovelace stake required (default 50 ADA)
                             最低质押量（默认 50 ADA）
      platform_fee_percent : Platform fee numerator out of 100 (default 10)
                             平台手续费百分比（默认 10）
      arbitrage_cap_mult   : Max-payout multiplier over package value (default 10)
                             相对包价值的最大支付乘数（默认 10）
      effect_coefficient   : Scaled creator payout fraction (out of PRECISION=1000)
                             e.g. 850 means 85.0 % of post-fee amount to creator
                             创作者分成系数（精度 1000，例如 850 = 85%）
      dao_governance_active: 0 = constants locked; 1 = DAO can update via vote
                             0 = 参数锁定；1 = DAO 可通过投票更新
      dao_voting_contract  : Script hash of the authorised DAO voting contract
                             授权 DAO 投票合约的脚本哈希
    """
    CONSTR_ID = 0

    ada_stake_threshold: int    # lovelace
    platform_fee_percent: int   # 0–100
    arbitrage_cap_mult: int     # multiplier integer
    effect_coefficient: int     # out of PRECISION (1 000)
    dao_governance_active: int  # 0 or 1
    dao_voting_contract: bytes  # 28-byte script hash (or b'' when inactive)


@dataclass()
class StakingVaultDatum(PlutusData):
    """
    Tracks ADA staked by a single address.  One UTxO per staker is expected.
    Used as a reference input in SubmitContent / InitiateReferral to prove
    active stake without consuming the UTxO.

    跟踪单个地址质押的 ADA。每个质押者对应一个 UTxO。
    在 SubmitContent / InitiateReferral 中作为引用输入使用，
    以证明活跃质押而无需消费该 UTxO。

    Fields / 字段:
      staker_pkh   : 28-byte PubKeyHash of the staking address
                     质押地址的 28 字节 PubKeyHash
      staked_amount: Lovelace amount locked in this vault UTxO
                     锁定在此金库 UTxO 中的 Lovelace 数量
      is_active    : 1 = actively staking; 0 = pending withdrawal
                     1 = 活跃质押；0 = 等待提取
    """
    CONSTR_ID = 1

    staker_pkh: bytes    # 28-byte PubKeyHash
    staked_amount: int   # lovelace
    is_active: int       # 0 or 1


@dataclass()
class SettlementDatum(PlutusData):
    """
    State of a single content-settlement UTxO.

    单个内容结算 UTxO 的状态。

    Fields / 字段:
      creator_pkh          : 28-byte PubKeyHash of the content creator
                             内容创作者的 28 字节 PubKeyHash
      promotion_package_val: Lovelace value of the associated promotion package
                             关联推广包的 Lovelace 价值
      content_id           : Unique identifier for the content piece
                             内容的唯一标识符
      referral_pkh         : Referral address PKH; b'' if no referral
                             推荐人地址 PKH；无推荐时为 b''
      status               : 0 = pending, 1 = settled, 2 = cancelled
                             0 = 待结算，1 = 已结算，2 = 已取消
    """
    CONSTR_ID = 2

    creator_pkh: bytes
    promotion_package_val: int
    content_id: bytes
    referral_pkh: bytes
    status: int            # 0 pending | 1 settled | 2 cancelled


# ============================================================
# Redeemer Types / Redeemer 类型
# ============================================================

@dataclass()
class SubmitContent(PlutusData):
    """
    Creator submits content for promotion.
    Requires active stake >= ADA_STAKE_THRESHOLD.

    创作者提交内容以进行推广。需要活跃质押 >= ADA_STAKE_THRESHOLD。
    """
    CONSTR_ID = 0
    content_id: bytes       # unique content identifier / 内容唯一标识符
    promotion_amount: int   # lovelace value of the promotion package
                            # 推广包的 lovelace 价值


@dataclass()
class InitiateReferral(PlutusData):
    """
    Creator or promoter initiates a referral for an existing content piece.
    Requires active stake >= ADA_STAKE_THRESHOLD.

    创作者或推广者为现有内容发起推荐。需要活跃质押 >= ADA_STAKE_THRESHOLD。
    """
    CONSTR_ID = 1
    content_id: bytes       # content being referred / 被推荐的内容
    referral_pkh: bytes     # referral address PubKeyHash / 推荐人地址 PubKeyHash


@dataclass()
class Settle(PlutusData):
    """
    Finalise a settlement: pay creator, optional referral, and platform fee.
    Payout is capped at promotion_package_value * arbitrage_cap_mult.

    完成结算：支付创作者、可选推荐奖励和平台费用。
    支付上限为 promotion_package_value * arbitrage_cap_mult。

    Fields / 字段:
      gross_payout   : Uncapped calculated payout (lovelace, pre-cap)
                       未封顶的计算支付（lovelace，封顶前）
      platform_amount: Must equal final_payout * platform_fee_percent // 100
                       必须等于 final_payout * platform_fee_percent // 100
      creator_amount : Must equal remainder * effect_coefficient // PRECISION
                       必须等于余额 * effect_coefficient // PRECISION
      referral_amount: Remainder after creator; 0 if no referral
                       创作者后的余额；无推荐时为 0
    """
    CONSTR_ID = 2
    gross_payout: int      # pre-cap payout / 封顶前支付
    platform_amount: int   # 10 % fee / 10% 费用
    creator_amount: int    # creator share / 创作者份额
    referral_amount: int   # referral share / 推荐份额


@dataclass()
class UpdateGovernance(PlutusData):
    """
    DAO-authorised update of GovernanceConstants.
    Only valid when dao_governance_active == 1 and the DAO voting contract signs.

    DAO 授权的 GovernanceConstants 更新。
    仅当 dao_governance_active == 1 且 DAO 投票合约签名时有效。
    """
    CONSTR_ID = 3
    new_constants: GovernanceConstants  # replacement datum / 替换 datum


@dataclass()
class CancelSettlement(PlutusData):
    """
    Creator cancels a pending settlement and reclaims funds.
    Only allowed before status == settled.

    创作者取消待处理结算并取回资金。仅在 status != settled 时允许。
    """
    CONSTR_ID = 4


# Union type for the spending validator redeemer
SettlementRedeemer = Union[
    SubmitContent,
    InitiateReferral,
    Settle,
    UpdateGovernance,
    CancelSettlement,
]


# ============================================================
# Helper / Pure Functions
# 辅助 / 纯函数
# ============================================================

def require_active_stake(
    caller_pkh: bytes,
    ref_inputs: List[TxInInfo],
    threshold: int,
) -> None:
    """
    Sybil-resistance gate: assert that a StakingVaultDatum UTxO for
    caller_pkh is present in the reference inputs and that:
      - is_active == 1
      - staked_amount >= threshold

    Sybil 防护门：断言调用者 caller_pkh 的 StakingVaultDatum UTxO
    存在于引用输入中，且满足：
      - is_active == 1
      - staked_amount >= threshold

    Raises / 抛出:
      AssertionError if no qualifying stake UTxO is found.
      如果未找到合格的质押 UTxO，则抛出 AssertionError。
    """
    found: bool = False
    for ref_input in ref_inputs:
        out = ref_input.resolved
        d = out.datum
        if isinstance(d, SomeOutputDatum):
            inner = d.datum
            if isinstance(inner, StakingVaultDatum):
                if (
                    inner.staker_pkh == caller_pkh
                    and inner.is_active == 1
                    and inner.staked_amount >= threshold
                ):
                    found = True
                    break
    assert found, (
        "require_active_stake: caller has insufficient or inactive stake — "
        "调用者质押不足或质押未激活"
    )


def calculate_payout(
    gross_payout: int,
    promotion_package_value: int,
    arbitrage_cap_mult: int,
) -> int:
    """
    Apply the anti-arbitrage cap.

    Formula / 公式:
      cap            = promotion_package_value * arbitrage_cap_mult
      final_payout   = min(gross_payout, cap)

    All inputs are integers (lovelace); no floating-point arithmetic.
    所有输入均为整数（lovelace）；无浮点运算。

    Returns / 返回:
      Capped payout in lovelace. / 封顶后的 lovelace 支付金额。
    """
    cap: int = promotion_package_value * arbitrage_cap_mult
    if gross_payout > cap:
        return cap
    return gross_payout


def is_dao_authorized(
    datum: GovernanceConstants,
    tx_info: TxInfo,
) -> bool:
    """
    Return True iff the transaction is authorised to update governance
    constants.

    Rules / 规则:
      - If dao_governance_active == 0: no update allowed → return False.
      - If dao_governance_active == 1: the DAO voting contract script
        (dao_voting_contract hash) must appear in tx_info.signatories
        OR must be a spending input — here we check signatories since
        native scripts and Plutus scripts can both add to signatories via
        required_signers in the transaction body.

    当且仅当交易被授权更新治理常量时返回 True。
      - dao_governance_active == 0：不允许更新 → 返回 False。
      - dao_governance_active == 1：DAO 投票合约脚本哈希必须出现在
        tx_info.signatories 中。
    """
    if datum.dao_governance_active == 0:
        return False
    return datum.dao_voting_contract in tx_info.signatories


def get_governance_from_ref_inputs(
    ref_inputs: List[TxInInfo],
) -> GovernanceConstants:
    """
    Locate and return the GovernanceConstants datum from reference inputs.
    The transaction builder is responsible for including the correct governance
    UTxO as a reference input; the validator accepts the first one found.

    从引用输入中定位并返回 GovernanceConstants datum。
    交易构建者负责将正确的治理 UTxO 作为引用输入包含；验证器接受找到的第一个。

    Raises / 抛出:
      AssertionError if the governance UTxO is not found.
      如果未找到治理 UTxO，则抛出 AssertionError。
    """
    for ref_input in ref_inputs:
        out = ref_input.resolved
        d = out.datum
        if isinstance(d, SomeOutputDatum):
            inner = d.datum
            if isinstance(inner, GovernanceConstants):
                return inner
    # No GovernanceConstants datum found in reference inputs.
    # 在引用输入中未找到 GovernanceConstants datum。
    assert False, (
        "get_governance_from_ref_inputs: governance UTxO not found in reference inputs — "
        "在引用输入中未找到治理 UTxO"
    )


def compute_platform_fee(final_payout: int, platform_fee_percent: int) -> int:
    """
    Compute platform fee with integer arithmetic.
    使用整数运算计算平台手续费。

    Returns / 返回:
      platform_fee = final_payout * platform_fee_percent // 100
    """
    return final_payout * platform_fee_percent // 100


def compute_creator_share(
    post_fee_amount: int,
    effect_coefficient: int,
) -> int:
    """
    Compute the creator's share of the post-fee payout.
    计算费后支付中创作者的份额。

    Formula / 公式:
      creator_share = post_fee_amount * effect_coefficient // PRECISION

    effect_coefficient is an integer out of PRECISION (1 000).
    E.g. effect_coefficient=850 means 85.0 % of post_fee_amount.

    effect_coefficient 是精度 PRECISION（1 000）的整数。
    例如 effect_coefficient=850 表示 post_fee_amount 的 85.0%。
    """
    return post_fee_amount * effect_coefficient // PRECISION


# ============================================================
# Main Spending Validator / 主花费验证器
# ============================================================

def validator(
    datum: SettlementDatum,
    redeemer: SettlementRedeemer,
    context: ScriptContext,
) -> None:
    """
    EchoForge DAO — Settlement Engine Spending Validator

    Handles five redeemers:
      0. SubmitContent    — Sybil-gated content submission
      1. InitiateReferral — Sybil-gated referral initiation
      2. Settle           — Anti-arbitrage-capped payout with governance fees
      3. UpdateGovernance — DAO-authorised parameter update
      4. CancelSettlement — Creator-only cancellation

    处理五种 Redeemer：
      0. SubmitContent    — Sybil 防护的内容提交
      1. InitiateReferral — Sybil 防护的推荐发起
      2. Settle           — 带治理费用的防套利封顶支付
      3. UpdateGovernance — DAO 授权的参数更新
      4. CancelSettlement — 仅创作者可取消
    """
    tx_info: TxInfo = context.tx_info

    # ── Load governance constants from reference inputs ────────────────────
    # 从引用输入加载治理常量
    gov: GovernanceConstants = get_governance_from_ref_inputs(
        tx_info.reference_inputs,
    )

    # ==================== SubmitContent ====================
    if isinstance(redeemer, SubmitContent):
        # 1. Require author signature / 需要作者签名
        assert datum.creator_pkh in tx_info.signatories, \
            "SubmitContent: creator signature required — 需要创作者签名"

        # 2. Sybil-resistance: require active stake / Sybil 防护：需要活跃质押
        require_active_stake(
            datum.creator_pkh,
            tx_info.reference_inputs,
            gov.ada_stake_threshold,
        )

        # 3. Content id must be non-empty / 内容 ID 不能为空
        assert len(redeemer.content_id) > 0, \
            "SubmitContent: content_id cannot be empty — 内容 ID 不能为空"

        # 4. Promotion amount must be positive / 推广金额必须为正
        assert redeemer.promotion_amount > 0, \
            "SubmitContent: promotion_amount must be positive — 推广金额必须为正"

        # 5. Settlement must remain pending / 结算必须保持待处理状态
        assert datum.status == 0, \
            "SubmitContent: datum must be in pending status — Datum 必须处于待处理状态"

    # ==================== InitiateReferral ====================
    elif isinstance(redeemer, InitiateReferral):
        # 1. Require initiator signature / 需要发起人签名
        assert datum.creator_pkh in tx_info.signatories, \
            "InitiateReferral: creator signature required — 需要创作者签名"

        # 2. Sybil-resistance: require active stake / Sybil 防护：需要活跃质押
        require_active_stake(
            datum.creator_pkh,
            tx_info.reference_inputs,
            gov.ada_stake_threshold,
        )

        # 3. Referral PKH must be non-empty and differ from creator
        # 推荐人 PKH 不能为空且必须与创作者不同
        assert len(redeemer.referral_pkh) > 0, \
            "InitiateReferral: referral_pkh cannot be empty — 推荐人 PKH 不能为空"
        assert redeemer.referral_pkh != datum.creator_pkh, \
            "InitiateReferral: referral cannot be self-referral — 不能自我推荐"

        # 4. Content id must match / 内容 ID 必须匹配
        assert redeemer.content_id == datum.content_id, \
            "InitiateReferral: content_id mismatch — 内容 ID 不匹配"

        # 5. Settlement must remain pending / 结算必须保持待处理状态
        assert datum.status == 0, \
            "InitiateReferral: datum must be in pending status — Datum 必须处于待处理状态"

    # ==================== Settle ====================
    elif isinstance(redeemer, Settle):
        # 1. Must be in pending status / 必须处于待处理状态
        assert datum.status == 0, \
            "Settle: settlement already finalised or cancelled — 结算已完成或已取消"

        # 2. Apply anti-arbitrage cap / 应用防套利上限
        final_payout: int = calculate_payout(
            redeemer.gross_payout,
            datum.promotion_package_val,
            gov.arbitrage_cap_mult,
        )

        # 3. Compute and validate platform fee (10 %) / 计算并验证平台手续费（10%）
        expected_platform: int = compute_platform_fee(
            final_payout, gov.platform_fee_percent
        )
        # Allow ±1 lovelace rounding tolerance / 允许 ±1 lovelace 舍入误差
        platform_diff: int = redeemer.platform_amount - expected_platform
        if platform_diff < 0:
            platform_diff = -platform_diff
        assert platform_diff <= 1, \
            "Settle: platform_amount does not match 10 % fee — 平台费用不等于 10%"

        # 4. Compute post-fee remainder / 计算费后余额
        post_fee: int = final_payout - redeemer.platform_amount

        # 5. Validate creator share via effect_coefficient / 通过 effect_coefficient 验证创作者份额
        expected_creator: int = compute_creator_share(
            post_fee, gov.effect_coefficient
        )
        creator_diff: int = redeemer.creator_amount - expected_creator
        if creator_diff < 0:
            creator_diff = -creator_diff
        assert creator_diff <= 1, \
            "Settle: creator_amount does not match effect_coefficient — 创作者份额与系数不符"

        # 6. Validate referral share / 验证推荐份额
        expected_referral: int = post_fee - redeemer.creator_amount
        referral_diff: int = redeemer.referral_amount - expected_referral
        if referral_diff < 0:
            referral_diff = -referral_diff
        assert referral_diff <= 1, \
            "Settle: referral_amount does not match remainder — 推荐份额与余额不符"

        # 7. When no referral, referral_amount must be 0 / 无推荐时，推荐金额必须为 0
        if datum.referral_pkh == b'':
            assert redeemer.referral_amount == 0, \
                "Settle: no referral registered; referral_amount must be 0 — " \
                "未注册推荐人；推荐金额必须为 0"

        # 8. Total disbursement must not exceed final_payout / 总支付不得超过 final_payout
        total_disbursed: int = (
            redeemer.platform_amount
            + redeemer.creator_amount
            + redeemer.referral_amount
        )
        assert total_disbursed <= final_payout, \
            "Settle: total disbursement exceeds capped payout — 总支付超过封顶金额"

        # 9. Verify creator receives their share in transaction outputs
        # 验证创作者在交易输出中收到其份额
        assert _creator_paid(
            tx_info.outputs, datum.creator_pkh, redeemer.creator_amount
        ), "Settle: creator output not found or insufficient — 未找到创作者输出或金额不足"

    # ==================== UpdateGovernance ====================
    elif isinstance(redeemer, UpdateGovernance):
        # 1. DAO must be active and authorised / DAO 必须激活且授权
        assert is_dao_authorized(gov, tx_info), \
            "UpdateGovernance: DAO governance not active or not authorised — " \
            "DAO 治理未激活或未授权"

        # 2. Validate new constants are sensible / 验证新常量合理
        new_gov: GovernanceConstants = redeemer.new_constants
        assert new_gov.platform_fee_percent <= 100, \
            "UpdateGovernance: platform_fee_percent must be <= 100 — 平台手续费百分比必须 <= 100"
        assert new_gov.effect_coefficient <= PRECISION, \
            "UpdateGovernance: effect_coefficient must be <= PRECISION (1000) — " \
            "effect_coefficient 必须 <= PRECISION（1000）"
        assert new_gov.ada_stake_threshold > 0, \
            "UpdateGovernance: ada_stake_threshold must be positive — " \
            "ada_stake_threshold 必须为正"
        assert new_gov.arbitrage_cap_mult > 0, \
            "UpdateGovernance: arbitrage_cap_mult must be positive — " \
            "arbitrage_cap_mult 必须为正"

        # 3. Continuing output must carry the updated GovernanceConstants datum
        # 继续输出必须携带更新后的 GovernanceConstants datum
        own_continuing = _get_continuing_outputs(context)
        assert len(own_continuing) == 1, \
            "UpdateGovernance: exactly one continuing output required — " \
            "需要恰好一个继续输出"

    # ==================== CancelSettlement ====================
    elif isinstance(redeemer, CancelSettlement):
        # 1. Only creator can cancel / 仅创作者可取消
        assert datum.creator_pkh in tx_info.signatories, \
            "CancelSettlement: creator signature required — 需要创作者签名"

        # 2. Can only cancel pending settlements / 只能取消待处理结算
        assert datum.status == 0, \
            "CancelSettlement: only pending settlements can be cancelled — " \
            "只能取消待处理的结算"

    else:
        assert False, "SettlementEngine: unknown redeemer — 未知 Redeemer"


# ============================================================
# Internal Helpers / 内部辅助函数
# ============================================================

def _get_continuing_outputs(context: ScriptContext) -> List[TxOut]:
    """
    Return outputs that are sent back to the current script address.
    返回发送回当前脚本地址的输出。
    """
    own_hash: bytes = context.purpose.script_hash  # type: ignore
    result: List[TxOut] = []
    for o in context.tx_info.outputs:
        cred = o.address.payment_credential
        if isinstance(cred, ScriptCredential):
            if cred.credential_hash == own_hash:
                result = result + [o]
    return result


def _creator_paid(
    outputs: List[TxOut],
    creator_pkh: bytes,
    min_amount: int,
) -> bool:
    """
    Check that at least one output pays >= min_amount lovelace to creator_pkh.
    检查至少一个输出向 creator_pkh 支付 >= min_amount lovelace。
    """
    for output in outputs:
        cred = output.address.payment_credential
        if isinstance(cred, PubKeyCredential):
            if cred.credential_hash == creator_pkh:
                ada_value: int = output.value.get(b'', {}).get(b'', 0)
                if ada_value >= min_amount:
                    return True
    return False
