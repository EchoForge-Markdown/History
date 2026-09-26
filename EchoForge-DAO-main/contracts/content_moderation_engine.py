"""
============================================================
EchoForge DAO — Content Moderation Engine  (OpShin / Plutus)
内容审核引擎模块                             (OpShin / Plutus)

English
-------
This spending validator implements the ContentModerationEngine for EchoForge DAO,
supporting three distinct governance modes:

  Mode 0 — AI_ONLY
    Content pass/fail is decided solely by the AI score threshold.
    A score >= AI_PASS_THRESHOLD (70) passes; anything below is rejected.

  Mode 1 — AI_PLUS_JURY
    AI performs a pre-filter at AI_PASS_THRESHOLD.  Content that clears the
    AI threshold is approved immediately.  Borderline content
    (AI_HARD_REJECT_THRESHOLD <= score < AI_PASS_THRESHOLD) is queued for a
    Jury vote; the jury quorum is governed by GovernanceConfig.jury_threshold
    (minimum MIN_JURY_VOTES = 3 high-reputation jurors).

  Mode 2 — FULLY_DAO
    Content approval requires a general DAO vote.  The DAO_VOTING_CONTRACT
    script hash must appear in the transaction signatories to confirm the DAO
    has approved the content, and the datum must record dao_approved == 1.

Safety Constraint — Hard-Reject List:
    Any content with ai_score < AI_HARD_REJECT_THRESHOLD (40) is ALWAYS
    rejected regardless of governance mode.  This prevents spam overflow.

Governance Transition:
    The DAO may switch moderation modes via the UpgradeGovernance redeemer
    when dao_governance_active == 1.  The DAO voting contract must co-sign
    the transition transaction.

中文
------
本花费验证器为 EchoForge DAO 实现内容审核引擎，支持三种治理模式：

  模式 0 — AI_ONLY（仅 AI）
    内容通过/拒绝完全由 AI 分数阈值决定。
    分数 >= AI_PASS_THRESHOLD（70）通过；低于则拒绝。

  模式 1 — AI_PLUS_JURY（AI + 陪审团）
    AI 在 AI_PASS_THRESHOLD 进行预过滤，满足阈值的内容直接批准。
    处于边界范围（AI_HARD_REJECT_THRESHOLD <= 分数 < AI_PASS_THRESHOLD）
    的内容排队等待陪审团投票；法定人数由 GovernanceConfig.jury_threshold
    控制（最少 MIN_JURY_VOTES = 3 名高声誉陪审员）。

  模式 2 — FULLY_DAO（完全 DAO）
    内容审批需要 DAO 全体投票。DAO_VOTING_CONTRACT 脚本哈希必须出现在
    交易签名者中，以确认 DAO 已批准该内容，且 datum 必须记录
    dao_approved == 1。

安全约束——硬性拒绝列表：
    ai_score < AI_HARD_REJECT_THRESHOLD（40）的内容无论治理模式如何均被
    拒绝，以防止垃圾内容溢出。

治理转换：
    当 dao_governance_active == 1 时，DAO 可通过 UpgradeGovernance Redeemer
    切换审核模式。DAO 投票合约必须联合签名。

Build / 编译:
  opshin build spending content_moderation_engine.py
============================================================
"""

from opshin.prelude import *


# ============================================================
# Constants / 常量
# ============================================================

# AI score strictly below this threshold → hard reject in ALL governance modes.
# Prevents spam overflow regardless of jury or DAO decisions.
# AI 分数严格低于此阈值 → 在所有治理模式下硬性拒绝（防止垃圾内容溢出）
AI_HARD_REJECT_THRESHOLD: int = 40

# AI score at or above this threshold passes the AI filter in AI_ONLY and
# AI_PLUS_JURY modes.
# AI 分数 >= 此阈值在 AI_ONLY 和 AI_PLUS_JURY 模式下通过 AI 过滤
AI_PASS_THRESHOLD: int = 70

# Default minimum number of jury yes-votes required in AI_PLUS_JURY mode.
# Overridden by GovernanceConfig.jury_threshold, but never below this floor.
# AI_PLUS_JURY 模式下默认所需最少陪审团赞成票数（不低于此底线）
MIN_JURY_VOTES: int = 3

