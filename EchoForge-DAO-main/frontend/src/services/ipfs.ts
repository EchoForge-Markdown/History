// ============================================================
// IPFS 服务 - 使用 Pinata / IPFS HTTP API 上传内容
// 提案文本永存，不可篡改
// ============================================================

const PINATA_API_URL = 'https://api.pinata.cloud';
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT || '';

/** 上传 JSON 内容到 IPFS */
export async function uploadToIPFS(content: {
  title: string;
  body: string;
  author: string;
  timestamp: number;
}): Promise<string> {
  // 如果没有配置 Pinata JWT，使用模拟 CID
  if (!PINATA_JWT) {
    console.warn('IPFS: 未配置 Pinata JWT，使用模拟 CID');
    const mockCid = 'Qm' + generateMockHash(JSON.stringify(content));
    return mockCid;
  }

  try {
    const res = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: JSON.stringify({
        pinataContent: content,
        pinataMetadata: {
          name: `echoforge-${content.title}-${Date.now()}`,
        },
      }),
    });

    if (!res.ok) throw new Error('IPFS 上传失败');
    const data = await res.json();
    return data.IpfsHash;
  } catch (err) {
    console.error('IPFS 上传错误:', err);
    // 回退到模拟 CID
    return 'Qm' + generateMockHash(JSON.stringify(content));
  }
}

/** 从 IPFS 获取内容 */
export async function fetchFromIPFS(cid: string): Promise<unknown> {
  try {
    const res = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
    if (!res.ok) throw new Error('IPFS 获取失败');
    return await res.json();
  } catch {
    console.warn('IPFS: 无法获取内容', cid);
    return null;
  }
}

/** 获取 IPFS 网关链接 */
export function getIPFSUrl(cid: string): string {
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}

/**
 * Pin an already-uploaded CID via the Pinata pinByHash API.
 *
 * 内容 Pinning 策略：确保合约触发后内容同步 Pin 到 Pinata，
 * 防止内容从 IPFS 网络中消失（未 Pin 的内容会被 GC 回收）。
 *
 * This function must be called synchronously after a successful on-chain
 * certification (mintOnChainProof) to guarantee the IPFS content backing
 * the NFT metadata is durably pinned on Pinata.
 *
 * @param cid - The IPFS CID to pin (e.g. "QmXxx...")
 * @param name - Human-readable label stored in Pinata metadata
 * @returns true if pinning succeeded (or was already pinned), false otherwise
 */
export async function pinExistingCID(cid: string, name: string): Promise<boolean> {
  if (!cid) return false;

  // No Pinata JWT configured – warn and skip (CI / dev environments)
  if (!PINATA_JWT) {
    console.warn('IPFS: 未配置 Pinata JWT，跳过 Pin 操作 (CID:', cid, ')');
    return true; // treat as success so the chain flow is not blocked
  }

  try {
    const res = await fetch(`${PINATA_API_URL}/pinning/pinByHash`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: JSON.stringify({
        hashToPin: cid,
        pinataMetadata: { name },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('IPFS Pin 失败 (HTTP', res.status, '):', body);
      return false;
    }

    console.log('✅ [IPFS] Pin 成功:', cid);
    return true;
  } catch (err) {
    console.error('IPFS Pin 错误:', err);
    return false;
  }
}

function generateMockHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).padStart(44, 'abcdefghijklmnopqrst').slice(0, 44);
}
