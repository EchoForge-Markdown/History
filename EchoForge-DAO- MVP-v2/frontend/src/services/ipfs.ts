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

function generateMockHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).padStart(44, 'abcdefghijklmnopqrst').slice(0, 44);
}
