import streamlit as st
import pandas as pd
from datetime import datetime, timedelta
import hashlib

# 模拟数据存储：用session state模拟状态
if 'window_open' not in st.session_state:
    st.session_state.window_open = False
if 'proposals' not in st.session_state:
    st.session_state.proposals = []
if 'votes' not in st.session_state:
    st.session_state.votes = {}
if 'voting_end' not in st.session_state:
    st.session_state.voting_end = None
if 'pot' not in st.session_state:
    st.session_state.pot = 0.0
if 'author_share' not in st.session_state:
    st.session_state.author_share = 50
if 'current_chapter' not in st.session_state:
    st.session_state.current_chapter = ""

# 模拟NFT空投：简单生成唯一ID
def generate_nft(voter_id):
    return hashlib.md5(f"{voter_id}_{datetime.now()}".encode()).hexdigest()[:8]

# 主页面
st.title("StoryForge DAO MVP - 链上故事共创原型")
st.markdown("**13岁初中生Charles Tao的极简MVP** - 模拟原作者开窗、投票、分钱。无真实合约，纯Web2展示效果。")

# 侧边栏：导航
tab1, tab2, tab3, tab4, tab5 = st.tabs(["1. 原作者开窗", "2. 提交提案", "3. 读者投票", "4. 查看结果", "5. 模拟结算"])

with tab1:
    st.header("Step 1: 原作者一键开窗")
    if not st.session_state.window_open:
        st.info("不开窗 = 主线100%归你。开窗 = 额外50%奖池 + 社区热度暴涨！")
        chapter = st.text_input("为第X章/本卷结局开放共创：", placeholder="e.g., 第5章结局")
        author_share = st.slider("你的分成比例 (%)", 40, 60, 50)
        if st.button("🔓 一键开窗（不可撤销）", type="primary"):
            st.session_state.window_open = True
            st.session_state.current_chapter = chapter
            st.session_state.author_share = author_share
            st.session_state.voting_end = datetime.now() + timedelta(days=7)  # 模拟7天投票
            st.success(f"✅ 已开窗！章节：{chapter}，分成：原作者 {author_share}% | 二创者 30% | 平台 20%。投票截止：{st.session_state.voting_end}")
    else:
        st.success(f"🚀 窗口已开！章节：{st.session_state.current_chapter}，投票截止：{st.session_state.voting_end}")

with tab2:
    st.header("Step 2: 二创者提交提案")
    if st.session_state.window_open:
        st.info("提交你的续写/结局提案（文字 + 简单封面描述）。")
        proposal_text = st.text_area("提案内容（故事续写）：", placeholder="e.g., 英雄选择牺牲，故事转向黑暗结局...")
        cover_desc = st.text_input("NFT封面描述：", placeholder="e.g., 黑暗英雄插图")
        creator_name = st.text_input("你的名字：", placeholder="e.g., 二创大神")
        if st.button("📝 提交提案"):
            proposal_id = len(st.session_state.proposals)
            st.session_state.proposals.append({
                'id': proposal_id,
                'text': proposal_text,
                'cover': cover_desc,
                'creator': creator_name,
                'votes': 0.0
            })
            st.success(f"✅ 提案 #{proposal_id} 已提交！等待读者投票。")
            st.rerun()
        # 显示已提交提案
        if st.session_state.proposals:
            df = pd.DataFrame(st.session_state.proposals)
            st.dataframe(df[['id', 'creator', 'cover', 'votes']])
    else:
        st.warning("❌ 窗口未开，无法提交。去Tab1开窗！")

