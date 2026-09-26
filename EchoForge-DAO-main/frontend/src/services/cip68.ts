// ============================================================
// CIP-68 NFT 铸造服务
//
// CIP-68 (https://cips.cardano.org/cip/CIP-0068) 定义了 Cardano
// 链上 NFT 元数据的标准存储格式：
//
//   • (100){name}  — Reference Token，锁定到脚本地址，Datum 中
//                    存储结构化元数据（Constr 0 [Map, version, extra]）
//   • (222){name}  — User NFT Token，发送到用户钱包
//
// Token 名称前缀（4 字节大端序）：
//   100  → 0x00000064
//   222  → 0x000000de
//
// 此服务提供：
//   1. buildCIP68TokenNames() — 生成 (100)/(222) 前缀的 token 名称
//   2. encodeCIP68Datum()     — 将元数据编码为 Plutus Datum (CBOR hex)
//   3. mintCIP68NFT()         — 构建并（模拟）提交链上铸造交易
// ============================================================

import type { CIP68Metadata, CIP68NFTPair } from '../types';
import type { Publication } from '../types';

// ============================================================
// 常量
// ============================================================

/** CIP-68 Reference Token 标签 (100) */
const CIP68_LABEL_100 = 100;
/** CIP-68 User NFT Token 标签 (222) */
const CIP68_LABEL_222 = 222;

/**
 * 4 字节大端序标签前缀
 * 按 CIP-68 规范：token name = uint32_be(label) ++ bytes(name)
 */