# Governance mode identifiers / 治理模式标识符
MODE_AI_ONLY: int = 0       # Solely AI decision / 仅 AI 决策
MODE_AI_PLUS_JURY: int = 1  # AI pre-filter + jury vote / AI 预过滤 + 陪审团投票
MODE_FULLY_DAO: int = 2     # Full DAO vote required / 需要完整 DAO 投票

# Content moderation status codes / 内容审核状态码
STATUS_PENDING: int = 0      # Awaiting initial AI moderation / 等待初始 AI 审核
STATUS_JURY_QUEUED: int = 1  # Borderline content queued for jury / 边界内容排队等待陪审团
STATUS_APPROVED: int = 2     # Approved for publication / 批准发布
STATUS_REJECTED: int = 3     # Rejected / 已拒绝

# DAO approval codes stored in ContentModerationDatum.dao_approved
# 存储在 ContentModerationDatum.dao_approved 中的 DAO 批准码
DAO_PENDING: int = 0    # DAO vote not yet cast / DAO 投票尚未进行
DAO_APPROVED: int = 1   # DAO voted to approve / DAO 投票批准
DAO_REJECTED: int = 2   # DAO voted to reject / DAO 投票拒绝


# ============================================================
# Datum Types / Datum 类型
# ============================================================

@dataclass()
class GovernanceConfig(PlutusData):
    """
    Mutable governance configuration stored on-chain as an inline Datum.
    Controls which moderation mode is active and the jury quorum requirement.

    以内联 Datum 形式存储在链上的可变治理配置。
    控制当前激活的审核模式及陪审团法定人数要求。

    Fields / 字段:
      moderation_mode     : 0 = AI_ONLY, 1 = AI_PLUS_JURY, 2 = FULLY_DAO
                            审核模式
      jury_threshold      : Minimum jury yes-votes for approval (mode 1).
                            Must be >= MIN_JURY_VOTES (3).
                            审核批准所需最少陪审团赞成票数（模式 1）。
                            必须 >= MIN_JURY_VOTES（3）。
      dao_voting_contract : 28-byte script hash of the authorised DAO voting
                            contract; b'' when dao_governance_active == 0.
                            授权 DAO 投票合约的 28 字节脚本哈希；
                            dao_governance_active == 0 时为 b''。
      dao_governance_active: 0 = config locked (no upgrades allowed);
                             1 = DAO can upgrade via UpgradeGovernance.
                             0 = 配置锁定（不允许升级）；
                             1 = DAO 可通过 UpgradeGovernance 升级。
    """
    CONSTR_ID = 0

    moderation_mode: int       # 0=AI_ONLY | 1=AI_PLUS_JURY | 2=FULLY_DAO
    jury_threshold: int        # min jury yes-votes (mode 1) / 最少陪审团赞成票数（模式 1）
    dao_voting_contract: bytes # 28-byte script hash / 28 字节脚本哈希
    dao_governance_active: int # 0=locked | 1=active / 0=锁定 | 1=激活


@dataclass()
class ContentModerationDatum(PlutusData):
    """
    Per-content moderation state stored as a UTxO datum at this script address.
    Tracks the full lifecycle from submission through jury/DAO vote to final verdict.

    存储在此脚本地址 UTxO datum 中的每条内容审核状态。
    跟踪从提交到陪审团/DAO 投票再到最终裁决的完整生命周期。

    Fields / 字段:
      content_id    : Unique content identifier (e.g. IPFS CID hash).
                      唯一内容标识符（如 IPFS CID 哈希）。
      author        : 28-byte PubKeyHash of the content author.
                      内容作者的 28 字节 PubKeyHash。
      ai_score      : AI moderation score in range 0–100, set at submission.
                      Scores < AI_HARD_REJECT_THRESHOLD (40) are always blocked.
                      AI 审核分数，范围 0–100，在提交时设置。
                      分数 < AI_HARD_REJECT_THRESHOLD（40）始终被阻止。
      jury_yes_votes: Running count of jury yes-votes cast via CastJuryVote.
                      通过 CastJuryVote 投出的陪审团赞成票累计数。
      jury_no_votes : Running count of jury no-votes cast via CastJuryVote.
                      通过 CastJuryVote 投出的陪审团反对票累计数。
      dao_approved  : DAO approval result — DAO_PENDING (0), DAO_APPROVED (1),
                      or DAO_REJECTED (2).  Updated off-chain via DAO vote and
                      verified on-chain during FinalizeModeration.
                      DAO 批准结果 — DAO_PENDING（0）、DAO_APPROVED（1）
                      或 DAO_REJECTED（2）。
      status        : Current moderation lifecycle status (see STATUS_* constants).
                      当前审核生命周期状态（参见 STATUS_* 常量）。
    """
    CONSTR_ID = 1

    content_id: bytes     # IPFS CID or unique ID / IPFS CID 或唯一 ID
    author: bytes         # 28-byte PubKeyHash / 28 字节 PubKeyHash
    ai_score: int         # 0–100
    jury_yes_votes: int   # accumulated yes-votes / 累计赞成票
    jury_no_votes: int    # accumulated no-votes / 累计反对票
    dao_approved: int     # DAO_PENDING=0 | DAO_APPROVED=1 | DAO_REJECTED=2
    status: int           # STATUS_PENDING | STATUS_JURY_QUEUED | STATUS_APPROVED | STATUS_REJECTED