with tab3:
    st.header("Step 3: 读者投票（用钱投票才是真爱）")
    if st.session_state.window_open and st.session_state.proposals:
        st.info(f"当前奖池：{st.session_state.pot} ADA | 截止：{st.session_state.voting_end}")
        if datetime.now() < st.session_state.voting_end:
            col1, col2 = st.columns(2)
            with col1:
                # 直接把 proposal dict 作为选项，并用 format_func 显示友好文本，避免字符串解析错误
                selected_proposal = st.selectbox(
                    "选择提案投票：",
                    st.session_state.proposals,
                    format_func=lambda p: f"#{p['id']} - {p.get('creator','')}: {p.get('cover','')[:50]}..."
                )
            with col2:
                # 保留小数（ADA 可为小数），但在计数和奖池中使用 float
                vote_amount = st.number_input("投票ADA金额（1ADA=1票）：", min_value=0.1, value=1.0, step=0.1, format="%.2f")
            voter_name = st.text_input("你的ID（匿名OK）：", placeholder="e.g., 读者001")
            if st.button("🗳️ 投票 & 入奖池", type="primary"):
                # 模拟投票：selected_proposal 已经是提案对象
                prop_id = selected_proposal['id']
                # 使用 float 累加票数，允许小数 ADA
                st.session_state.votes[prop_id] = st.session_state.votes.get(prop_id, 0.0) + float(vote_amount)
                # 同步更新 proposals 列表中对应提案的 votes 字段
                for p in st.session_state.proposals:
                    if p['id'] == prop_id:
                        p['votes'] = st.session_state.votes[prop_id]
                        break
                st.session_state.pot += float(vote_amount)
                nft_id = generate_nft(voter_name)
                st.success(f"✅ 投票成功！你的票数：{vote_amount} | NFT徽章ID: {nft_id} | 专属角色卡已空投（情绪价值+1）")
                st.balloons()  # 庆祝效果
                st.rerun()
        else:
            st.error("⏰ 投票已结束！去Tab4查看结果。")
    else:
        st.warning("❌ 无窗口或无提案，无法投票。")

with tab4:
    st.header("Step 4: 查看当前结果")
    if st.session_state.proposals:
        df = pd.DataFrame(st.session_state.proposals)
        df['total_votes'] = df['id'].apply(lambda x: st.session_state.votes.get(x, 0))
        st.dataframe(df.sort_values('total_votes', ascending=False))
        if st.session_state.pot > 0:
            st.metric("当前奖池", f"{st.session_state.pot} ADA")
    else:
        st.info("暂无提案。")

with tab5:
    st.header("Step 5: 模拟结算（投票结束自动执行）")
    if st.session_state.window_open and st.session_state.proposals and datetime.now() >= st.session_state.voting_end:
        # 找胜者
        winner = max(st.session_state.proposals, key=lambda p: p['votes'])
        total_pot = st.session_state.pot
        author_payout = total_pot * (st.session_state.author_share / 100)
        creator_payout = total_pot * 0.30
        platform_payout = total_pot * 0.20
        st.success(f"🏆 胜出提案：#{winner['id']} by {winner['creator']}！\n官方分支：Secondary Canon + {winner['creator']}署名")
        st.markdown("### 分钱结果（智能合约自动执行）：")
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("原作者躺赚", f"{author_payout:.2f} ADA")
        with col2:
            st.metric("二创者暴富", f"{creator_payout:.2f} ADA")
        with col3:
            st.metric("平台维护", f"{platform_payout:.2f} ADA")
        st.info("所有投票者已获NFT空投 + 缔造者称号。没赢的二创者获荣誉NFT。")
        if st.button("🔄 重置模拟（新轮）"):
            st.session_state.window_open = False
            st.session_state.proposals = []
            st.session_state.votes = {}
            st.session_state.pot = 0
            st.rerun()
    else:
        st.info("⏳ 等待投票结束... 或去其他Tab操作。")

# 页脚
st.markdown("---")
st.markdown("*MVP说明：纯Python+Streamlit模拟，无真实链上交互。运行：`pip install streamlit pandas`，然后`streamlit run this_file.py`。未来上Cardano主网！*")
st.caption("By Charles Tao, 13yo Web3 Dreamer 🚀")