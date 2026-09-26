// ============================================================
// Blockfrost API 服务
// 查询链上数据：交易历史、奖池余额、UTxO
// ============================================================

const BLOCKFROST_API_URL = 'https://cardano-preview.blockfrost.io/api/v0';
// 使用环境变量或在此填写你的 Blockfrost API Key
const BLOCKFROST_API_KEY = import.meta.env.VITE_BLOCKFROST_API_KEY || 'your-api-key-here';

const headers = {
  'Content-Type': 'application/json',
  project_id: BLOCKFROST_API_KEY,
};

/** 查询地址余额 */
export async function getAddressBalance(address: string): Promise<number> {
  try {
    const res = await fetch(`${BLOCKFROST_API_URL}/addresses/${address}`, { headers });
    if (!res.ok) return 0;
    const data = await res.json();
    const lovelace = data.amount?.find((a: { unit: string; quantity: string }) => a.unit === 'lovelace');
    return lovelace ? parseInt(lovelace.quantity) : 0;
  } catch {
    console.warn('Blockfrost: 无法获取余额，使用模拟数据');
    return 0;
  }
}

/** 查询地址 UTxO */
export async function getAddressUtxos(address: string) {
  try {
    const res = await fetch(`${BLOCKFROST_API_URL}/addresses/${address}/utxos`, { headers });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

/** 查询交易详情 */
export async function getTransaction(txHash: string) {
  try {
    const res = await fetch(`${BLOCKFROST_API_URL}/txs/${txHash}`, { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** 查询脚本地址的 UTxO（合约奖池） */
export async function getScriptUtxos(scriptAddress: string) {
  try {
    const res = await fetch(`${BLOCKFROST_API_URL}/addresses/${scriptAddress}/utxos`, { headers });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

/** 提交交易到链上 */
export async function submitTransaction(txCbor: string): Promise<string | null> {
  try {
    const bodyBytes = hexToBytes(txCbor);
    const res = await fetch(`${BLOCKFROST_API_URL}/tx/submit`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/cbor' },
      body: bodyBytes as unknown as BodyInit,
    });
    if (!res.ok) {
      const err = await res.json();
      console.error('交易提交失败:', err);
      return null;
    }
    return await res.json();
  } catch {
    return null;
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