# Union datum accepted by the spending validator.
# 花费验证器接受的联合 Datum 类型
ModerationDatum = Union[GovernanceConfig, ContentModerationDatum]


# ============================================================
# Redeemer Types / Redeemer 类型
# ============================================================

@dataclass()
class SubmitContent(PlutusData):
    """
    Author submits content for moderation with an AI-oracle-supplied score.
    Validates the AI score, applies the hard-reject rule, and transitions
    the datum to the appropriate next status.

    作者提交内容以进行审核，并附带 AI Oracle 提供的分数。
    验证 AI 分数，应用硬性拒绝规则，并将 datum 转换为适当的下一状态。

    Fields / 字段:
      content_id: Unique content identifier matching datum.content_id.
                  与 datum.content_id 匹配的唯一内容标识符。
      ai_score  : AI moderation score (0–100) matching datum.ai_score.
                  与 datum.ai_score 匹配的 AI 审核分数（0–100）。
    """
    CONSTR_ID = 0

    content_id: bytes  # must match datum.content_id / 必须与 datum.content_id 匹配
    ai_score: int      # 0–100; must match datum.ai_score / 0–100；必须与 datum.ai_score 匹配


@dataclass()
class CastJuryVote(PlutusData):
    """
    A juror casts a vote on borderline content (AI_PLUS_JURY mode only).
    Valid only when datum.status == STATUS_JURY_QUEUED.
    The juror's PubKeyHash must appear in tx_info.signatories.

    陪审员对边界内容投票（仅 AI_PLUS_JURY 模式）。
    仅当 datum.status == STATUS_JURY_QUEUED 时有效。
    陪审员的 PubKeyHash 必须出现在 tx_info.signatories 中。

    Fields / 字段:
      content_id: Content being voted on, must match datum.content_id.
                  被投票内容，必须与 datum.content_id 匹配。
      vote      : 1 = yes/approve, 0 = no/reject.
                  1 = 赞成/批准，0 = 反对/拒绝。
      juror     : 28-byte PubKeyHash of the voting juror.
                  投票陪审员的 28 字节 PubKeyHash。
    """
    CONSTR_ID = 1

    content_id: bytes  # must match datum.content_id / 必须与 datum.content_id 匹配
    vote: int          # 1=yes | 0=no
    juror: bytes       # 28-byte juror PubKeyHash / 28 字节陪审员 PubKeyHash


@dataclass()
class FinalizeModeration(PlutusData):
    """
    Finalize the moderation decision for a content item.
    Evaluates the accumulated jury votes or DAO decision against the
    active governance mode and sets the content to STATUS_APPROVED or
    STATUS_REJECTED.

    最终确定内容的审核决定。
    根据当前治理模式评估累积的陪审团票数或 DAO 决定，
    并将内容设置为 STATUS_APPROVED 或 STATUS_REJECTED。

    Fields / 字段:
      content_id: Content to finalise, must match datum.content_id.
                  要最终确定的内容，必须与 datum.content_id 匹配。
    """
    CONSTR_ID = 2

    content_id: bytes  # must match datum.content_id / 必须与 datum.content_id 匹配


