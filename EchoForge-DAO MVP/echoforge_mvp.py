import streamlit as st
import pandas as pd
from datetime import datetime
import hashlib

# 初始化
if 'contents' not in st.session_state:
    st.session_state.contents = []
if 'promotions' not in st.session_state:
    st.session_state.promotions = {}
if 'pot' not in st.session_state:
    st.session_state.pot = 0.0

def generate_share_link(content_id):
    return f"https://echoforge.app/share/{content_id}"

def generate_nft(user_id):
    return hashlib.md5(f"{user_id}_{datetime.now()}".encode()).hexdigest()[:8]

st.title("EchoForge DAO MVP - 区块链内容重塑者")
st.markdown("**14岁初中生 Charles Tao** | 先做广义平台，后合并StoryForge子模块")

tab1, tab2, tab3, tab4 = st.tabs(["1. 创作者上传", "2. 粉丝宣传", "3. 查看分成", "4. StoryForge子模块预览"])

with tab1:
    st.header("Step 1: 一键上传内容（链上永生保护）")
    title = st.text_input("内容标题", placeholder="e.g. AI投资新趋势2026")
    content_type = st.selectbox("内容类型", ["科技教程", "投资分析", "文学故事", "搞笑meme"])
    text = st.text_area("内容正文（或链接）")
    creator = st.text_input("你的名字", placeholder="Charles Tao")
    
    if st.button("📤 上传到区块链（不可篡改）", type="primary"):
        cid = len(st.session_state.contents)
        st.session_state.contents.append({
            'id': cid, 'title': title, 'type': content_type, 
            'creator': creator, 'text': text[:100] + "...", 'royalty': 0.0
        })
        st.success(f"✅ 内容 #{cid} 已上链！分享链接已生成 → {generate_share_link(cid)}")
        st.rerun()

with tab2:
    st.header("Step 2: 粉丝宣传（行动赚钱）")
    if st.session_state.contents:
        content_list = [f"#{c['id']} - {c['title']} ({c['creator']})" for c in st.session_state.contents]
        selected = st.selectbox("选择要宣传的内容", content_list)
        cid = int(selected.split(' #')[1])
        fan_name = st.text_input("你的粉丝ID", "粉丝小明")
        action = st.selectbox("宣传方式", ["转发X", "朋友圈分享", "评论区安利"])
        
        if st.button("🚀 宣传并赚分成", type="primary"):
            earnings = 5.0  # 模拟每次宣传赚5U
            st.session_state.pot += earnings
            st.session_state.promotions[cid] = st.session_state.promotions.get(cid, 0) + earnings
            nft = generate_nft(fan_name)
            st.success(f"✅ 宣传成功！分成到账 {earnings} ADA | NFT徽章: {nft}")
            st.balloons()
            st.rerun()
    else:
        st.info("先去Tab1上传内容吧~")

with tab3:
    st.header("Step 3: 实时分成面板")
    if st.session_state.contents:
        df = pd.DataFrame(st.session_state.contents)
        df['promoted'] = df['id'].apply(lambda x: st.session_state.promotions.get(x, 0))
        st.dataframe(df[['id', 'title', 'creator', 'promoted']])
        st.metric("平台总奖池", f"{st.session_state.pot:.1f} ADA")
        
        # 自动结算示例
        if st.button("💰 模拟结算（智能合约执行）"):
            for item in st.session_state.contents:
                promoted = st.session_state.promotions.get(item['id'], 0)
                if promoted > 0:
                    author_get = promoted * 0.7
                    fan_get = promoted * 0.2
                    platform_get = promoted * 0.1
                    st.write(f"📘 {item['title']}：作者得{author_get:.1f} | 粉丝得{fan_get:.1f} | 平台得{platform_get:.1f}")
            st.success("智能合约已自动分账！")

with tab4:
    st.header("StoryForge 子模块（未来合并）")
    st.info("目前预留位置。MVP上线后，我们只需加一个开关：\n\n“开启文学共创模式” → 进入原StoryForge投票机制")
    st.success("✅ 合并方案已准备好：零代码冲突，随时上线！")

st.markdown("---")
st.caption("EchoForge DAO MVP v1.0 | 纯Web2模拟 | 运行命令：streamlit run echoforge_mvp.py")
st.caption("By Charles Tao + 爸爸的传承 🚀")