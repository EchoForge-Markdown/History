"""
============================================================
EchoForge DAO — Co-Creation Module  (OpShin / Plutus)
共同创建模块                          (OpShin / Plutus)
Module de co-création                (OpShin / Plutus)
Módulo de co-creación                (OpShin / Plutus)

English
-------
This spending validator implements the "Co-Creation" feature of EchoForge DAO.
Only addresses that have purchased a valid Promotion Package (≥ 5 ADA) may
submit or vote on co-creation proposals for a specific piece of content.
Contribution scores are weighted by package value and verified voting activity.
A strict 10 % platform fee is enforced on every finalization payout, consistent
with the EchoForge revenue-split model.

中文
------
本花费验证器实现 EchoForge DAO 的"共同创建"功能。
只有成功购买有效"推广包"（价值 ≥ 5 ADA）的地址才能对特定内容的共创提案进行
提交（submit_proposal）或投票（vote_on_proposal）。
贡献/影响力得分由包金额（基础分）和已验证的共创投票数（奖励分）共同决定。
每次提案结算时强制扣取 10% 平台手续费，与 EchoForge 主合约分成逻辑保持一致。

Français
---------
Ce validateur de dépenses implémente la fonctionnalité "Co-création" d'EchoForge DAO.
Seules les adresses ayant acheté un Pack de promotion valide (≥ 5 ADA) peuvent
soumettre ou voter sur des propositions de co-création pour un contenu donné.
Le score de contribution est calculé à partir de la valeur du pack (score de base)
et du nombre de votes de co-création vérifiés (score bonus).
Une commission de 10 % est strictement imposée lors de chaque finalisation.

Español
--------
Este validador de gasto implementa la función "Co-creación" de EchoForge DAO.
Solo las direcciones que hayan adquirido un Paquete de Promoción válido (≥ 5 ADA)
pueden enviar o votar propuestas de co-creación para un contenido específico.
La puntuación de contribución se calcula a partir del valor del paquete (puntuación
base) y el número de votos de co-creación verificados (puntuación bonus).
Se aplica estrictamente una comisión del 10 % de la plataforma en cada liquidación.

Flow / 流程 / Flux / Flujo
---------------------------
  1. PurchasePackage   → Lock ≥ 5 ADA; receive PromotionPackageDatum UTxO
  2. SubmitProposal    → Package holder submits co-creation proposal
  3. VoteOnProposal    → Package holder casts weighted vote (package locked to content)
  4. FinalizeProposal  → Close voting; distribute 10 % platform fee
  5. ReclaimPackage    → Reclaim locked ADA from an unused package

Build / 编译:
  opshin build spending co_creation.py
============================================================
"""

from opshin.prelude import *


# ============================================================
# Constants / 常量 / Constantes / Constantes
# ============================================================

# Minimum lovelace required for a valid Promotion Package (5 ADA)
# 推广包最低金额（5 ADA = 5,000,000 lovelace）
# Montant minimum en lovelace pour un Pack de promotion valide (5 ADA)
# Cantidad mínima de lovelace para un Paquete de Promoción válido (5 ADA)
MIN_PACKAGE_LOVELACE: int = 5_000_000

# Platform fee percentage enforced on every finalization payout
# 每次提案结算时平台强制扣取的手续费比例
# Pourcentage de commission de la plateforme appliqué à chaque règlement
# Porcentaje de comisión de plataforma aplicado en cada liquidación
PLATFORM_FEE_PERCENT: int = 10

# Base contribution score per package unit (1 unit = 5 ADA)
# 每包单位（5 ADA）的基础贡献分
# Score de contribution de base par unité de pack (1 unité = 5 ADA)
# Puntuación de contribución base por unidad de paquete (1 unidad = 5 ADA)
BASE_SCORE_UNIT: int = 100

# Bonus score awarded per verified co-creation vote on an active proposal
# 每次在活跃提案上投出的共创票所获得的奖励分
# Score bonus attribué par vote de co-création vérifié sur une proposition active
# Puntuación bonus otorgada por cada voto de co-creación verificado en propuesta activa
VOTE_BONUS: int = 50