@dataclass()
class UpgradeGovernance(PlutusData):
    """
    DAO-authorised upgrade of the GovernanceConfig stored at this script address.
    Only valid when datum (GovernanceConfig).dao_governance_active == 1 and the
    DAO voting contract co-signs the transaction.

    DAO 授权的 GovernanceConfig 升级。
    仅当 datum（GovernanceConfig）.dao_governance_active == 1 且
    DAO 投票合约联合签名时有效。

    Fields / 字段:
      new_mode          : New moderation mode (0 = AI_ONLY, 1 = AI_PLUS_JURY,
                          2 = FULLY_DAO).
                          新审核模式（0 = AI_ONLY，1 = AI_PLUS_JURY，
                          2 = FULLY_DAO）。
      new_jury_threshold: New minimum jury yes-vote count.
                          Must be >= MIN_JURY_VOTES (3) when new_mode == 1.
                          新的最少陪审团赞成票数。
                          当 new_mode == 1 时必须 >= MIN_JURY_VOTES（3）。
    """
    CONSTR_ID = 3

    new_mode: int           # 0=AI_ONLY | 1=AI_PLUS_JURY | 2=FULLY_DAO
    new_jury_threshold: int # >= MIN_JURY_VOTES when new_mode == 1


# Union type for the spending validator redeemer.
# 花费验证器 Redeemer 的联合类型
ModerationRedeemer = Union[
    SubmitContent,
    CastJuryVote,
    FinalizeModeration,
    UpgradeGovernance,
]


# ============================================================
# Helper / Pure Functions
# 辅助 / 纯函数
# ============================================================

def is_hard_reject(ai_score: int) -> bool:
    """
    Safety constraint — Hard-Reject list:
    Return True iff ai_score < AI_HARD_REJECT_THRESHOLD (40).
    Content below this threshold is ALWAYS blocked regardless of governance
    mode to prevent spam overflow.

    安全约束——硬性拒绝列表：
    当且仅当 ai_score < AI_HARD_REJECT_THRESHOLD（40）时返回 True。
    低于此阈值的内容无论治理模式如何均被阻止，以防止垃圾内容溢出。

    Returns / 返回:
      True if the content must be hard-rejected, False otherwise.
      如果内容必须被硬性拒绝则返回 True，否则返回 False。
    """
    return ai_score < AI_HARD_REJECT_THRESHOLD


def verify_community_consensus(
    content: ContentModerationDatum,
    gov: GovernanceConfig,
    tx_info: TxInfo,
) -> bool:
    """
    Validate that a community consensus (jury quorum or DAO approval) has
    been reached for the given content.  Called when moderation_mode > 0.

    验证是否已就给定内容达成社区共识（陪审团法定人数或 DAO 批准）。
    当 moderation_mode > 0 时调用。

    For AI_PLUS_JURY (mode 1) / AI_PLUS_JURY 模式（模式 1）:
      Checks that content.jury_yes_votes >= effective jury threshold.
      effective_threshold = max(gov.jury_threshold, MIN_JURY_VOTES).
      检查 content.jury_yes_votes >= 有效陪审团阈值。
      effective_threshold = max(gov.jury_threshold, MIN_JURY_VOTES)。

    For FULLY_DAO (mode 2) / FULLY_DAO 模式（模式 2）:
      Checks that content.dao_approved == DAO_APPROVED (1) AND that the
      DAO voting contract script hash appears in tx_info.signatories,
      confirming the DAO contract co-signed this transaction.
      检查 content.dao_approved == DAO_APPROVED（1）且 DAO 投票合约脚本哈希
      出现在 tx_info.signatories 中，确认 DAO 合约联合签名了此交易。

    Returns / 返回:
      True if consensus is verified, False otherwise.
      如果共识已验证则返回 True，否则返回 False。
    """
    if gov.moderation_mode == MODE_AI_PLUS_JURY:
        # Enforce minimum jury quorum floor of MIN_JURY_VOTES (3)
        # 强制最少陪审团法定人数底线 MIN_JURY_VOTES（3）
        effective_threshold: int = gov.jury_threshold
        if effective_threshold < MIN_JURY_VOTES:
            effective_threshold = MIN_JURY_VOTES
        return content.jury_yes_votes >= effective_threshold

    elif gov.moderation_mode == MODE_FULLY_DAO:
        # DAO must have voted to approve AND co-signed this transaction
        # DAO 必须已投票批准 AND 联合签署此交易
        if content.dao_approved != DAO_APPROVED:
            return False
        return gov.dao_voting_contract in tx_info.signatories

    else:
        # Unknown mode or AI_ONLY — community consensus not applicable
        # 未知模式或 AI_ONLY — 社区共识不适用
        return False


