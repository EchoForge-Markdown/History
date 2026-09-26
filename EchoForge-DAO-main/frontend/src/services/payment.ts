// ============================================================
// USDCx / ADA 认证费支付服务
//
// 认证费：前10名 10 USDCx，11名起 20 USDCx（或等值 ADA）
// 平台收 10%，90% 入 DAO 国库
//
// 支持支付方式：
//   - USDCx（USDC 的 Cardano wrapped 版本，native token）
//   - ADA（Cardano 原生代币）
//
// USDCx 在 Cardano 上作为 Native Token 存在，与 ERC-20 的
// Superfluid USDCx 不同，这里指 Cardano Preview 测试网上的
// USDC 等值稳定币（可对接 Wanchain/Axelar 跨链桥）。
//
// MVP 阶段模拟交易构建；生产环境使用 MeshJS Transaction builder。
// ============================================================

export type PaymentMethod = 'USDCx' | 'ADA';

// ============================================================
// 常量
// ============================================================

/**
 * USDCx on Cardano Preview testnet
 * 生产环境替换为 Circle/跨链桥的实际 Policy ID（56 hex chars = 28 bytes）
 */
export const USDCX_POLICY_ID =
  'a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481ef000';

/** USDCx token name（'USDCx' 的 UTF-8 hex = 5553444378） */
export const USDCX_TOKEN_NAME = '5553444378';

/** USDCx 精度（与 USDC 保持 6 位小数） */
export const USDCX_DECIMALS = 6;

/** USDCx 最小单位对应面值（10^6 = 1_000_000）*/
export const USDCX_MINOR_UNIT = 1_000_000;

/**
 * 平台手续费地址（Preview 测试网占位地址，部署前替换为真实合约地址）
 * 格式：addr_test1 + bech32 payload
 */
export const PLATFORM_ADDRESS =
  'addr_test1vpf4wnzpqzpcj8kcaxjz8x8fq4y2xmz8wxmptqvg5xy8hgcqlldmz';

/**
 * DAO 国库地址（Preview 测试网占位地址，部署前替换为真实合约地址）
 * 格式：addr_test1 + bech32 payload
 */
export const DAO_TREASURY_ADDRESS =
  'addr_test1vp8d4fyngvvl3hn7wf06qlhtjazx08zjgwh5m5jvl4q8f9sv7v8am';

/**
 * ADA/USDCx 汇率（生产环境从链上 DEX Oracle 读取）
 * 1 USDCx ≈ 2.86 ADA（约合 0.35 USD/ADA，示例汇率）
 *
 * Integer-scaled representation: 286 / 100 = 2.86
 * Using integer scaling to avoid floating-point precision issues.
 */
const ADA_PER_USDCX_SCALED = 286;   // scaled by 100
const ADA_PER_USDCX_SCALE  = 100;

// ============================================================
// 费用计算
// ============================================================

export interface CertificationFeeInfo {
  method: PaymentMethod;
  /** 支付金额（USDCx 最小单位 或 lovelace） */
  amount: number;
  /** 格式化显示文本 */
  displayAmount: string;
  /** 平台手续费（10%） */
  platformFee: number;
  /** DAO 国库金额（90%） */
  daoAmount: number;
  /** USDCx Policy ID（ADA 支付时为空字符串） */
  usdcxPolicyId: string;
}

/**
 * 计算当前认证费（基于已认证创作者人数）
 *
 * @param creatorCount - 当前已认证创作者人数
 * @param method - 支付方式 USDCx | ADA
 */
export function calculateCertificationFee(
  creatorCount: number,
  method: PaymentMethod,
): CertificationFeeInfo {
  const usdcxFaceValue = creatorCount < 10 ? 10 : 20; // USDCx 面值

  if (method === 'USDCx') {
    const rawAmount = usdcxFaceValue * USDCX_MINOR_UNIT;
    // Integer scaling: use integer division to avoid float rounding errors
    const platformFee = Math.floor(rawAmount * 10 / 100);
    const daoAmount   = rawAmount - platformFee;
    return {
      method,
      amount: rawAmount,
      displayAmount: `${usdcxFaceValue} USDCx`,
      platformFee,
      daoAmount,
      usdcxPolicyId: USDCX_POLICY_ID,
    };
  } else {
    // ADA 等值 — integer-scaled to avoid floating-point imprecision
    // lovelace = usdcxFaceValue * ADA_PER_USDCX_SCALED * 1_000_000 / ADA_PER_USDCX_SCALE
    const lovelace = Math.floor(usdcxFaceValue * ADA_PER_USDCX_SCALED * 1_000_000 / ADA_PER_USDCX_SCALE);
    const adaDisplay = (lovelace / 1_000_000).toFixed(2);
    // Integer scaling: use integer division for fee split
    const platformFee = Math.floor(lovelace * 10 / 100);
    const daoAmount   = lovelace - platformFee;
    return {
      method,
      amount: lovelace,
      displayAmount: `${adaDisplay} ADA`,
      platformFee,
      daoAmount,
      usdcxPolicyId: '',
    };
  }
}