function labelBytes(label: number): string {
  const buf = new ArrayBuffer(4);
  new DataView(buf).setUint32(0, label, false /* big-endian */);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ============================================================
// 公共工具函数
// ============================================================

/**
 * 给定基础名称（UTF-8），生成 CIP-68 token 名称对。
 *
 * @example
 * buildCIP68TokenNames('EchoForge_001')
 * // → { ref: '00000064456368...', user: '000000de456368...' }
 */
export function buildCIP68TokenNames(baseName: string): {
  ref: string;   // (100){baseName} hex
  user: string;  // (222){baseName} hex
} {
  const nameHex = Array.from(new TextEncoder().encode(baseName))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return {
    ref:  labelBytes(CIP68_LABEL_100) + nameHex,
    user: labelBytes(CIP68_LABEL_222) + nameHex,
  };
}

/**
 * 将 UTF-8 字符串转换为十六进制（用于 CBOR 编码中的 ByteString）
 */
function strToHex(s: string): string {
  return Array.from(new TextEncoder().encode(s))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 将 CIP-68 元数据对象编码为链上 Datum 的 CBOR-hex 表示。
 *
 * CIP-68 Datum 结构（Plutus Data）：
 *   Constr 0 [
 *     Map { ByteString → Data },   // 元数据字段
 *     Integer 1,                    // 版本号
 *   ]
 *
 * 这里返回一个"人类可读"的 JSON 对象，用于调试和 Blockfrost API；
 * 真实链上部署时应使用 MeshJS / cardano-serialization-lib 的 CBOR 编码器。
 */
export function encodeCIP68Datum(metadata: CIP68Metadata): {
  json: object;
  /** CBOR hex placeholder（真实部署时由 SDK 生成） */
  cborHex: string;
} {
  // 构建 Plutus Data Map (key = ByteString, value = ByteString/Int)
  const fields: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(metadata)) {
    if (v === undefined || v === null) continue;
    const keyHex  = strToHex(k);
    const valHex  = typeof v === 'string'  ? strToHex(v) :
                    typeof v === 'number'  ? v.toString(16).padStart(2, '0') :
                    strToHex(String(v));
    fields.push([keyHex, valHex]);
  }

  // Plutus Data JSON（Cardano JSON schema for off-chain display）
  const json = {
    constructor: 0,
    fields: [
      {
        map: fields.map(([k, v]) => ({
          k: { bytes: k },
          v: { bytes: v },
        })),
      },
      { int: 1 },  // version
    ],
  };

  // 简化 CBOR hex（前缀 d87980 表示 Constr 0，仅供演示）
  // 真实部署时使用 @meshsdk/core 的 resolveTxHash 或 cardano-serialization-lib
  const metaHex = strToHex(JSON.stringify(metadata)).slice(0, 64);
  const cborHex = `d87980${metaHex}`;

  return { json, cborHex };
}

// ============================================================
// CIP-68 铸造主函数
// ============================================================

/**
 * 铸造一个 CIP-68 NFT 对：
 *   - (100){name} Reference Token → 脚本地址（含元数据 Datum）
 *   - (222){name} User NFT Token  → 用户钱包地址
 *
 * MVP 阶段：在 Blockfrost Preview 网络上模拟构建交易并返回铸造记录。
 * 真实部署时，将 `_walletSignFn` 替换为 `walletApi.signTx` 并通过
 * Blockfrost 提交。
 *
 * @param publication - 已审核通过的内容发布记录
 * @param authorAddress - 接收 User NFT 的钱包地址
 * @param refScriptAddress - Reference Token 的目标脚本地址
 * @param _walletSignFn - 钱包签名函数（可选，MVP 下为 undefined）
 */
export async function mintCIP68NFT(
  publication: Publication,
  authorAddress: string,
  refScriptAddress?: string,
  _walletSignFn?: (txCbor: string) => Promise<string>,
): Promise<{ success: boolean; nft?: CIP68NFTPair; error?: string }> {
  try {
    // 1. 生成基础 token 名称
    const baseName = `EchoForge_${publication.id}`;
    const { ref: refTokenName, user: userTokenName } = buildCIP68TokenNames(baseName);

    // 2. 生成 policy id（MVP: 随机模拟；生产环境从 cardano-cli 脚本编译获取）
    const policyId = Array.from(crypto.getRandomValues(new Uint8Array(28)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // 3. 构建 CIP-68 元数据
    const metadata: CIP68Metadata = {
      name:        publication.title,
      image:       publication.ipfsCid
                     ? `ipfs://${publication.ipfsCid}`
                     : 'ipfs://QmPlaceholder',
      mediaType:   'text/plain',
      description: publication.content.slice(0, 256),
      author:      publication.author,
      ipfsCid:     publication.ipfsCid || '',
      approvedAt:  Math.floor(Date.now() / 1000),
      category:    publication.category,
      referralCode: publication.referralCode,
    };

    // 4. 编码 Datum
    const { json: datumJson, cborHex: datumCbor } = encodeCIP68Datum(metadata);

    // 5. MVP 模拟交易构建（生产环境替换为 MeshJS Transaction builder）
    //
    //   const mesh = new Transaction({ initiator: walletInstance });
    //   mesh
    //     .mintAsset(mintingScript, { assetName: refTokenName, quantity: '1' })
    //     .mintAsset(mintingScript, { assetName: userTokenName, quantity: '1' })
    //     .sendAssets(refScriptAddress, [{ unit: policyId+refTokenName, quantity: '1' }],
    //                 { datum: { value: datumJson, inline: true } })
    //     .sendAssets(authorAddress,    [{ unit: policyId+userTokenName, quantity: '1' }]);
    //   const unsignedTx = await mesh.build();
    //   const signedTx   = await walletSignFn(unsignedTx);
    //   const txHash     = await provider.submitTx(signedTx);

    console.log('🎖️ [CIP-68] 铸造 NFT 对:', {
      policyId,
      refTokenName,
      userTokenName,
      refScriptAddress: refScriptAddress || 'addr_script_placeholder',
      datumJson,
      datumCbor,
    });

    // 模拟交易哈希
    const txHashBytes = crypto.getRandomValues(new Uint8Array(32));
    const txHash = Array.from(txHashBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const nft: CIP68NFTPair = {
      policyId,
      refTokenName,
      userTokenName,
      refScriptAddress: refScriptAddress || 'addr_test1wp_echoforge_ref_script',
      metadata,
      txHash,
      mintedAt: Math.floor(Date.now() / 1000),
    };

    return { success: true, nft };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * 验证一个 token 名称是否符合 CIP-68 标签前缀规范。
 */
export function isCIP68Token(tokenNameHex: string, label: 100 | 222): boolean {
  const prefix = labelBytes(label);
  return tokenNameHex.startsWith(prefix);
}

/**
 * 从 CIP-68 token 名称（hex）中提取基础名称（UTF-8）。
 */
export function extractBaseName(tokenNameHex: string): string {
  // 去掉 4 字节（8 hex 字符）的标签前缀
  const nameHex = tokenNameHex.slice(8);
  const bytes = new Uint8Array(nameHex.length / 2);
  for (let i = 0; i < nameHex.length; i += 2) {
    bytes[i / 2] = parseInt(nameHex.substring(i, i + 2), 16);
  }
  return new TextDecoder().decode(bytes);
}