def is_content_eligible(
    content: ContentModerationDatum,
    gov: GovernanceConfig,
    tx_info: TxInfo,
) -> bool:
    """
    Check whether content is eligible for approval under the active governance
    mode.  Always applies the hard-reject safety constraint first.

    检查内容是否在当前治理模式下符合批准条件。
    始终首先应用硬性拒绝安全约束。

    Decision tree / 决策树:
      ai_score < 40             → hard reject (ALL modes)
      MODE_AI_ONLY (0)          → eligible iff ai_score >= AI_PASS_THRESHOLD
      MODE_AI_PLUS_JURY (1)     → eligible iff ai_score >= AI_PASS_THRESHOLD
                                   OR verify_community_consensus passes
      MODE_FULLY_DAO (2)        → eligible iff verify_community_consensus passes

    Returns / 返回:
      True if the content may be set to STATUS_APPROVED, False otherwise.
      如果内容可以设置为 STATUS_APPROVED 则返回 True，否则返回 False。
    """
    # ── Hard-reject safety constraint (applies to ALL modes) ──────────────
    # 硬性拒绝安全约束（适用于所有模式）
    if is_hard_reject(content.ai_score):
        return False

    if gov.moderation_mode == MODE_AI_ONLY:
        # ── AI_ONLY: AI score must meet or exceed the pass threshold ──────
        # AI_ONLY：AI 分数必须达到或超过通过阈值
        return content.ai_score >= AI_PASS_THRESHOLD

    elif gov.moderation_mode == MODE_AI_PLUS_JURY:
        # ── AI_PLUS_JURY: AI pass is sufficient; borderline needs jury ────
        # AI_PLUS_JURY：AI 通过即可；边界内容需要陪审团
        if content.ai_score >= AI_PASS_THRESHOLD:
            return True
        # Borderline range (40 <= score < 70): delegate to jury consensus
        # 边界范围（40 <= 分数 < 70）：委托给陪审团共识
        return verify_community_consensus(content, gov, tx_info)

    elif gov.moderation_mode == MODE_FULLY_DAO:
        # ── FULLY_DAO: full community consensus required for all content ──
        # FULLY_DAO：所有内容均需完整社区共识
        return verify_community_consensus(content, gov, tx_info)

    else:
        # Unknown mode — fail safe / 未知模式 — 安全失败
        return False


def upgrade_governance(
    current_config: GovernanceConfig,
    new_mode: int,
    new_jury_threshold: int,
    tx_info: TxInfo,
) -> None:
    """
    Validate a DAO-issued request to upgrade the GovernanceConfig.

    验证 DAO 发起的 GovernanceConfig 升级请求。

    Rules / 规则:
      1. current_config.dao_governance_active must be 1.
         current_config.dao_governance_active 必须为 1。
      2. The DAO voting contract script hash must appear in tx_info.signatories.
         DAO 投票合约脚本哈希必须出现在 tx_info.signatories 中。
      3. new_mode must be 0, 1, or 2.
         new_mode 必须为 0、1 或 2。
      4. new_jury_threshold must be >= MIN_JURY_VOTES (3) when new_mode == 1.
         当 new_mode == 1 时，new_jury_threshold 必须 >= MIN_JURY_VOTES（3）。

    Raises / 抛出:
      AssertionError on any rule violation.
      违反任何规则时抛出 AssertionError。
    """
    # 1. Governance upgrades must be enabled by the DAO
    # 必须由 DAO 启用治理升级
    assert current_config.dao_governance_active == 1, \
        "upgrade_governance: dao_governance_active is 0; upgrades are locked — " \
        "dao_governance_active 为 0；升级已锁定"

    # 2. DAO voting contract must co-sign the transaction
    # DAO 投票合约必须联合签署交易
    assert current_config.dao_voting_contract in tx_info.signatories, \
        "upgrade_governance: DAO voting contract signature required — " \
        "需要 DAO 投票合约签名"

    # 3. new_mode must be a recognised governance mode
    # new_mode 必须是已识别的治理模式
    assert (
        new_mode == MODE_AI_ONLY
        or new_mode == MODE_AI_PLUS_JURY
        or new_mode == MODE_FULLY_DAO
    ), (
        "upgrade_governance: new_mode must be 0 (AI_ONLY), 1 (AI_PLUS_JURY), "
        "or 2 (FULLY_DAO) — "
        "new_mode 必须为 0（AI_ONLY）、1（AI_PLUS_JURY）或 2（FULLY_DAO）"
    )

    # 4. jury_threshold must be adequate when transitioning to AI_PLUS_JURY
    # 过渡到 AI_PLUS_JURY 时 jury_threshold 必须足够
    if new_mode == MODE_AI_PLUS_JURY:
        assert new_jury_threshold >= MIN_JURY_VOTES, \
            "upgrade_governance: new_jury_threshold must be >= 3 for AI_PLUS_JURY mode — " \
            "AI_PLUS_JURY 模式下 new_jury_threshold 必须 >= 3"