// ============================================================
// 支付执行
// ============================================================

export interface PaymentResult {
  success: boolean;
  txHash?: string;
  error?: string;
  method: PaymentMethod;
  /** 实际支付金额（最小单位） */
  amount: number;
  /** 格式化显示 */
  displayAmount: string;
}

/**
 * 执行认证费支付。
 *
 * MVP 阶段：模拟交易构建，返回模拟 txHash。
 * 生产环境：取消注释 MeshJS 代码块，传入真实 walletApi 进行构建/签名/提交。
 *
 * @param payerAddress - 支付者钱包地址
 * @param creatorCount - 当前已认证创作者人数（决定费用档位）
 * @param method       - 支付方式
 * @param _signFn      - 钱包签名函数（生产环境必须）
 */
export async function payCertificationFee(
  payerAddress: string,
  creatorCount: number,
  method: PaymentMethod,
  _signFn?: (txCbor: string) => Promise<string>,
): Promise<PaymentResult> {
  try {
    const feeInfo = calculateCertificationFee(creatorCount, method);

    // ── 模拟支付延迟 ──────────────────────────────────────────
    await new Promise(r => setTimeout(r, 1200));

    // ── 生产环境：MeshJS 交易构建（解注释并接入真实 API） ──────
    //
    // import { Transaction } from '@meshsdk/core';
    //
    // const tx = new Transaction({ initiator: walletApi });
    //
    // if (method === 'USDCx') {
    //   // 发送 USDCx native token（10% 平台 + 90% DAO 国库）
    //   tx.sendAssets(PLATFORM_ADDRESS, [{
    //     unit: `${USDCX_POLICY_ID}${USDCX_TOKEN_NAME}`,
    //     quantity: String(feeInfo.platformFee),
    //   }]);
    //   tx.sendAssets(DAO_TREASURY_ADDRESS, [{
    //     unit: `${USDCX_POLICY_ID}${USDCX_TOKEN_NAME}`,
    //     quantity: String(feeInfo.daoAmount),
    //   }]);
    // } else {
    //   // 发送 ADA lovelace（10% 平台 + 90% DAO 国库）
    //   tx.sendLovelace(PLATFORM_ADDRESS,    String(feeInfo.platformFee));
    //   tx.sendLovelace(DAO_TREASURY_ADDRESS, String(feeInfo.daoAmount));
    // }
    //
    // // 附加认证元数据（CIP-20 消息）
    // tx.attachMetadata(674, {
    //   msg:    ['EchoForge Creator Certification'],
    //   payer:  payerAddress,
    //   method: method,
    //   amount: feeInfo.displayAmount,
    // });
    //
    // const unsigned = await tx.build();
    // const signed   = await _signFn!(unsigned);
    // const txHash   = await provider.submitTx(signed);

    // ── MVP 模拟 txHash ───────────────────────────────────────
    const txHashBytes = crypto.getRandomValues(new Uint8Array(32));
    const txHash = Array.from(txHashBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    console.log('💳 [Payment] 认证费支付完成:', {
      payer:      payerAddress,
      method,
      amount:     feeInfo.displayAmount,
      platformFee: feeInfo.method === 'ADA'
        ? formatADA(feeInfo.platformFee)
        : formatUSDCx(feeInfo.platformFee),
      daoAmount: feeInfo.method === 'ADA'
        ? formatADA(feeInfo.daoAmount)
        : formatUSDCx(feeInfo.daoAmount),
      txHash,
    });

    return {
      success: true,
      txHash,
      method,
      amount:        feeInfo.amount,
      displayAmount: feeInfo.displayAmount,
    };
  } catch (err) {
    return {
      success: false,
      error:         String(err),
      method,
      amount:        0,
      displayAmount: '0',
    };
  }
}

// ============================================================
// 工具函数
// ============================================================

/**
 * 将 USDCx 最小单位格式化为可读字符串。
 * @example formatUSDCx(10_000_000) → "10.00 USDCx"
 */
export function formatUSDCx(minorUnits: number): string {
  return `${(minorUnits / USDCX_MINOR_UNIT).toFixed(2)} USDCx`;
}

/**
 * 将 lovelace 格式化为 ADA 可读字符串。
 * @example formatADA(2_860_000) → "2.86 ADA"
 */
export function formatADA(lovelace: number): string {
  return `${(lovelace / 1_000_000).toFixed(2)} ADA`;
}