# Maximum number of shards per content session.
# Bounds the shard_id to [0, MAX_SHARDS) ensuring off-chain aggregators
# have a predictable and finite number of shards to query.
# 每个内容会话的最大分片数。将 shard_id 限制在 [0, MAX_SHARDS) 范围内，
# 确保链下聚合器需要查询的分片数有上限且可预测。
# Nombre maximum de shards par session de contenu (limite supérieure connue).
# Número máximo de fragmentos por sesión de contenido.
MAX_SHARDS: int = 16


# ============================================================
# Datum Types / Datum 类型 / Types de Datum / Tipos de Datum
# ============================================================

@dataclass()
class CoCreationStateDatum(PlutusData):
    """
    Main state UTxO for a co-creation session bound to a specific content piece.

    EN: Tracks the content identifier, session status, aggregate proposal/vote
        counters, and the total platform fees collected so far.  The list of
        authorised package holders is stored implicitly: every PromotionPackageDatum
        UTxO at the script address with a matching content_id IS an authorised holder.
        Off-chain indexers reconstruct the full list by querying those UTxOs.

    ZH: 跟踪内容 ID、会话状态、提案/投票汇总计数，以及迄今收取的平台手续费。
        授权推广包持有人列表隐式存储——脚本地址上所有 content_id 匹配的
        PromotionPackageDatum UTxO 即构成授权持有人列表，可通过链下索引器查询。

    FR: Suit l'identifiant du contenu, le statut de la session, les compteurs
        agrégés de propositions/votes, et les commissions cumulées.
        La liste des détenteurs autorisés est stockée implicitement via les UTxO
        PromotionPackageDatum portant le même content_id au niveau de l'adresse script.

    ES: Rastrea el ID del contenido, estado de sesión, contadores de propuestas/votos
        y las comisiones acumuladas.  La lista de titulares autorizados se almacena
        implícitamente: todos los UTxO de PromotionPackageDatum con content_id
        coincidente en la dirección del script son titulares autorizados.
    """
    CONSTR_ID = 0

    content_id: bytes           # IPFS CID or on-chain content identifier / 内容 ID
    author: bytes               # Content author PubKeyHash / 作者 PubKeyHash
    status: int                 # 0 = open / 1 = closed  |  0=开放 / 1=已关闭
    total_proposals: int        # Number of proposals submitted / 已提交提案数
    total_votes: int            # Total votes cast / 总投票数
    total_packages: int         # Count of purchased packages / 已购推广包数量
    platform_fee_collected: int # Cumulative platform fees in lovelace / 累计平台手续费
    # ── Sharding support / 分片支持 ──────────────────────────────────────────
    # Multiple state UTxOs with different shard_ids can exist concurrently for the
    # same content_id, eliminating the single-UTxO contention bottleneck.
    # Off-chain aggregators sum counters across all shards before finalization.
    # 同一 content_id 可同时存在多个具有不同 shard_id 的状态 UTxO，
    # 消除单 UTxO 并发瓶颈。链下聚合器在结算前跨分片求和计数器。
    shard_id: int               # Shard index (0 = primary) / 分片索引（0 = 主分片）