def get_governance_config(ref_inputs: List[TxInInfo]) -> GovernanceConfig:
    """
    Locate and return the GovernanceConfig datum from the transaction's
    reference inputs.  The transaction builder is responsible for including
    the correct governance UTxO; the validator accepts the first match found.

    从交易引用输入中定位并返回 GovernanceConfig datum。
    交易构建者负责包含正确的治理 UTxO；验证器接受找到的第一个匹配项。

    Raises / 抛出:
      AssertionError if no GovernanceConfig datum is present.
      如果不存在 GovernanceConfig datum 则抛出 AssertionError。
    """
    for ref_input in ref_inputs:
        out = ref_input.resolved
        d = out.datum
        if isinstance(d, SomeOutputDatum):
            inner = d.datum
            if isinstance(inner, GovernanceConfig):
                return inner
    assert False, (
        "get_governance_config: GovernanceConfig UTxO not found in reference inputs — "
        "在引用输入中未找到 GovernanceConfig UTxO"
    )


def _get_continuing_outputs(context: ScriptContext) -> List[TxOut]:
    """
    Return outputs that are sent back to the current script address.
    返回发送回当前脚本地址的输出。
    """
    # context.purpose is a ScriptPurpose; .script_hash is only accessible when
    # the purpose is Spending, which is always the case for this validator.
    # OpShin's static type checker cannot narrow the union here, so we suppress
    # the warning with type: ignore (consistent with settlement_engine.py).
    own_hash: bytes = context.purpose.script_hash  # type: ignore
    result: List[TxOut] = []
    for o in context.tx_info.outputs:
        cred = o.address.payment_credential
        if isinstance(cred, ScriptCredential):
            if cred.credential_hash == own_hash:
                result = result + [o]
    return result


# ============================================================
# Main Spending Validator / 主花费验证器
# ============================================================

