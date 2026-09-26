import streamlit as st
import pandas as pd
from datetime import datetime
import hashlib

# ==================== 初始化数据（解决空页面警告） ====================
if 'contents' not in st.session_state:
    st.session_state.contents = [
        {'id': 0, 'title': 'AI投资新趋势2026', 'type': '科技教程', 'creator': 'Charles Tao', 'text': '摘要：...', 'royalty': 0.0},
        {'id': 1, 'title': '比特币减半后该怎么玩', 'type': '投资分析', 'creator': '爸爸', 'text': '摘要：...', 'royalty': 0.0}
    ]
if 'promotions' not in st.session_state:
    st.session_state.promotions = {0: 45.0, 1: 28.0}
if 'total_pot' not in st.session_state:
    st.session_state.total_pot = 73.0

def generate_share_link(cid):
    return f"https://echoforge.app/share/{cid}"

def generate_nft(user):
    return hashlib.md5(f"{user}_{datetime.now()}".encode()).hexdigest()[:8]

# ==================== 主页面 ====================
st.title("🔨 EchoForge DAO")
st.markdown("**区块链内容重塑者** | 14岁初中生 Charles Tao | 先做广义平台，后合并 StoryForge 子模块")

# 仪表盘（解决空页面警告 + 好看）
col1, col2, col3 = st.columns(3)
with col1:
    st.metric("已上链内容", len(st.session_state.contents), "2")
with col2:
    st.metric("总奖池", f"{st.session_state.total_pot:.1f} ADA", "↑12.5")
with col3:
    st.metric("活跃粉丝", "47", "↑8")

st.progress(0.68, text="平台健康度 68%（测试数据）")

# ==================== Tab 导航 ====================
tab1, tab2, tab3, tab4 = st.tabs(["📤 1. 创作者上传", "🚀 2. 粉丝宣传", "💰 3. 实时分成", "🔮 4. StoryForge 子模块"])

with tab1:
    st.header("一键上传内容（链上永生保护）")
    title = st.text_input("内容标题", "Web3创业者的第一步")
    content_type = st.selectbox("内容类型", ["科技教程", "投资分析", "文学故事", "搞笑meme"])
    text = st.text_area("内容摘要（或链接）", "这是我的第一篇链上内容...")
    creator = st.text_input("创作者名字", "Charles Tao")
    
    if st.button("📤 上传到区块链（不可篡改）", type="primary"):
        cid = len(st.session_state.contents)
        st.session_state.contents.append({
            'id': cid, 'title': title, 'type': content_type, 
            'creator': creator, 'text': text[:80] + "...", 'royalty': 0.0
        })
        st.success(f"✅ 内容 #{cid} 已上链！分享链接：{generate_share_link(cid)}")
        st.balloons()
        st.rerun()

with tab2:
    st.header("粉丝宣传（行动=赚钱）")
    if st.session_state.contents:
        options = [f"#{c['id']} {c['title']} ({c['creator']})" for c in st.session_state.contents]
        selected = st.selectbox("选择要宣传的内容", options)
        try:
            cid = int(selected.split('#')[1].split()[0])
        except (IndexError, ValueError):
            st.error("内容选择有误，请重新选择。")
            st.stop()
        fan = st.text_input("你的粉丝ID", "小明粉丝")
        
        if st.button("🚀 立即宣传并赚分成", type="primary"):
            earnings = 8.0
            st.session_state.total_pot += earnings
            st.session_state.promotions[cid] = st.session_state.promotions.get(cid, 0) + earnings
            nft = generate_nft(fan)
            st.success(f"✅ 宣传成功！分成 {earnings} ADA 已到账 | NFT徽章: {nft}")
            st.balloons()
            st.rerun()

with tab3:
    st.header("实时分成面板")
    df = pd.DataFrame(st.session_state.contents)
    df['已宣传金额'] = df['id'].apply(lambda x: st.session_state.promotions.get(x, 0))
    st.dataframe(df[['id', 'title', 'creator', '已宣传金额']], use_container_width=True)
    
    st.metric("平台总奖池", f"{st.session_state.total_pot:.1f} ADA")
    
    if st.button("💰 一键结算（模拟智能合约）"):
        for item in st.session_state.contents:
            earned = st.session_state.promotions.get(item['id'], 0)
            if earned > 0:
                author = earned * 0.7
                fan = earned * 0.2
                platform = earned * 0.1
                st.write(f"📘 {item['title']}：作者得 {author:.1f} | 粉丝得 {fan:.1f} | 平台得 {platform:.1f}")
        st.success("✅ 智能合约已自动分账！")

with tab4:
    st.header("StoryForge 子模块（已预留）")
    st.success("✅ 随时可合并！只需加一个开关按钮：\n\n“开启文学共创模式” → 进入原 StoryForge 投票系统")
    st.info("当前EchoForge已可独立运行，合并后零冲突。")

# 页脚
st.markdown("---")
st.caption("EchoForge DAO MVP v1.1 | 纯Python模拟 | 运行命令：`streamlit run echoforge_mvp.py`")
st.caption("By Charles Tao（继承爸爸梦想）🚀")