@dataclass()
class PromotionPackageDatum(PlutusData):
    """
    Represents a purchased Promotion Package — the on-chain voting credential.

    EN: Each UTxO carrying this datum at the script address represents one
        authorised voter for the associated content_id.  The package is
        permanently bound to a single content_id, preventing the same package
        from being used to vote on proposals for DIFFERENT content (the core
        anti-double-vote constraint described in the spec).
        has_voted = 0 → unused; has_voted = 1 → already consumed for a vote.

    ZH: 脚本地址上持有此 datum 的每个 UTxO 代表一位针对对应 content_id 的
        授权投票人。包永久绑定到单一 content_id，防止同一包被用于不同内容的
        提案投票（核心防重复投票约束）。
        has_voted = 0 → 未使用；has_voted = 1 → 已用于投票。

    FR: Chaque UTxO portant ce datum représente un votant autorisé pour le
        content_id associé.  Le pack est lié de façon permanente à un seul
        content_id, empêchant qu'il soit réutilisé pour voter sur des propositions
        appartenant à un AUTRE contenu.
        has_voted = 0 → inutilisé ; has_voted = 1 → déjà utilisé pour un vote.

    ES: Cada UTxO que lleva este datum representa un votante autorizado para el
        content_id asociado.  El paquete está vinculado permanentemente a un único
        content_id, impidiendo que se utilice para votar propuestas de OTRO contenido.
        has_voted = 0 → sin usar; has_voted = 1 → ya utilizado para un voto.
    """
    CONSTR_ID = 1

    holder: bytes           # Package purchaser PubKeyHash / 购买者 PubKeyHash
    content_id: bytes       # Content this package is permanently bound to / 绑定的内容 ID
    amount: int             # Lovelace paid (must be >= MIN_PACKAGE_LOVELACE) / 已付 lovelace
    package_id: bytes       # Unique identifier for this package / 包唯一标识符
    has_voted: int          # 0 = not yet voted; 1 = vote consumed / 0=未投票; 1=已投票
    verified_votes: int     # Verified co-creation votes cast by this holder / 已验证共创投票数
    # ── Sharding support / 分片支持 ──────────────────────────────────────────
    # The shard_id routes this package's operations to the matching CoCreationStateDatum
    # shard, allowing concurrent purchases/votes without UTxO contention.
    # 分片路由：将此包的操作路由到匹配的 CoCreationStateDatum 分片，
    # 允许并发购买/投票而不产生 UTxO 争用。
    shard_id: int           # Shard index matching the state UTxO / 匹配状态 UTxO 的分片索引


@dataclass()
class ProposalDatum(PlutusData):
    """
    On-chain state of a co-creation proposal.

    EN: Accumulates weighted yes/no votes.  total_weight is the sum of all
        vote weights (derived from calculate_contribution_score).
        status: 0 = active, 1 = approved, 2 = rejected.
        platform_fee_due stores the 10 % platform fee that MUST be paid
        when the proposal is finalized.

    ZH: 累计加权赞成/反对票数。total_weight 是所有投票权重之和
        （由 calculate_contribution_score 计算得出）。
        status: 0=活跃, 1=已通过, 2=已拒绝。
        platform_fee_due 存储提案结算时必须支付的 10% 平台手续费（lovelace）。

    FR: Accumule les votes pondérés pour/contre.  total_weight est la somme de
        tous les poids de vote (issus de calculate_contribution_score).
        status : 0 = actif, 1 = approuvé, 2 = rejeté.
        platform_fee_due stocke la commission de 10 % à payer lors de la finalisation.

    ES: Acumula votos ponderados a favor/en contra.  total_weight es la suma de
        todos los pesos de voto (calculados por calculate_contribution_score).
        status: 0 = activo, 1 = aprobado, 2 = rechazado.
        platform_fee_due almacena la comisión del 10 % que debe pagarse al finalizar.
    """
    CONSTR_ID = 2

    proposal_id: bytes          # Unique proposal identifier / 提案唯一标识符
    content_id: bytes           # Associated content / 关联内容 ID
    proposer: bytes             # Proposer PubKeyHash / 提案人 PubKeyHash
    description_hash: bytes     # IPFS CID of proposal description / 提案描述 IPFS CID
    yes_votes: int              # Weighted yes-vote total / 加权赞成票总数
    no_votes: int               # Weighted no-vote total / 加权反对票总数
    total_weight: int           # Sum of all vote weights / 所有投票权重之和
    status: int                 # 0=active / 1=approved / 2=rejected
    platform_fee_due: int       # 10 % platform fee in lovelace / 平台手续费 (lovelace)


# Union datum type recognised by this validator
# 此验证器识别的联合 Datum 类型
CoCreationDatum = Union[CoCreationStateDatum, PromotionPackageDatum, ProposalDatum]


# ============================================================
# Redeemer Types / Redeemer 类型 / Types de Redeemer / Tipos de Redeemer
# ============================================================