def validator(
    datum: ModerationDatum,
    redeemer: ModerationRedeemer,
    context: ScriptContext,
) -> None:
    """
    EchoForge DAO — Content Moderation Engine Spending Validator

    Routes across two UTxO datum types and four redeemers:

      GovernanceConfig UTxO:
        3. UpgradeGovernance  — DAO-authorised mode switch with signature check

      ContentModerationDatum UTxO (GovernanceConfig loaded from reference inputs):
        0. SubmitContent      — Author submits content; hard-reject gate applied
        1. CastJuryVote       — Juror votes on borderline content (mode 1 only)
        2. FinalizeModeration — Resolve approved/rejected status via is_content_eligible

    Hard-reject (ai_score < 40) is enforced in every applicable code path.

    EchoForge DAO — 内容审核引擎花费验证器

    跨两种 UTxO datum 类型和四种 Redeemer 路由：

      GovernanceConfig UTxO：
        3. UpgradeGovernance  — 带签名检查的 DAO 授权模式切换

      ContentModerationDatum UTxO（GovernanceConfig 从引用输入加载）：
        0. SubmitContent      — 作者提交内容；应用硬性拒绝门
        1. CastJuryVote       — 陪审员对边界内容投票（仅模式 1）
        2. FinalizeModeration — 通过 is_content_eligible 解决批准/拒绝状态

    硬性拒绝（ai_score < 40）在每个适用的代码路径中强制执行。
    """
    tx_info: TxInfo = context.tx_info

    # ==================== GovernanceConfig UTxO ====================
    if isinstance(datum, GovernanceConfig):

        # ── UpgradeGovernance ─────────────────────────────────────────────
        if isinstance(redeemer, UpgradeGovernance):
            # 1. Validate all upgrade rules via dedicated helper
            # 通过专用辅助函数验证所有升级规则
            upgrade_governance(
                datum,
                redeemer.new_mode,
                redeemer.new_jury_threshold,
                tx_info,
            )

            # 2. Exactly one continuing output must carry the updated GovernanceConfig
            # 恰好一个继续输出必须携带更新后的 GovernanceConfig
            own_continuing: List[TxOut] = _get_continuing_outputs(context)
            assert len(own_continuing) == 1, \
                "UpgradeGovernance: exactly one continuing output required — " \
                "需要恰好一个继续输出"

        else:
            # GovernanceConfig UTxOs support only UpgradeGovernance
            # GovernanceConfig UTxO 仅支持 UpgradeGovernance
            assert False, \
                "ContentModerationEngine: GovernanceConfig UTxO supports only " \
                "UpgradeGovernance — " \
                "GovernanceConfig UTxO 仅支持 UpgradeGovernance"

    # ==================== ContentModerationDatum UTxO ====================
    elif isinstance(datum, ContentModerationDatum):

        # ── Load active GovernanceConfig from reference inputs ────────────
        # 从引用输入加载当前 GovernanceConfig
        gov: GovernanceConfig = get_governance_config(tx_info.reference_inputs)

        # ── SubmitContent ─────────────────────────────────────────────────
        if isinstance(redeemer, SubmitContent):
            # 1. Author must sign the transaction / 作者必须签署交易
            assert datum.author in tx_info.signatories, \
                "SubmitContent: author signature required — 需要作者签名"

            # 2. Content ID must be non-empty and match the datum
            # 内容 ID 不能为空且必须与 datum 匹配
            assert len(redeemer.content_id) > 0, \
                "SubmitContent: content_id cannot be empty — 内容 ID 不能为空"
            assert redeemer.content_id == datum.content_id, \
                "SubmitContent: content_id mismatch — 内容 ID 不匹配"

            # 3. AI score must be within valid range / AI 分数必须在有效范围内
            assert redeemer.ai_score >= 0, \
                "SubmitContent: ai_score must be >= 0 — AI 分数必须 >= 0"
            assert redeemer.ai_score <= 100, \
                "SubmitContent: ai_score must be <= 100 — AI 分数必须 <= 100"

            # 4. AI score in redeemer must match the datum record
            # Redeemer 中的 AI 分数必须与 datum 记录匹配
            assert redeemer.ai_score == datum.ai_score, \
                "SubmitContent: ai_score in redeemer does not match datum — " \
                "Redeemer 中的 AI 分数与 datum 不匹配"

            # 5. Hard-reject: ai_score < 40 must always be blocked (ALL modes)
            # 硬性拒绝：ai_score < 40 必须始终被阻止（所有模式）
            assert not is_hard_reject(datum.ai_score), \
                "SubmitContent: ai_score < 40 — hard reject; content blocked " \
                "regardless of governance mode — " \
                "ai_score < 40 — 硬性拒绝；内容无论治理模式如何均被阻止"

            # 6. Datum must be in pending status / Datum 必须处于待处理状态
            assert datum.status == STATUS_PENDING, \
                "SubmitContent: datum must be in STATUS_PENDING — " \
                "Datum 必须处于 STATUS_PENDING 状态"

            # 7. Exactly one continuing output required to carry updated datum
            # 需要恰好一个继续输出来携带更新后的 datum
            own_continuing: List[TxOut] = _get_continuing_outputs(context)
            assert len(own_continuing) == 1, \
                "SubmitContent: exactly one continuing output required — " \
                "需要恰好一个继续输出"

        # ── CastJuryVote ──────────────────────────────────────────────────
        elif isinstance(redeemer, CastJuryVote):
            # 1. Jury votes only valid in AI_PLUS_JURY mode
            # 陪审团投票仅在 AI_PLUS_JURY 模式下有效
            assert gov.moderation_mode == MODE_AI_PLUS_JURY, \
                "CastJuryVote: only valid in AI_PLUS_JURY mode (mode 1) — " \
                "仅在 AI_PLUS_JURY 模式（模式 1）下有效"

            # 2. Content must be queued for jury review
            # 内容必须排队等待陪审团审核
            assert datum.status == STATUS_JURY_QUEUED, \
                "CastJuryVote: content not in STATUS_JURY_QUEUED — " \
                "内容不处于 STATUS_JURY_QUEUED 状态"

            # 3. Content ID must match the datum / 内容 ID 必须与 datum 匹配
            assert redeemer.content_id == datum.content_id, \
                "CastJuryVote: content_id mismatch — 内容 ID 不匹配"

            # 4. Juror must sign the transaction / 陪审员必须签署交易
            assert redeemer.juror in tx_info.signatories, \
                "CastJuryVote: juror signature required — 需要陪审员签名"

            # 5. Hard-reject: jury votes not permitted on hard-rejected content
            # 硬性拒绝：不允许对硬性拒绝内容进行陪审团投票
            assert not is_hard_reject(datum.ai_score), \
                "CastJuryVote: content ai_score < 40 — hard reject; " \
                "jury vote not permitted — " \
                "内容 ai_score < 40 — 硬性拒绝；不允许陪审团投票"

            # 6. Vote must be binary (0 = no, 1 = yes)
            # 投票必须为二进制（0 = 否，1 = 是）
            assert redeemer.vote == 0 or redeemer.vote == 1, \
                "CastJuryVote: vote must be 0 (no) or 1 (yes) — " \
                "投票必须为 0（否）或 1（是）"

            # 7. Exactly one continuing output required to carry updated vote counts
            # 需要恰好一个继续输出来携带更新后的票数
            own_continuing: List[TxOut] = _get_continuing_outputs(context)
            assert len(own_continuing) == 1, \
                "CastJuryVote: exactly one continuing output required — " \
                "需要恰好一个继续输出"

        # ── FinalizeModeration ────────────────────────────────────────────
        elif isinstance(redeemer, FinalizeModeration):
            # 1. Content ID must match the datum / 内容 ID 必须与 datum 匹配
            assert redeemer.content_id == datum.content_id, \
                "FinalizeModeration: content_id mismatch — 内容 ID 不匹配"

            # 2. Content must be in a finalisable status
            # 内容必须处于可最终确定的状态
            assert (
                datum.status == STATUS_PENDING
                or datum.status == STATUS_JURY_QUEUED
            ), (
                "FinalizeModeration: content already finalised (status must be "
                "STATUS_PENDING or STATUS_JURY_QUEUED) — "
                "内容已最终确定（状态必须为 STATUS_PENDING 或 STATUS_JURY_QUEUED）"
            )

            # 3. Hard-reject safety constraint: ai_score < 40 cannot be approved
            # 硬性拒绝安全约束：ai_score < 40 无法被批准
            assert not is_hard_reject(datum.ai_score), \
                "FinalizeModeration: ai_score < 40 — hard reject; " \
                "content cannot be approved regardless of governance mode — " \
                "ai_score < 40 — 硬性拒绝；内容无论治理模式如何均无法被批准"

            # 4. Evaluate eligibility under the active governance mode via
            #    is_content_eligible (which internally calls
            #    verify_community_consensus for modes 1 and 2)
            # 通过 is_content_eligible 根据当前治理模式评估资格
            #（内部对模式 1 和 2 调用 verify_community_consensus）
            assert is_content_eligible(datum, gov, tx_info), \
                "FinalizeModeration: content does not meet eligibility criteria " \
                "for the active governance mode — " \
                "内容不符合当前治理模式的资格标准"

            # 5. Exactly one continuing output required to carry the finalised datum
            # 需要恰好一个继续输出来携带最终确定的 datum
            own_continuing: List[TxOut] = _get_continuing_outputs(context)
            assert len(own_continuing) == 1, \
                "FinalizeModeration: exactly one continuing output required — " \
                "需要恰好一个继续输出"

        else:
            assert False, \
                "ContentModerationEngine: unknown redeemer for ContentModerationDatum — " \
                "ContentModerationDatum 的未知 Redeemer"

    else:
        assert False, \
            "ContentModerationEngine: unknown datum type — 未知 Datum 类型"
