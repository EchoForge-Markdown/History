# EchoForge DAO - 智能合约

## 概述
使用 **OpShin** (Python-like Plutus) 编写的 Cardano 智能合约。

## 合约功能

### Datum (链上存储)
- `WindowDatum`: 存储开窗参数（创建者、分成比例、截止时间、奖池金额）

### Redeemer (交易动作)
| 动作 | 说明 | 权限 |
|------|------|------|
| `Vote` | 为提案投票 | 任何人（截止前） |
| `Settle` | 执行结算分账 | 创建者（截止后） |
| `Cancel` | 取消开窗 | 仅创建者 |

### 安全特性
- ✅ 防止重入攻击（UTxO 模型天然防重入）
- ✅ ADA 溢出检查（分账总额 ≤ 奖池）
- ✅ 截止时间验证
- ✅ 签名验证
- ✅ 分成比例验证（±1 lovelace 舍入容差）

## 编译与部署

### 前置要求
```bash
pip install opshin
```

### 编译合约
```bash
opshin build spending echoforge.py
```

### 部署到 Preview 测试网
```bash
# 1. 生成脚本地址
cardano-cli address build \
  --payment-script-file echoforge.plutus \
  --testnet-magic 2 \
  --out-file script.addr

# 2. 锁定 ADA 到脚本（开窗）
cardano-cli transaction build \
  --tx-in <UTXO> \
  --tx-out $(cat script.addr)+<AMOUNT> \
  --tx-out-datum-embed-file datum.json \
  --change-address <YOUR_ADDR> \
  --testnet-magic 2 \
  --out-file tx.raw

# 3. 签名并提交
cardano-cli transaction sign --tx-body-file tx.raw --signing-key-file payment.skey --out-file tx.signed
cardano-cli transaction submit --tx-file tx.signed --testnet-magic 2
```

## CIP-68 NFT 元数据
结算后铸造的 NFT 遵循 CIP-68 标准：
```json
{
  "name": "EchoForge Winner Badge",
  "description": "内容征集胜出者徽章",
  "author": "<winner_name>",
  "window_title": "<window_title>",
  "votes": <total_votes>,
  "ipfs_cid": "<content_ipfs_hash>"
}
```