@dataclass()
class PurchasePackage(PlutusData):
    """
    Lock ≥ 5 ADA to obtain a Promotion Package (voting credential).
    锁定 ≥ 5 ADA 以获得推广包（投票凭证）。
    Verrouillez ≥ 5 ADA pour obtenir un Pack de promotion (justificatif de vote).
    Bloquee ≥ 5 ADA para obtener un Paquete de Promoción (credencial de voto).
    """
    CONSTR_ID = 0

    content_id: bytes   # Content to bind this package to / 绑定的内容 ID
    package_id: bytes   # Unique package identifier / 唯一包标识符


@dataclass()
class SubmitProposal(PlutusData):
    """
    Submit a co-creation proposal.  Caller must hold a valid Promotion Package
    for the target content_id.
    提交共创提案，调用者必须持有目标内容的有效推广包。
    Soumettre une proposition de co-création.  L'appelant doit détenir un Pack
    de promotion valide pour le content_id cible.
    Enviar una propuesta de co-creación.  El llamante debe poseer un Paquete de
    Promoción válido para el content_id objetivo.
    """
    CONSTR_ID = 1

    proposal_id: bytes          # Unique proposal identifier / 提案唯一 ID
    content_id: bytes           # Target content / 目标内容 ID
    description_hash: bytes     # IPFS CID of proposal description / 提案描述 IPFS CID


@dataclass()
class VoteOnProposal(PlutusData):
    """
    Cast a weighted vote on an active proposal using a Promotion Package as
    credential.  The package must be bound to the same content_id as the
    proposal (prevents cross-content double-voting).
    使用推广包作为凭证对活跃提案进行加权投票。包必须与提案绑定同一 content_id
    （防止对不同内容的跨内容重复投票）。
    Voter sur une proposition active avec un Pack de promotion comme justificatif.
    Le pack doit être lié au même content_id que la proposition.
    Emitir un voto ponderado sobre una propuesta activa con un Paquete de Promoción
    como credencial.  El paquete debe estar vinculado al mismo content_id.
    """
    CONSTR_ID = 2

    proposal_id: bytes  # Proposal to vote on / 投票对象提案 ID
    content_id: bytes   # Must match datum.content_id (anti-cross-content guard) / 必须匹配包的 content_id
    vote: int           # 1 = yes (赞成) | 0 = no (反对)


@dataclass()
class FinalizeProposal(PlutusData):
    """
    Close an active proposal and distribute the mandatory 10 % platform fee.
    关闭活跃提案并分配强制性 10% 平台手续费。
    Clore une proposition active et distribuer la commission obligatoire de 10 %.
    Cerrar una propuesta activa y distribuir la comisión obligatoria del 10 %.
    """
    CONSTR_ID = 3

    proposal_id: bytes      # Proposal to finalize / 结算提案 ID
    total_payout: int       # Total ADA to distribute in lovelace / 总分配 ADA (lovelace)
    platform_amount: int    # Must equal 10 % of total_payout / 必须等于总额的 10%
    platform_address: bytes # Platform treasury PubKeyHash / 平台国库 PubKeyHash


@dataclass()
class ReclaimPackage(PlutusData):
    """
    Reclaim the locked ADA from a Promotion Package that has NOT been used for
    voting (has_voted == 0).  Only the original holder may reclaim.
    取回尚未用于投票（has_voted == 0）的推广包中锁定的 ADA，仅原始持有人可执行。
    Récupérer les ADA verrouillés d'un Pack de promotion inutilisé (has_voted == 0).
    Recuperar los ADA bloqueados de un Paquete de Promoción no utilizado (has_voted == 0).
    """
    CONSTR_ID = 4

    package_id: bytes   # Package to reclaim / 待回收包 ID


# Union redeemer type
# 联合 Redeemer 类型
CoCreationRedeemer = Union[
    PurchasePackage,
    SubmitProposal,
    VoteOnProposal,
    FinalizeProposal,
    ReclaimPackage,
]


# ============================================================
# Helper Functions / 辅助函数 / Fonctions utilitaires / Funciones auxiliares
# ============================================================

def calculate_contribution_score(package_amount: int, verified_vote_count: int) -> int:
    """
    Calculate a holder's contribution/influence score.
    计算持有人的贡献/影响力得分。
    Calcule le score de contribution/influence d'un détenteur de pack.
    Calcula la puntuación de contribución/influencia de un titular de paquete.

    Score composition / 得分构成 / Composition du score / Composición de la puntuación:

      base_score  = (package_amount // MIN_PACKAGE_LOVELACE) * BASE_SCORE_UNIT
                    ↳ Paid interaction weight per EchoForge logic
                    ↳ 根据 EchoForge 当前逻辑的付费互动权重
                    ↳ Pondération des interactions payantes selon la logique EchoForge
                    ↳ Peso de interacción pagada según la lógica de EchoForge

      bonus_score = verified_vote_count * VOTE_BONUS
                    ↳ Reward for verified co-creation votes on active proposals
                    ↳ 针对活跃提案的已验证共创投票奖励分
                    ↳ Récompense pour les votes de co-création vérifiés sur des propositions actives
                    ↳ Recompensa por votos de co-creación verificados en propuestas activas

      total_score = base_score + bonus_score

    Args:
      package_amount      : Amount paid in lovelace for the Promotion Package
                            / 推广包支付的 lovelace 金额
      verified_vote_count : Number of verified co-creation votes cast by this holder
                            / 此持有人已投出的经过验证的共创投票数

    Returns:
      Influence score (integer) / 影响力得分（整数）
    """
    base_score: int = (package_amount // MIN_PACKAGE_LOVELACE) * BASE_SCORE_UNIT  # package value weight
    bonus_score: int = verified_vote_count * VOTE_BONUS
    return base_score + bonus_score


def is_valid_package(amount: int) -> bool:
    """
    Return True if the package amount meets the 5 ADA minimum.
    若包金额满足 5 ADA 最低要求则返回 True。
    Retourne True si le montant du pack respecte le minimum de 5 ADA.
    Devuelve True si el monto del paquete cumple el mínimo de 5 ADA.
    """
    return amount >= MIN_PACKAGE_LOVELACE


def platform_fee_of(total: int) -> int:
    """
    Compute the mandatory 10 % platform fee from a total payout amount.
    从总支付金额中计算强制性 10% 平台手续费。
    Calcule la commission obligatoire de 10 % sur un montant total versé.
    Calcula la comisión obligatoria del 10 % sobre un monto total de pago.
    """
    return total * PLATFORM_FEE_PERCENT // 100


def get_continuing_outputs(context: ScriptContext) -> List[TxOut]:
    """
    Return all transaction outputs sent back to the current script address.
    返回所有发送回当前脚本地址的交易输出。
    Retourne toutes les sorties de transaction renvoyées à l'adresse script courante.
    Devuelve todas las salidas de transacción enviadas de vuelta a la dirección del script actual.
    """
    own_hash = context.purpose.script_hash  # type: ignore
    return [
        o for o in context.tx_info.outputs
        if o.address.payment_credential == ScriptCredential(own_hash)
    ]


def get_lovelace(value: Value) -> int:
    """
    Extract the ADA (lovelace) amount from a Plutus Value.
    从 Plutus Value 中提取 ADA (lovelace) 金额。
    Extrait le montant ADA (lovelace) d'une valeur Plutus.
    Extrae el monto ADA (lovelace) de un valor Plutus.

    In the eUTXO model, lovelace is stored at value[b''][b''].
    在 eUTXO 模型中，lovelace 存储于 value[b''][b'']。
    """
    if b'' in value:
        ada_tokens = value[b'']
        if b'' in ada_tokens:
            return ada_tokens[b'']
    return 0


def abs_val(x: int) -> int:
    """Absolute value / 绝对值 / Valeur absolue / Valor absoluto."""
    if x < 0:
        return -x
    return x


# ============================================================
# Spending Validator / 花费验证器 / Validateur de dépenses / Validador de gasto
# ============================================================

def validator(
    datum: CoCreationDatum,
    redeemer: CoCreationRedeemer,
    context: ScriptContext,
) -> None:
    """
    EchoForge DAO Co-Creation Spending Validator
    EchoForge DAO 共同创建花费验证器
    Validateur de dépenses de co-création EchoForge DAO
    Validador de gasto de co-creación EchoForge DAO

    Validation rules / 验证规则 / Règles de validation / Reglas de validación:

    PurchasePackage
      EN: Holder signs; amount ≥ 5 ADA; content_id and package_id match datum;
          has_voted must be 0; at least one continuing output to the script.
          Sharding: the package's shard_id is used to route concurrent transactions
          to different state UTxOs, preventing single-UTxO contention.
      ZH: 持有人签名；金额 ≥ 5 ADA；content_id 和 package_id 与 datum 匹配；
          has_voted 必须为 0；至少一个继续输出到脚本地址。
          分片：包的 shard_id 用于将并发交易路由到不同的状态 UTxO，防止单 UTxO 争用。

    SubmitProposal
      EN: Datum must be PromotionPackageDatum; holder signs; package amount ≥ 5 ADA;
          package content_id matches proposal content_id; non-empty description hash.
      ZH: Datum 必须是 PromotionPackageDatum；持有人签名；包金额 ≥ 5 ADA；
          包的 content_id 与提案 content_id 一致；描述哈希非空。

    VoteOnProposal
      EN: Datum must be PromotionPackageDatum; holder signs; package ≥ 5 ADA;
          has_voted == 0 (prevents consuming an already-used package);
          package content_id MUST match redeemer content_id (anti-cross-content guard);
          vote value is 0 or 1; continuing output exists (package re-locked as voted).
      ZH: Datum 必须是 PromotionPackageDatum；持有人签名；包 ≥ 5 ADA；
          has_voted == 0（防止重复使用已用包）；包的 content_id 必须与 redeemer
          的 content_id 匹配（防跨内容投票核心约束）；投票值为 0 或 1；
          继续输出存在（包以已投票状态重新锁定）。

    FinalizeProposal
      EN: Datum must be ProposalDatum with status == 0 (active); proposal_id matches;
          platform_amount == 10 % of total_payout (±1 lovelace rounding tolerance);
          platform treasury receives at least platform_amount in lovelace.
      ZH: Datum 必须是 status == 0 的 ProposalDatum（活跃状态）；proposal_id 匹配；
          platform_amount == total_payout 的 10%（允许 ±1 lovelace 舍入误差）；
          平台国库至少收到 platform_amount lovelace。

    ReclaimPackage
      EN: Datum must be PromotionPackageDatum; original holder signs; package_id matches.
      ZH: Datum 必须是 PromotionPackageDatum；原始持有人签名；package_id 匹配。
    """
    tx_info = context.tx_info

    # ── PurchasePackage ──────────────────────────────────────────────────────
    if isinstance(redeemer, PurchasePackage):
        # Datum must be a PromotionPackageDatum
        # Datum 必须是 PromotionPackageDatum
        assert isinstance(datum, PromotionPackageDatum), \
            "PurchasePackage: datum must be PromotionPackageDatum"

        # Package holder must sign the transaction
        # 包持有人必须签署交易
        assert datum.holder in tx_info.signatories, \
            "PurchasePackage: package holder must sign"

        # Package amount must satisfy the minimum of 5 ADA
        # 包金额必须满足最低 5 ADA 要求
        assert is_valid_package(datum.amount), \
            "PurchasePackage: amount must be >= 5 ADA (5,000,000 lovelace)"

        # content_id in datum must match the redeemer
        # datum 中的 content_id 必须与 redeemer 匹配
        assert datum.content_id == redeemer.content_id, \
            "PurchasePackage: datum content_id must match redeemer content_id"

        # package_id in datum must match the redeemer
        # datum 中的 package_id 必须与 redeemer 匹配
        assert datum.package_id == redeemer.package_id, \
            "PurchasePackage: datum package_id must match redeemer package_id"

        # New package must start in the unvoted state
        # 新包必须以未投票状态开始
        assert datum.has_voted == 0, \
            "PurchasePackage: has_voted must be 0 for a new package"

        # ── Sharding: validate shard_id is within valid range ───────────────
        # ── 分片：验证 shard_id 在有效范围内 ────────────────────────────────
        # A valid shard_id in [0, MAX_SHARDS) ensures this package is routed
        # to a valid state shard, supporting concurrent UTxO access without
        # contention.  The upper bound prevents unbounded IDs that could
        # complicate off-chain aggregation.
        # 有效的 shard_id 在 [0, MAX_SHARDS) 范围内，确保此包被路由到有效的
        # 状态分片，支持无争用的并发 UTxO 访问。上限防止无界 ID 使链下聚合复杂化。
        assert datum.shard_id >= 0, \
            "PurchasePackage: shard_id must be >= 0"
        assert datum.shard_id < MAX_SHARDS, \
            "PurchasePackage: shard_id must be < MAX_SHARDS (16)"

        # Package UTxO must be (re-)locked at the script address
        # 包 UTxO 必须（重新）锁定在脚本地址
        own_outputs = get_continuing_outputs(context)
        assert len(own_outputs) >= 1, \
            "PurchasePackage: package UTxO must be locked at the script address"

    # ── SubmitProposal ────────────────────────────────────────────────────────
    elif isinstance(redeemer, SubmitProposal):
        # Authorization: datum must be a Promotion Package (the voting credential)
        # 授权：datum 必须是推广包（投票凭证）
        assert isinstance(datum, PromotionPackageDatum), \
            "SubmitProposal: caller must hold a PromotionPackageDatum (voting credential)"

        # Package holder must sign
        # 包持有人必须签名
        assert datum.holder in tx_info.signatories, \
            "SubmitProposal: package holder must sign to submit a proposal"

        # Package must be valid (≥ 5 ADA)
        # 包必须有效（≥ 5 ADA）
        assert is_valid_package(datum.amount), \
            "SubmitProposal: package amount must be >= 5 ADA to submit proposals"

        # Package must be bound to the same content as the proposal
        # 包必须与提案绑定同一内容
        assert datum.content_id == redeemer.content_id, \
            "SubmitProposal: package content_id must match proposal content_id"

        # Proposal ID must be non-empty
        # 提案 ID 不能为空
        assert len(redeemer.proposal_id) > 0, \
            "SubmitProposal: proposal_id must not be empty"

        # Description hash must be non-empty (references IPFS content)
        # 描述哈希不能为空（引用 IPFS 内容）
        assert len(redeemer.description_hash) > 0, \
            "SubmitProposal: description_hash (IPFS CID) must not be empty"

    # ── VoteOnProposal ────────────────────────────────────────────────────────
    elif isinstance(redeemer, VoteOnProposal):
        # Authorization: datum must be a Promotion Package
        # 授权：datum 必须是推广包
        assert isinstance(datum, PromotionPackageDatum), \
            "VoteOnProposal: caller must hold a PromotionPackageDatum (voting credential)"

        # Package holder must sign
        # 包持有人必须签名
        assert datum.holder in tx_info.signatories, \
            "VoteOnProposal: package holder must sign to vote"

        # Package must be valid (≥ 5 ADA)
        # 包必须有效（≥ 5 ADA）
        assert is_valid_package(datum.amount), \
            "VoteOnProposal: package amount must be >= 5 ADA to vote"

        # ── Core anti-double-vote constraint (spec requirement §4) ──────────
        # ── 核心防重复投票约束（规范要求第4条） ──────────────────────────────
        # The package must NOT have been used for voting yet.
        # 包不得已用于投票。
        assert datum.has_voted == 0, \
            "VoteOnProposal: package already consumed for a vote — double vote prevented"

        # ── Core anti-cross-content constraint (spec requirement §4) ────────
        # ── 核心防跨内容投票约束（规范要求第4条） ─────────────────────────────
        # The package's content_id MUST match the proposal's content_id.
        # This ensures votes are locked to the specific content promotion package
        # and cannot be used to vote on proposals for different content.
        # 包的 content_id 必须与提案的 content_id 匹配，确保投票权锁定在
        # 特定内容推广包中，防止对不同内容重复投票。
        assert datum.content_id == redeemer.content_id, \
            "VoteOnProposal: package not bound to this content — cross-content vote prevented"

        # Vote value must be binary (1 = yes / 0 = no)
        # 投票值必须是二元（1=赞成 / 0=反对）
        assert redeemer.vote == 0 or redeemer.vote == 1, \
            "VoteOnProposal: vote must be 0 (no) or 1 (yes)"

        # ── Sharding: validate shard_id is within valid range ───────────────
        # ── 分片：验证 shard_id 在有效范围内 ────────────────────────────────
        # Ensures this vote is consistently routed to its designated state shard,
        # avoiding contention with votes on other shards.  The upper bound
        # prevents unbounded IDs that could complicate off-chain aggregation.
        # 确保此投票被一致地路由到其指定状态分片，避免与其他分片的投票产生争用。
        # 上限防止无界 ID 使链下聚合复杂化。
        assert datum.shard_id >= 0, \
            "VoteOnProposal: shard_id must be >= 0"
        assert datum.shard_id < MAX_SHARDS, \
            "VoteOnProposal: shard_id must be < MAX_SHARDS (16)"

        # Continuing output must exist so the package is re-locked with has_voted = 1.
        # Off-chain code is responsible for constructing the updated datum.
        # 继续输出必须存在，以便包以 has_voted = 1 重新锁定。
        # 链下代码负责构建更新后的 datum。
        own_outputs = get_continuing_outputs(context)
        assert len(own_outputs) >= 1, \
            "VoteOnProposal: must produce a continuing output re-locking the package with has_voted=1"

    # ── FinalizeProposal ──────────────────────────────────────────────────────
    elif isinstance(redeemer, FinalizeProposal):
        # Datum must be a ProposalDatum
        # Datum 必须是 ProposalDatum
        assert isinstance(datum, ProposalDatum), \
            "FinalizeProposal: datum must be ProposalDatum"

        # Proposal must currently be active (status == 0)
        # 提案必须处于活跃状态（status == 0）
        assert datum.status == 0, \
            "FinalizeProposal: only active proposals can be finalized"

        # proposal_id must match the datum
        # proposal_id 必须与 datum 匹配
        assert datum.proposal_id == redeemer.proposal_id, \
            "FinalizeProposal: proposal_id mismatch"

        # ── Strict 10 % platform fee validation ──────────────────────────────
        # ── 严格 10% 平台手续费验证 ───────────────────────────────────────────
        # platform_amount must equal exactly 10 % of total_payout
        # (allow ±1 lovelace rounding tolerance, same as SplitRevenue in echoforge.py)
        # platform_amount 必须等于 total_payout 的 10%
        # （允许 ±1 lovelace 舍入误差，与 echoforge.py 中的 SplitRevenue 保持一致）
        expected_platform: int = platform_fee_of(redeemer.total_payout)
        assert abs_val(redeemer.platform_amount - expected_platform) <= 1, \
            "FinalizeProposal: platform fee must be exactly 10% of total_payout"

        # Verify that the platform treasury address receives at least platform_amount
        # 验证平台国库地址至少收到 platform_amount
        platform_received: int = 0
        for output in tx_info.outputs:
            cred = output.address.payment_credential
            if isinstance(cred, PubKeyCredential):
                if cred.credential_hash == redeemer.platform_address:
                    platform_received = platform_received + get_lovelace(output.value)

        assert platform_received >= redeemer.platform_amount, \
            "FinalizeProposal: platform treasury must receive the full 10% platform fee"

    # ── ReclaimPackage ────────────────────────────────────────────────────────
    elif isinstance(redeemer, ReclaimPackage):
        # Datum must be a PromotionPackageDatum
        # Datum 必须是 PromotionPackageDatum
        assert isinstance(datum, PromotionPackageDatum), \
            "ReclaimPackage: datum must be PromotionPackageDatum"

        # Only the original holder may reclaim
        # 仅原始持有人可取回
        assert datum.holder in tx_info.signatories, \
            "ReclaimPackage: only the original package holder can reclaim"

        # package_id must match
        # package_id 必须匹配
        assert datum.package_id == redeemer.package_id, \
            "ReclaimPackage: package_id mismatch"

    else:
        # Unknown redeemer type
        # 未知 redeemer 类型
        assert False, "Unknown co-creation action"
