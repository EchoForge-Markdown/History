/* ═══════════════════════════════════════════════
   PERSONAL OS — MAIN SCRIPT
   Fade-in observer · Cursor · Smooth interactions
   Module Panel · Charts · Timeline · Essays
   ═══════════════════════════════════════════════ */

'use strict';

/* ═══════════════════════════════════════════════
   i18n — Language state
   ═══════════════════════════════════════════════ */
let LANG = localStorage.getItem('lang') || 'en';

/** Return the right-language string */
const t = (en, zh) => LANG === 'zh' ? zh : en;

/** Apply language to all [data-en] / [data-zh] elements */
function applyLang() {
  document.querySelectorAll('[data-en]').forEach(el => {
    el.textContent = LANG === 'zh' ? el.dataset.zh : el.dataset.en;
  });
  const btn = document.getElementById('lang-toggle');
  if (btn) btn.textContent = LANG === 'zh' ? 'EN' : '中文';
  document.documentElement.lang = LANG === 'zh' ? 'zh' : 'en';
}

/* ═══════════════════════════════════════════════
   THEME — Dark / Light / Auto (system)
   ═══════════════════════════════════════════════ */

// 'dark' | 'light' | 'auto'
// 'auto' = follow system prefers-color-scheme (default when no saved pref)
let THEME = localStorage.getItem('theme') || 'auto';

const _sysDark = window.matchMedia('(prefers-color-scheme: dark)');

/** Resolve which actual palette to render given current THEME + system */
function _resolvedTheme() {
  if (THEME === 'auto') return _sysDark.matches ? 'dark' : 'light';
  return THEME;
}

function applyTheme(theme) {
  THEME = theme;
  const resolved = _resolvedTheme();
  const icon     = document.getElementById('theme-icon');

  // Apply palette
  if (resolved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }

  // Update icon
  if (icon) {
    icon.className =
      theme === 'auto'  ? 'fa-solid fa-circle-half-stroke' :
      theme === 'light' ? 'fa-solid fa-sun' :
                          'fa-solid fa-moon';
    // tooltip so user knows the current state
    const btn = icon.closest('button');
    if (btn) {
      btn.title =
        theme === 'auto'  ? 'Theme: Auto (following system)' :
        theme === 'light' ? 'Theme: Light' :
                            'Theme: Dark';
    }
  }

  if (theme === 'auto') {
    localStorage.removeItem('theme'); // no override; follow system
  } else {
    localStorage.setItem('theme', theme);
  }
}

// Cycle: dark → light → auto → dark …
function cycleTheme() {
  const next = THEME === 'dark' ? 'light' : THEME === 'light' ? 'auto' : 'dark';
  applyTheme(next);
}

// Re-apply when OS switches color scheme (only effective in 'auto' mode)
_sysDark.addEventListener('change', () => {
  if (THEME === 'auto') applyTheme('auto');
});

// Apply saved/default theme immediately (before paint)
applyTheme(THEME);

// ── Intersection Observer: fade-in on scroll ──
const fadeEls = document.querySelectorAll('.fade-in');

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.08,
    rootMargin: '0px 0px -40px 0px',
  }
);

// Trigger hero elements immediately on load
window.addEventListener('DOMContentLoaded', () => {
  fadeEls.forEach((el) => observer.observe(el));

  // Force hero section elements visible after short delay
  const heroFadeEls = document.querySelectorAll('.hero .fade-in');
  heroFadeEls.forEach((el, i) => {
    setTimeout(() => el.classList.add('visible'), 80 + i * 130);
  });

  initPanel();
  initAckModal();
});

// ── Nav: add border on scroll ──
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 10) {
    nav.style.borderBottomColor = 'rgba(255,255,255,0.12)';
  } else {
    nav.style.borderBottomColor = 'transparent';
  }
}, { passive: true });

// ── Smooth anchor scroll ──
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (e) => {
    const href = anchor.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    const navH = document.querySelector('.nav')?.offsetHeight ?? 56;
    window.scrollTo({
      top: target.getBoundingClientRect().top + window.scrollY - navH - 24,
      behavior: 'smooth',
    });
  });
});

// ── Live clock in status text ──
const statusText = document.querySelector('.status-text');
if (statusText) {
  const updateTime = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    statusText.textContent = `System online — ${hh}:${mm}:${ss}`;
  };
  updateTime();
  setInterval(updateTime, 1000);
}

// ── Module card: subtle tilt on mouse move ──
document.querySelectorAll('.module-card').forEach((card) => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width  - 0.5) * 6;
    const y = ((e.clientY - rect.top)  / rect.height - 0.5) * 6;
    card.style.transform = `perspective(600px) rotateX(${-y}deg) rotateY(${x}deg)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg)';
    card.style.transition = 'transform 0.45s ease, background 0.25s ease, border-color 0.25s ease';
  });
  card.addEventListener('mouseenter', () => {
    card.style.transition = 'transform 0.08s ease, background 0.25s ease, border-color 0.25s ease';
  });
});

/* ═══════════════════════════════════════════════
   MODULE PANEL SYSTEM
   ═══════════════════════════════════════════════ */

function initAckModal() {
  const modal     = document.getElementById('ack-modal');
  const openBtn   = document.getElementById('ack-open-btn');
  const closeBtn  = document.getElementById('ack-modal-close');
  const backdrop  = document.getElementById('ack-modal-backdrop');
  if (!modal) return;

  const openAck = () => {
    applyLang();
    modal.classList.add('ack-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };
  const closeAck = () => {
    modal.classList.remove('ack-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  if (openBtn)  openBtn.addEventListener('click', openAck);
  if (closeBtn) closeBtn.addEventListener('click', closeAck);
  if (backdrop) backdrop.addEventListener('click', closeAck);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAck(); });
}

/* ═══════════════════════════════════════════════
   MODULE PANEL SYSTEM
   ═══════════════════════════════════════════════ */

// ── Data ──────────────────────────────────────

const PROJECTS = [
  {
    num: '01',
    name: 'Height App',        name_zh: 'Height App',
    status: 'LIVE',            status_zh: '已上线',
    summary: 'A web tool for height unit conversion and BMI calculations. Built with Flask and served via Docker.',
    summary_zh: '身高单位换算与 BMI 计算的网页工具，基于 Flask 构建，通过 Docker 部署。',
    tags: ['Python', 'Flask', 'Docker', 'Web'],
    url: '#',
    detail: `# Height App\n\n**Status:** LIVE\n**Stack:** Python · Flask · Docker · Web\n\n## Overview\nHeight App is a lightweight web tool for height unit conversion between cm, feet/inches, and meters. It also provides BMI calculations with visual indicators, helping users understand their health metrics in a clear, structured format.\n\n## Features\n- Height unit conversion: cm ↔ ft/in ↔ m\n- BMI calculation and classification (Underweight / Normal / Overweight / Obese)\n- Clean, minimal web interface\n- Dockerized deployment for portability\n\n## Tech Stack\nBuilt with Python and Flask for the backend, with a minimal HTML/CSS frontend. Deployed via Docker on a cloud platform.\n\n## Key Learnings\nThis was my first deployed web application — a practical exercise in building, containerizing, and deploying a full-stack Python web service.`,
    detail_zh: `# Height App\n\n**状态：** 已上线\n**技术栈：** Python · Flask · Docker · Web\n\n## 概览\nHeight App 是一款轻量级网页工具，支持 cm、英尺/英寸、米之间的身高单位换算，并提供 BMI 计算和可视化分类，帮助用户清晰了解自身健康指标。\n\n## 功能\n- 身高单位换算：cm ↔ 英尺/英寸 ↔ 米\n- BMI 计算与分类（偏轻 / 正常 / 超重 / 肥胖）\n- 简洁极简的网页界面\n- Docker 容器化部署，便于迁移\n\n## 技术栈\n后端采用 Python + Flask 构建，前端为极简 HTML/CSS 页面，通过 Docker 部署至云平台。\n\n## 核心收获\n这是我第一个正式部署的网页应用——一次从构建到容器化、再到完整部署全链路 Python Web 服务的实践。`,
  },
  {
    num: '02',
    name: 'StoryForge DAO',     name_zh: 'StoryForge DAO',
    status: 'BETA',             status_zh: '测试版',
    summary: 'A decentralized autonomous organization platform for collaborative storytelling and co-authorship.',
    summary_zh: '面向协作创作与联合著作的去中心化自治组织平台。',
    tags: ['Blockchain', 'DAO', 'Web3'],
    url: '#',
    detail: `# StoryForge DAO\n\n**Status:** BETA\n**Stack:** Blockchain · DAO · Web3\n\n## Overview\nStoryForge DAO is a decentralized autonomous organization built for collaborative storytelling. Writers, editors, and readers co-govern the platform through token-based voting, deciding which stories get published, funded, and distributed.\n\n## Vision\nThe traditional publishing model is centralized and gatekept. StoryForge DAO flips this model by giving creative power back to the community — any contributor can propose, vote on, and earn from the ecosystem.\n\n## Features\n- Decentralized governance via smart contracts\n- Collaborative co-authorship framework\n- Token-based voting and revenue sharing\n- On-chain publishing records\n\n## Status\nCurrently in BETA phase, refining governance mechanics and smart contract architecture.`,
    detail_zh: `# StoryForge DAO\n\n**状态：** 测试版\n**技术栈：** 区块链 · DAO · Web3\n\n## 概览\nStoryForge DAO 是一个面向协作创作的去中心化自治组织。作者、编辑与读者通过代币投票共同治理平台，决定哪些故事得以发布、获得资助并广泛传播。\n\n## 愿景\n传统出版模式高度中心化且存在门槛。StoryForge DAO 将创作权归还给社区——任何贡献者都可以发起提案、参与投票并从生态中获益。\n\n## 功能\n- 基于智能合约的去中心化治理\n- 协作共著框架\n- 代币投票与收益分配机制\n- 链上出版记录\n\n## 当前状态\n目前处于 BETA 阶段，正在完善治理机制与智能合约架构。`,
  },
  {
    num: '03',
    name: 'EchoForge DAO',      name_zh: 'EchoForge DAO',
    status: 'MVP',              status_zh: 'MVP',
    summary: 'An AI-powered content echo system built as a DAO. Enables structured knowledge amplification across nodes.',
    summary_zh: '以 DAO 形式构建的 AI 内容回响系统，实现跨节点的结构化知识放大。',
    tags: ['AI', 'DAO', 'Python', 'Streamlit'],
    url: 'https://discord.gg/8tjzmjQmpW',
    detail: `# EchoForge DAO\n\n**Status:** MVP\n**Stack:** AI · DAO · Python · Streamlit\n\n## Overview\nEchoForge DAO is an AI-powered content echo system structured as a DAO. It enables creators to amplify their knowledge and content across distributed nodes through AI-assisted generation, curation, and redistribution.\n\n## How It Works\n1. **Input** — A creator submits a piece of content or idea\n2. **Amplify** — AI processes and expands the idea into structured formats (articles, threads, summaries)\n3. **Echo** — The DAO distributes the amplified content across nodes and channels\n4. **Govern** — Token holders vote on content quality, distribution priorities, and system upgrades\n\n## Join the Community\nThe EchoForge DAO community lives on Discord — join us to participate, contribute, and shape the future of decentralized content creation.\n\n[→ Join EchoForge DAO on Discord](https://discord.gg/8tjzmjQmpW)`,
    detail_zh: `# EchoForge DAO\n\n**状态：** MVP\n**技术栈：** AI · DAO · Python · Streamlit\n\n## 概览\nEchoForge DAO 是以 DAO 形式构建的 AI 内容回响系统。它帮助创作者通过 AI 辅助生成、策划与再分发，将知识和内容跨节点放大传播。\n\n## 运作方式\n1. **输入** — 创作者提交内容或想法\n2. **放大** — AI 将想法扩展为结构化格式（文章、推文、摘要）\n3. **回响** — DAO 将放大后的内容分发至各节点与渠道\n4. **治理** — 代币持有者对内容质量、分发优先级和系统升级进行投票\n\n## 加入社区\nEchoForge DAO 的社区在 Discord——欢迎加入，参与共建去中心化内容创作的未来。\n\n[→ 加入 EchoForge DAO Discord](https://discord.gg/8tjzmjQmpW)`,
  },
  {
    num: '04',
    name: 'Personal OS',        name_zh: '个人操作系统',
    status: 'ACTIVE',           status_zh: '运行中',
    summary: 'This website — a structured, minimal personal operating system representing my thinking and output in public.',
    summary_zh: '本网站——一个结构化、极简的个人操作系统，公开记录我的思考与产出。',
    tags: ['HTML', 'CSS', 'JavaScript'],
    url: '#',
    detail: `# Personal OS\n\n**Status:** ACTIVE\n**Stack:** HTML · CSS · JavaScript\n\n## Overview\nThis website is my personal operating system — a structured, minimal digital space where I document my thinking, projects, milestones, and operating principles in public.\n\n## Architecture\n**Layer 4** — Distribution: Twitter / YouTube / GitHub\n\n**Layer 3** — Frontend: stickmancharles.com\n\n**Layer 2** — Thinking System: Obsidian\n\n**Layer 1** — Reality: Books / School / Life / Investing\n\n## Design Philosophy\nNo frameworks. No unnecessary dependencies. Pure HTML, CSS, and JavaScript — because simplicity is a feature, not a limitation. The site reflects the same principles I apply to systems thinking: clarity, structure, and iteration.\n\n## Features\n- Dark / Light / Auto theme system\n- Full bilingual support (EN / ZH)\n- Module panel system with Projects, Essays, Milestones, and Monthly Review\n- Fullscreen essay reader with reading progress bar\n- Radar chart for monthly system review`,
    detail_zh: `# 个人操作系统\n\n**状态：** 运行中\n**技术栈：** HTML · CSS · JavaScript\n\n## 概览\n本网站是我的个人操作系统——一个结构化、极简的数字空间，用于公开记录我的思考、项目、里程碑与运营原则。\n\n## 系统架构\n**第四层** — 传播层：Twitter / YouTube / GitHub\n\n**第三层** — 展示层：stickmancharles.com\n\n**第二层** — 思考系统：Obsidian\n\n**第一层** — 现实输入：书籍 / 学校 / 生活 / 投资\n\n## 设计哲学\n无框架，无冗余依赖。纯 HTML、CSS 与 JavaScript——因为简洁本身就是一种功能，而非局限。网站所体现的，正是我应用于系统思考的核心原则：清晰、结构与迭代。\n\n## 功能\n- 深色 / 浅色 / 跟随系统的三态主题\n- 中英双语完整支持\n- 模块面板系统（项目 / 文章 / 里程碑 / 月度复盘）\n- 带阅读进度条的全屏文章阅读器\n- 月度系统复盘雷达图`,
  },
  {
    num: '05',
    name: 'HP Web Runner',      name_zh: 'HP Web Runner',
    status: 'ARCHIVED',         status_zh: '已归档',
    summary: 'Web application runner for server-side execution and deployment pipeline testing.',
    summary_zh: '用于服务端执行与部署流水线测试的网页应用运行器。',
    tags: ['Python', 'Web', 'DevOps'],
    url: 'https://height-app-by-charles-tao.onrender.com',
    detail: `# HP Web Runner\n\n**Status:** ARCHIVED\n**Stack:** Python · Web · DevOps\n\n## Overview\nHP Web Runner is a web application runner built for server-side execution and deployment pipeline testing. It wraps backend Python scripts in a clean web interface, making it easy to test and demo server-side logic without any local setup required.\n\n## Use Case\nOriginally developed as an accessible front-end interface for the Height App backend — allowing users to interact with BMI and height conversion tools through a hosted, publicly accessible web interface.\n\n## Live Demo\nThe application is deployed and accessible online:\n\n[→ Visit the live app](https://height-app-by-charles-tao.onrender.com)\n\n## Tech Stack\n- Python backend with web framework integration\n- Docker containerization for consistent environment\n- Deployed on Render.com`,
    detail_zh: `# HP Web Runner\n\n**状态：** 已归档\n**技术栈：** Python · Web · DevOps\n\n## 概览\nHP Web Runner 是一款网页应用运行器，专为服务端执行与部署流水线测试而构建。它将后端 Python 脚本封装在简洁的网页界面中，无需任何本地配置即可测试和演示服务端逻辑。\n\n## 使用场景\n最初作为 Height App 后端的可访问前端界面而开发——允许用户通过公开托管的网页端与 BMI 和身高换算工具进行交互。\n\n## 在线体验\n应用已部署，可在线访问：\n\n[→ 访问在线应用](https://height-app-by-charles-tao.onrender.com)\n\n## 技术栈\n- Python 后端集成网页框架\n- Docker 容器化，确保环境一致性\n- 部署于 Render.com`,
  },
  {
    num: '06',
    name: 'Python/C++ Lab',     name_zh: 'Python/C++ 实验室',
    status: 'ONGOING',          status_zh: '持续进行',
    summary: 'Low-level systems programming and scripting experiments. Exploring memory, algorithms, and performance-critical code in both Python and C++.',
    summary_zh: '底层系统编程与脚本实验，在 Python 与 C++ 中探索内存、算法及性能关键代码。',
    tags: ['Python', 'C++', 'Systems', 'Algorithms'],
    url: '#',
    detail: `# Python/C++ Lab\n\n**Status:** ONGOING\n**Stack:** Python · C++ · Systems · Algorithms\n\n## Overview\nThe Python/C++ Lab is my personal sandbox for low-level systems programming and algorithmic experiments. It's where I explore memory management, data structures, performance-critical code, and the interplay between high-level scripting and compiled systems languages.\n\n## Areas of Exploration\n- **Memory Management** — Manual allocation, pointers, stack vs. heap in C++\n- **Algorithms** — Sorting, searching, graph traversal, dynamic programming\n- **Performance** — Benchmarking Python vs. C++ on compute-heavy tasks\n- **Systems** — File I/O, process management, basic OS interactions\n- **Python NCT** — Achieved Level 1 Excellence in formal Python certification\n\n## Philosophy\nUnderstanding low-level fundamentals makes you a better programmer at every level of abstraction. Before frameworks, there is logic. Before logic, there is memory.`,
    detail_zh: `# Python/C++ 实验室\n\n**状态：** 持续进行\n**技术栈：** Python · C++ · Systems · Algorithms\n\n## 概览\nPython/C++ 实验室是我进行底层系统编程与算法实验的个人沙箱。在这里，我探索内存管理、数据结构、性能关键代码，以及高级脚本语言与编译型系统语言之间的交互。\n\n## 探索方向\n- **内存管理** — C++ 中的手动分配、指针、栈与堆\n- **算法** — 排序、搜索、图遍历、动态规划\n- **性能** — Python 与 C++ 在计算密集型任务上的基准对比\n- **系统** — 文件 I/O、进程管理、基础操作系统交互\n- **Python NCT** — 正式 Python 认证一级优秀\n\n## 理念\n理解底层基础，能让你在每个抽象层次上都成为更优秀的程序员。在框架之前，是逻辑；在逻辑之前，是内存。`,
  },
];


const ESSAYS = [
  {
    
    
    type: 'essay',
    title: 'Personal OS',
    title_zh: '个人操作系统',
    date: '',
    readTime: '',
    content: `# Personal OS\n\n**Layer 4**\nDistribution\nTwitter / Youtube / GitHub\n\n**Layer 3**\nFrontend\nstickmancharles.com\n\n**Layer 2**\nThinking System\nObsidian\n\n**Layer 1**\nReality\nBooks / School / Life / Investing`,
    content_zh: `# 个人操作系统\n\n**第四层**\n传播层\nTwitter / Youtube / GitHub\n\n**第三层**\n展示层\nstickmancharles.com\n\n**第二层**\n思考系统\nObsidian\n\n**第一层**\n现实输入\n书籍 / 学校 / 生活 / 投资`,
  },
  {
    
    
    type: 'essay',
    title: 'Stickman Charles — Metacognition',
    title_zh: 'Stickman Charles 元认知',
    date: '2026/3/7',
    readTime: '约6分钟',
    content: `Hello, I’m Stickman Charles.\n\nTeacher Li Xiaolai once said: “Clear and correct concepts are the foundation of all thinking. In fact, whether a person is intelligent can almost be reduced to two questions: Do they possess enough clear, accurate, and correct concepts? And are the relationships between those concepts clear, accurate, and correct?”\n\nMetacognition is the first concept we should understand. It is also the foundation for all the concepts and behaviors that follow.\n\nMetacognition refers to the ability to think about one’s own thinking and behavior.\n\nIn _Cognitive Awakening_, the author describes the theory of the three brains: the instinctive brain, the emotional brain, and the rational brain (the neocortex). The instinctive brain originated about 360 million years ago. It has a simple structure and reacts quickly, focusing mainly on pleasure and avoiding harm. The emotional brain emerged about 200 million years ago and is responsible for processing emotions and social interactions. The rational brain appeared around 2.5 million years ago and handles higher-level cognitive functions, including metacognition.\n\nIn daily life, the instinctive brain and emotional brain process more than 90% of incoming information because they respond quickly. The rational brain reacts much more slowly. Often, it can only respond after the fact, or occasionally intervene in small moments. This is one reason why many people in the stock market lack a long-term investment mindset. They hope to get rich quickly, buy high by following the crowd without independent thinking, and sell low because they lack confidence in assets they never truly analyzed themselves.\n\nThe same pattern appears in everyday life. Many people occasionally lose control of their words or actions and later regret it deeply. This is also a sign of weak metacognitive ability. If the rational brain could intervene before those words were spoken or those actions taken, many regrets might never occur. There is an old Chinese saying: “Think three times before you act.” It expresses the same idea.\n\nSo how can we train our metacognitive ability? I use three methods.\n\nFirst, when facing emotional stimulation, pause for six seconds. This gives the rational brain enough time to respond and take control of behavior.\n\nSecond, write a daily journal—also known as a review. It does not need to be complicated. Simply list the three things you most need to improve today and propose solutions for them.\n\nThird, maintain good sleep. The rational brain relies on the prefrontal cortex (PFC), which is highly sensitive to sleep deprivation. Once sleep drops below six hours, this region begins to lose oxygen efficiency, making metacognitive control much harder to access. This is why people who stay up late are more likely to lose emotional control.\n\nI was born in 2012, which means I should theoretically be entering my rebellious teenage years. Here I want to thank my father, my mother, and Professor Sun. When I was young, they introduced me to the concept of metacognition and helped me develop the habit of observing and regulating my own behavior.\n\nStarting today, you can begin training your own metacognitive ability and become one of the few people who can deliberately activate their rational brain in real time.\n\nIf you have any thoughts or suggestions about metacognition, feel free to contact me at:\n\n[charlesisworkinghard@gmail.com](mailto:charlesisworkinghard@gmail.com)\n\nKeep thinking, and take care.`,
    content_zh: `你好，我是 Stickman Charles。\n\n李笑来老师曾经说过：“清晰且正确的概念是一切思考的基石。而衡量一个人是否聪明，几乎可以凝练成他是否符合下面这两个条件：他有没有足够多的清晰、准确、正确的概念；他的概念之间有没有清晰、准确、正确的联系。”\n\n元认知是我们要了解的第一个概念，也是之后所有概念和行为的基石。\n\n所谓元认知能力，就是对自己当前行为的独立思考。\n\n在《认知觉醒》中，作者提到了三个大脑理论：本能脑、情绪脑和理智脑/新皮层。本能脑起源于3.6亿年前，结构简单、反应快，只专注于享乐和“避害”；情绪脑起源于2亿年前，可以处理情绪和社交；理智脑起源于250万年前，负责高级认知功能，其中就包括我们提到的元认知。\n\n在日常生活中，你的本能脑和情绪脑因为响应速度快，掌控了90%以上的信息处理。理智脑因为响应速度慢，很多时候只能事后再反应，或者见缝插针地偶尔干预一下你的行为。这也就导致了在股市里，很多人没有长期投资的心态——总想着一笔暴富，又或者是高买——喜欢跟风，不独立思考；低卖——对不经过自己思考的资产没有信心，害怕没人接盘。\n\n又或者说，很多人在生活中总有那么几次控制不住自己的言行，最后酿成大祸。这也是元认知能力缺失的体现。如果能在说出这些话、做出这些事之前先动用理智脑想一想，也许很多人的遗憾就不会再出现了。中国有句古话：“三思而后行。”讲的也是这个道理。\n\n那么，怎样锻炼自己的元认知能力呢？我用了以下三种方法：\n\n第一，在受到情绪刺激时，暂停6秒钟。给我的理智脑充足的响应时间，接管我的行为。\n\n第二，每天坚持写日志——也可以被称为复盘。不需要太复杂，只需要把自己今天最应该提升的三个点列出来，并给出解决方案就行。\n\n第三，保持良好的睡眠。理智脑依赖前额叶皮层（PFC），这个区域对睡眠不足最敏感。一旦睡眠小于6小时，该区域就会缺氧，导致元认知调用的难度大幅上升。因此可以说，熬夜的人情绪更容易失控。\n\n我出生于2012年，现在按理来说应该处在叛逆期。在这里我很想感谢我的父亲、母亲和孙教授，他们在我小的时候教会了我元认知的概念，让我有了控制自己言行的习惯和意识。\n\n从今天开始，你也可以开始锻炼自己的元认知能力，让自己成为那些为数不多能即时调用理智脑的人之一。\n\n如果你有任何对于元认知的想法和建议，请通过\ncharlesisworkinghard@gmail.com\n联系我，期待你的思考！\n\n保持思考，保重。`,
  },
  {
    
    
    type: 'essay',
    title: 'Stickman Charles — First Principles',
    title_zh: 'Stickman Charles 第一性原理',
    date: '2026/3/13',
    readTime: '约8分钟',
    content: `# Stickman Charles — First Principles\n\nHello, I'm Stickman Charles.\n\n## What are first principles?\n\nAristotle argued that within any system of knowledge there exist the most fundamental truths—truths that require no prior assumptions. These are called _first principles_. If you understand them, you can derive the rest of the logic within that domain.\n\nThe physicist Richard Feynman advocated a similar attitude: _do your own homework_. Instead of blindly trusting authority, work through the reasoning yourself and derive the result.\n\nWhen Jeff Bezos was building Amazon, he asked his team to return to the fundamental question of user experience rather than competing through proxy metrics—numbers created within an existing framework rather than objective reality.\n\nIn the early days of SpaceX, Elon Musk ignored the industry assumption that rockets must be extremely expensive. Instead, he examined the price of every raw material on the London Metal Exchange. The result: the material cost accounted for only about 2% of the market price of a rocket.\n\nFrom these examples, first-principles thinking can be understood as a way of thinking that combines **independent reasoning**, **returning to fundamentals**, and **challenging conventions**.\n\nThese three elements reinforce one another. None of them stands alone.\n\n---\n\n## How can you develop first-principles thinking?\n\n**Step 1: Ask one more "why."**\n\nMuch of what you believe to be knowledge is actually borrowed experience. Ask yourself one more "why."\n\nOur brains—especially the instinctive and emotional systems—prefer analogical thinking. We rely on the experience of others because it saves energy. But this does not mean every question must be pursued endlessly. The goal is to find a balance between training your thinking ability and managing your cognitive energy. Save your effort for the problems that truly matter.\n\n**Step 2: Learn across disciplines.**\n\nStudy the fundamental laws of fields such as physics, mathematics, and biology. These disciplines provide the underlying structure that will help you in the next step.\n\n**Step 3: Deconstruct the problem.**\n\nUse what you have learned to break a problem down until it cannot be reduced any further. Then separate the constraints you discover into two categories: **human constraints** and **physical constraints**.\n\nFirst-principles thinking focuses on physical constraints and questions everything that is merely human convention.\n\n**Step 4: Search for the shortest path.**\n\nOnce the facts are clear, ask yourself: what is the most efficient path to the goal?\n\nDuring this process, external opinions matter less. First-principles thinking, by definition, often challenges existing norms.\n\n---\n\n## How I apply first-principles thinking\n\nCognition can be seen as a system built from many clear and accurate concepts. My goal is to explain, compress, and help people master these concepts.\n\nReduce ideas to their essence.\n\n_Simple is everything._\n\nLet's simplify thinking and action down to their fundamentals.\n\nFinally, thank you for reading. If you have thoughts or suggestions about first-principles thinking, feel free to contact me at:\n\n**[charlesisworkinghard@gmail.com](mailto:charlesisworkinghard@gmail.com)**\n\nKeep thinking, and take care.`,
    content_zh: `# Stickman Charles 第一性原理\n\n你好，我是 Stickman Charles。\n\n## 什么是第一性原理？\n\n亚里士多德认为，在任何知识体系中，都存在一些最基础的、不需要任何前提就能成立的"真理"，也被称作"第一原理"。如果你了解这些"第一原理"，你就可以推导出该领域内的一切逻辑。\n\n同时，著名物理学家理查德·费曼提倡"自己做功课"，不去盲目听信权威的结论，而是自己推导结果。\n\n杰夫·贝佐斯在经营亚马逊时，要求团队回归最底层的用户体验本质，而不是和竞争对手比拼代理指标——即别人在既有逻辑下产生的结论，而非客观事实。\n\n埃隆·马斯克在 SpaceX 初期进行火箭制造时，没有理会外界对火箭"昂贵造假"的质疑。他选择把火箭每种原材料的价格都在伦敦交易所查询一遍。最后得到的结果是，原材料成本仅占市场报价的 2%。\n\n由此可见，第一性原理就是一个集独立思考、回归本质和挑战常规于一身的思维方式。\n\n这三者之间相辅相成，缺一不可。\n\n---\n\n## 如何让自己掌握"第一性原理"这个思维方式？\n\n**第一步，多问一个为什么。**\n\n通常来说，你大脑里的大多数"知识"其实只是别人的经验，你需要多问自己一个为什么。我们的大脑，尤其是本能脑和情绪脑，都倾向于使用"类比"思维，运用别人的经验，因为这样可以节省许多能量的消耗。但这并不意味着你需要把每个问题都刨根问底。我们要做的是在锻炼能力和能量消耗之间找到一个平衡点，把你的能量留给真正重要的问题。\n\n**第二步，跨界学习。**\n\n你需要学习一些物理、数学和生物的最底层定律。这对下一步的拆解会有很大的帮助。\n\n**第三步，开始拆解。**\n\n你需要运用之前学到的知识，把你的目标拆解到不能再拆解的状态，再把你得出的约束划分为人为约束和物理约束。第一性原理只考虑物理约束，质疑一切人为约束。\n\n**第四步，寻找最短路径。**\n\n基于这些事实，你实现目标的最高效路径会是什么？在这个过程中，不要在意外界对你的评价，因为"第一性原理"本身就是挑战常规的。\n\n---\n\n## 我是怎样运用第一性原理的？\n\n所谓认知，其实就是足够多清晰、正确和准确的概念组合而来的系统。而我将会讲解、压缩，并帮助大家掌握这些概念。简单到本质，Simple is everything。\n\n让我们一起将思考与行动化简到本质。\n\n最后，感谢你的耐心。如果你有任何关于第一性原理的想法和建议，请通过 charlesisworkinghard@gmail.com 联系我，期待你的思考！\n\n保持思考，保重。`,
  },
  {
    type: 'note',
    title: 'The Endless Tunnel',
    title_zh: '无穷无尽的隧道',
    date: '2026/3/13',
    readTime: '约5分钟',
    content: `# The Endless Tunnel

Strictly speaking, this is not a letter, because it is not written in the format of one. It is closer to a short essay. In it, I share some thoughts about the seven years of education I experienced in China, along with a few simple observations I made after coming to Canada.

  Author’s Note

  This article was written during my first summer after arriving in Canada. At that time, I looked back on the seven years of education I experienced in China and recorded some personal observations.

  Reading it again now, I can clearly feel that my way of thinking has changed. Because of this, I made some minor revisions to certain expressions to make the language more rational, while still preserving the overall thinking of that time.

  I believe that documenting the evolution of one’s thinking is itself part of growth.

Originally, I planned to write several letters to you. Unfortunately, because I also had to prepare for an English exam, I ended up writing only one. I chose what I believe is the most important topic and would also like to hear your thoughts.

Why do I think this topic matters so much?

The 17th-century educator **John Amos Comenius**, often called the "father of modern education," once wrote: _"Only after receiving an appropriate education can a person truly become a person."_ At the moment, we are all in secondary school and have our own experiences and reflections about school life. For that reason, I believe this topic is worth discussing.

Next, I will talk about some of my views on primary school and middle school, along with a few pieces of information I found online.

---

## Primary School

Let's start with the stage most familiar to us: primary school.

Although only Tong Yiyan and Cheng Jiale were my classmates in primary school, we have always communicated a lot, so we still have some understanding of each other's experiences.

When people talk about primary school, the first thing that often comes to mind is academic performance. In many situations, grades almost determine a student's position and influence within the class. The idea of "well-rounded development," in practice, often still revolves around academic results.

But I want to make one objective point: **grades cannot fully represent a person's abilities or character, nor can they determine a person's overall value.**

So why do schools still place such strong emphasis on grades?

One practical reason is that China has a very large population, while educational resources and job opportunities are limited. Under these conditions, schools often need a simple and intuitive metric that allows easy comparison. Grades happen to serve this function.

In contrast, things like cognitive ability, practical skills, and independent thinking are also important, but they are much harder to measure and compare directly.

Of course, this does not mean that studying in school has no value. My point is that besides academic performance, we should also pay attention to other important abilities, such as reading, communication, thinking, and practical skills.

---

## Status and Influence in School

Another topic is the selection of class leaders, group leaders, and similar roles—what I previously described as "status" and "influence."

These roles exist for two main reasons.

First, from a management perspective, teachers need some students to help handle class affairs, such as maintaining order, delivering information, or organizing activities. For students, these positions often represent recognition and responsibility.

Second, these roles also test certain abilities, including communication, organization, and social skills.

However, in reality, not everyone has the opportunity to take on these roles. Many students ultimately place most of their attention on academic results, while paying less attention to developing other abilities.

---

## The Reality of "Well-Rounded Development"

Here I want to add another reason why so-called "well-rounded development" often still revolves around grades in practice.

For example, some primary school students who aim to enter better middle schools not only attend tutoring classes, but also learn instruments such as piano, guitar, or guzheng, or participate in competitions and extracurricular activities.

On the surface, this appears to be multi-dimensional development.

But in many cases, these activities are still treated as additional advantages in academic competition. When the evaluation system remains centered on academic performance, other activities are easily absorbed into the same competitive framework.

Of course, primary school is not entirely negative. At least during that stage, we still had more time to make friends, read books, participate in activities, and encounter many new things.

(I would also like to take a moment to acknowledge the reading club from those years.)

---

## Middle School

Next comes middle school.

For many people, middle school is the stage where pressure increases significantly. Many families treat getting into a "good middle school" as a major goal, as if completing this step will guarantee a smoother life afterward.

But from a longer-term perspective, middle school is only one stage in the educational path. After that come high school, university, and the challenges of entering society.

Since the issue of grades has already been discussed, I want to briefly talk about another experience many students encounter for the first time: **military training**.

From a young age, we are often taught to respect teachers. There is nothing wrong with that. But at the same time, we should also understand something important: **teachers are ordinary people as well, and their views cannot always be completely correct.**

In some environments, teachers' authority is rarely questioned, while students are mainly expected to obey and execute instructions. To a certain extent, this model may reduce students' space to express different opinions and may not be helpful for developing independent thinking.

Military training reinforces this emphasis on discipline and obedience. Students are required to act according to unified commands—standing in formation, marching, responding to orders, and so on.

These exercises can certainly cultivate discipline. But if there is little room for reflection, people may gradually become accustomed to simply following instructions.

---

## A Broader Question: Employment

Finally, I want to return to a broader topic—employment.

According to data released by China's National Bureau of Statistics, at one point the unemployment rate for urban youth aged 16 to 24 reached **14.9%** (excluding students). In other words, roughly one or two out of every ten young people were temporarily unable to find a job.

Of course, employment problems are complex and cannot be attributed solely to the education system. However, if the evaluation system in education relies too heavily on a single metric, students' skill structures may also become narrow.

In the long run, what a person truly needs is not only the ability to perform well on exams, but also **reading ability, learning ability, communication ability, and independent thinking**.

---

## Final Thoughts

No matter what kind of educational environment we are in, we can still try to do a few additional things: read more books, explore different areas of knowledge, practice independent thinking, and learn another language.

Gradually, you may find a path that belongs to you.

Thank you for taking the time to read this.  
See you next time.`,
    content_zh: `2026/3/13 GMT-4
作者说明：

**这篇文章写于我来到加拿大后的第一个暑假。当时我回顾了自己在中国经历的七年教育，并记录了一些个人观察。**

**现在再读这篇文章，我能明显感觉到自己的思考方式已经发生了变化。因此我对部分表达做了轻微修改，使语言更加理性，但整体内容仍然保留了当时的思考状态。**

**我认为记录思考的演变，本身也是成长的一部分。**

# 无穷无尽的隧道

准确地说，这并不是一封信，因为我并没有按照信的格式来写。这更像是一篇小论文，里面包含了我对于在中国经历的七年教育的一些想法，以及来到加拿大之后做的一些简单观察，与大家分享。

本来我是打算给你们写好几封信的。可惜因为我还要准备英语考试，所以最后只写了一封。我挑了一个我认为最重要的话题跟大家分享，也希望大家能够交流自己的想法。

为什么我认为这个话题最重要呢？

17世纪的教育家、被誉为"教育学之父"的夸美纽斯曾说过："只有受过一种合适的教育过后，人才能成为一个人。"而我们几个人也刚好处在中学时期，对学校的学习生活都有自己的体验和想法，所以我认为这个话题还是很有讨论价值的。

接下来，我会谈一谈自己对小学和初中的一些看法，以及我在网上查到的一些资料。

首先，从我们最熟悉的小学时代开始。虽然我只和童一焱、程嘉乐是小学同学，但好在我们之间的交流一直很多，所以对彼此的经历多少也有一些了解。

说起小学，很多人的第一反应可能就是学习成绩。毕竟在很多情况下，成绩几乎代表了一个学生在班级中的位置和话语权。所谓的"全面发展"，在实际环境中往往还是围绕成绩展开。

但我想说一句比较客观的话：学习成绩并不能完全体现一个人的能力和品质，也无法决定一个人的全部价值。

那么为什么学校仍然如此重视成绩呢？一个现实的原因是，中国的人口规模很大，而教育资源和岗位数量都是有限的。在这种情况下，学校往往需要一种**简单、直观、便于比较的指标**来进行筛选，而成绩正好符合这一点。

相比之下，像"认知能力""实践能力""独立思考能力"这样的东西，虽然同样重要，却很难被直接量化和比较。

当然，我并不是说在学校学习没有意义。我的意思是，除了学习成绩之外，我们也应该关注一些同样重要的能力，例如阅读能力、表达能力、思考能力和实践能力。

其次，是竞选班干部、小组长之类的职位，也就是我之前提到的"地位"和"影响力"。

这些角色的出现，其实有两个原因。

第一，从管理角度来说，老师需要一些学生协助处理班级事务，例如维持秩序、传达信息、组织活动等。而对于学生来说，这些职位也意味着一种认可和责任。

第二，这些角色在某种程度上也会考验学生的综合能力，例如表达能力、组织能力和社交能力。

不过在现实环境中，并不是每个人都有机会参与这些角色。很多学生最终还是把主要精力放在成绩上，而较少关注其他能力的发展。

接下来，我想补充一下为什么我认为很多所谓的"全面发展"，在实际操作中仍然围绕成绩展开。

例如，一些为了考上更好中学的小学生，不仅要上各种补习班，还要学习钢琴、吉他、古筝等艺术课程，或者参加各种竞赛和活动。从表面上看，这似乎是多方面的发展。

但在很多情况下，这些活动依然被当作一种**升学竞争中的加分项**。当评价体系仍然以成绩为核心时，其他活动也很容易被纳入同一套竞争逻辑之中。

当然，小学也并不是一无是处。至少在那个阶段，我们还有比较多的时间去交朋友、读书、参加活动，也能够接触到各种各样的新事物。（在这里也致敬一下当年的读书会。）

接下来，就说到初中了。

对很多人来说，初中往往是压力明显增加的阶段。许多家庭会把"进入好初中"看作一个重要的目标，仿佛只要完成了这一步，之后的人生就会顺利很多。

但从更长远的角度来看，初中只是教育路径中的一个阶段。后面还有高中、大学以及真正进入社会之后的挑战。

因为成绩的问题在前面已经提到过了，所以这里我想简单谈一下另一个很多学生都会经历的新事物——军训。

从小我们常常被教育要尊重老师，这一点本身没有问题。但与此同时，我们也需要理解一件事情：老师同样是普通人，他们的观点也不可能永远完全正确。

在某些环境中，老师的权威很少被质疑，而学生则更多被要求服从和执行。这种模式在一定程度上可能会减少学生表达不同意见的空间，也不利于培养独立思考能力。

军训在某种程度上强化了这种"纪律"和"服从"的训练方式。学生需要按照统一的要求行动，例如站军姿、列队、听从口令等。这些训练确实可以培养纪律性，但如果缺乏思考空间，也容易让人习惯单纯地执行指令。

最后，我再回到一个更宏观的话题——就业。

根据中国国家统计局公布的数据，某一时期16—24岁城镇青年失业率达到14.9%（不包含在校生）。这意味着，在十个年轻人当中，大约有一到两个人暂时找不到工作。

当然，就业问题的原因非常复杂，不可能简单归结为教育体系。但如果教育评价体系过度依赖单一指标，那么学生的能力结构也可能变得比较单一。

从长期来看，一个人真正需要的，往往不仅仅是考试能力，还包括阅读能力、学习能力、表达能力以及独立思考能力。

因此，无论身处什么样的教育环境，我们或许都可以尝试做一些额外的事情：多读书，多接触不同的知识，多进行独立思考，也多学习一门语言。

慢慢地，你也许会找到属于自己的道路。

感谢你的耐心阅读，我们下次再见。`,
  }
];


const MILESTONES = [
  {
    year: '2023',
    items: [
      { date: '2023', title: 'Invested in NASDAQ 100 Index Fund', title_zh: '投资纳斯达克100指数基金', desc: 'Made my first investment in the NASDAQ 100, marking the start of my financial journey.', desc_zh: '完成纳斯达克100的首次投资，开启了我的财务旅程。', major: true, tag: 'INVEST' },
      { date: '2023', title: 'Joined Nanjing Beijing East Road Primary School Student Council', title_zh: '进入南京北京东路小学大队部', desc: 'Became a member of the student council, starting my leadership journey.', desc_zh: '成为大队部成员，开启领导力之路。', major: true, tag: 'LEADERSHIP' },
    ]
  },
  {
    year: '2024',
    items: [
      { date: '2024-01-26', title: 'Dogs Travel Startup Event I', title_zh: '狗狗旅行创业活动 I', desc: 'Organized and led the first Dogs travel entrepreneurship event, exploring new business models with a passionate team.', desc_zh: '组织并主导了第一届狗狗旅行创业活动，与热情的团队共同探索新商业模式。', major: true, tag: 'STARTUP' },
      { date: '2024-05-01', title: 'Dogs Travel Startup Event II', title_zh: '狗狗旅行创业活动 II', desc: 'Held the second Dogs travel entrepreneurship event, further validating the concept and expanding the community.', desc_zh: '举办第二届狗狗旅行创业活动，进一步验证概念并扩大社区规模。', major: true, tag: 'STARTUP' },
      { date: '2024-09', title: 'First Encounter with AI Art, Music, and Writing', title_zh: '初次接触 AI 艺术、音乐与写作', desc: 'Explored generative AI for the first time, creating art, music, and written works with cutting-edge tools.', desc_zh: '首次探索生成式 AI，用前沿工具创作艺术、音乐与文字作品。', major: true, tag: 'AI' },
      { date: '2024-11', title: 'Python NCT Level 1 Excellence', title_zh: 'Python NCT 一级优秀', desc: 'Achieved excellent results in the Python NCT Level 1 exam, demonstrating strong programming fundamentals.', desc_zh: '在 Python NCT 一级考试中取得优秀成绩，展现扎实的编程基础。', major: false, tag: 'Code' },
    ]
  },
  {
    year: '2025',
    items: [
      { date: '2025-03-03', title: 'First Blockchain Experience & Investment', title_zh: '首次区块链体验与投资', desc: 'Dove into blockchain technology and made my first investment, opening a new chapter in tech and finance.', desc_zh: '深入区块链技术并完成首次投资，开启科技与金融融合的新篇章。', major: true, tag: 'BLOCKCHAIN' },
      { date: '2025-06-15', title: 'Admitted to Codemao Python Talent Class with Full Score', title_zh: '满分入选编程猫科技特长生Python班', desc: 'Selected for Codemao Python Talent Class with a perfect score.', desc_zh: '以满分成绩入选编程猫科技特长生Python班。', major: true, tag: 'Code' },
      { date: '2025-07-05', title: 'National Youth Labor Skills & Intelligent Design Competition Python Silver Medal', title_zh: '全国青少年劳动技能与智能设计大赛Python中学组银牌', desc: 'Won the Silver Medal in the National Youth Labor Skills & Intelligent Design Competition (Python, Middle School Group).', desc_zh: '获得全国青少年劳动技能与智能设计大赛Python中学组银牌。', major: true, tag: 'Code' },
      { date: '2025-08-06', title: 'Completed Integrated Math I Honors', title_zh: '完成Integrated Math I荣誉课程', desc: 'Completed the Integrated Math I Honors course.', desc_zh: '完成Integrated Math I荣誉课程。', major: true, tag: 'MATH' },
      { date: '2025-08-10', title: 'Published First Collaborative AI Research on Zenodo', title_zh: '在Zenodo上传首个多人合作AI研究项目', desc: 'Published the collaborative AI research: Tao Chengfeng, C. T., Cheng Jiale, J. C., & Tong Yiyan, S. T. (2025). 6 AI Mathematics Ability Assessments. Zenodo. https://doi.org/10.5281/zenodo.17317013', desc_zh: '陶乘风, C. T., 程嘉乐, J. C., & 童一焱, S. T. (2025). 6 AI Mathematics Ability Assessments. Zenodo. https://doi.org/10.5281/zenodo.17317013', major: true, tag: 'AI' },
      { date: '2025-09-28', title: 'Graduated from Codemao Advanced Python', title_zh: '完成编程猫Python高阶，顺利毕业', desc: 'Graduated from Codemao Advanced Python course.', desc_zh: '完成编程猫Python高阶课程，顺利毕业。', major: true, tag: 'Code' },
      { date: '2025-06-06', title: 'Invested in TSLA', title_zh: '投资特斯拉', desc: 'Added Tesla to my investment portfolio, betting on innovation and the future of mobility.', desc_zh: '将特斯拉纳入投资组合，押注创新与出行的未来。', major: false, tag: 'INVEST' },
      { date: '2025-08-01', title: 'Discovered VS Code', title_zh: '发现 VS Code', desc: 'Started using Visual Studio Code, which greatly improved my coding efficiency and workflow.', desc_zh: '开始使用 Visual Studio Code，大幅提升了编码效率与工作流程。', major: false, tag: 'Code' },
      { date: '2025-09-14', title: 'Cardano Academy Master Level', title_zh: 'Cardano 学院大师级', desc: 'Achieved Master Level at Cardano Academy, deepening my understanding of blockchain and smart contracts.', desc_zh: '在 Cardano 学院取得大师级认证，深化了对区块链与智能合约的理解。', major: true, tag: 'Blockchain' },
      { date: '2025-12-21', title: 'Launched My First C++ Website', title_zh: '发布首个 C++ 网站', desc: 'Deployed my first website built with C++, marking a milestone in my systems programming journey.', desc_zh: '部署了第一个用 C++ 构建的网站，标志着系统编程旅程的重要里程碑。', major: true, tag: 'Code' },
      { date: '2025-12-21', title: 'Completed StoryForge DAO MVP', title_zh: '完成 StoryForge DAO MVP', desc: 'Finished and launched the MVP for my blockchain startup project, StoryForge DAO.', desc_zh: '完成并发布区块链创业项目 StoryForge DAO 的最小可行产品。', major: true, tag: 'Startup' },
    ]
  },
  {
    year: '2026',
    items: [
      { date: '2026-02-28', title: 'Launched stickmancharles.me', title_zh: '发布 stickmancharles.me', desc: 'Released my personal website, stickmancharles.me, to share my work and ideas with the world.', desc_zh: '发布个人网站 stickmancharles.me，向世界分享我的作品与想法。', major: true, tag: 'Code' },
      { date: '2026-03-04', title: 'First Cardano Aiken LLM', title_zh: '首个 Cardano Aiken 大语言模型', desc: 'Deployed my first LLM using Cardano Aiken, pushing the boundaries of blockchain AI integration.', desc_zh: '使用 Cardano Aiken 部署首个大语言模型，突破区块链 AI 融合的边界。', major: true, tag: 'AI' },
      { date: '2026-03-04', title: 'EchoForgeDAO MVP Complete', title_zh: 'EchoForgeDAO MVP 完成', desc: 'Completed the MVP for my blockchain project EchoForgeDAO, advancing decentralized content creation.', desc_zh: '完成区块链项目 EchoForgeDAO 的 MVP，推动去中心化内容创作向前迈进。', major: true, tag: 'Startup' },
      { date: '2026-03-06', title: 'Read 5,234,000 Words of Literature', title_zh: '累计阅读 523 万字文学作品', desc: 'Achieved a personal record by reading over 5.23 million words, demonstrating dedication to literary exploration.', desc_zh: '创下个人记录，累计阅读超过 523 万字，展现对文学探索的坚定投入。', major: true, tag: 'Think' },
      { date: '2026-03-07', title: 'First Stickman Charles Essay Published', title_zh: 'Stickman Charles首篇文章出炉', desc: 'Published my first essay as Stickman Charles, marking a new chapter in writing.', desc_zh: '以Stickman Charles身份发表首篇文章，开启写作新篇章。', major: true, tag: 'Think' },
        { date: '2026-03-13', title: 'First Principles Essay Published', title_zh: '第一性原理文章发表', desc: 'Published my second major essay on First Principles thinking, exploring independent reasoning and challenging conventions.', desc_zh: '发表第二篇重要文章《第一性原理》，深入探讨独立思考和挑战常规的思维方式。', major: true, tag: 'Think' },
    ]
  },
];


const REVIEW_DATA = {
  period: 'FEB 2026',
  dims: [
    { name: 'Build',    score: 24 },
    { name: 'Learn',    score: 21 },
    { name: 'Health',   score: 18 },
    { name: 'Finance',  score: 22 },
    { name: 'Social',   score: 15 },
    { name: 'Focus',    score: 21 },
  ],
  notes: [],
};

// ── Meta map ───────────────────────────────────

const MODULE_META = {
  projects:  { index: '01', tag: 'BUILD',     tag_zh: '构建',  title: 'Projects',             title_zh: '项目' },
  essays:    { index: '02', tag: 'WRITE',     tag_zh: '写作',  title: 'Essays',               title_zh: '文章' },
  milestone: { index: '03', tag: 'MILESTONE', tag_zh: '里程碑', title: 'Milestone',             title_zh: '里程碑' },
  review:    { index: '04', tag: 'REVIEW',    tag_zh: '复盘',  title: 'Monthly System Review', title_zh: '月度系统复盘' },
};

// ── Panel DOM refs ─────────────────────────────

let radarChart = null;

function initPanel() {
  const panel     = document.getElementById('module-panel');
  const backdrop  = document.getElementById('panel-backdrop');
  const closeBtn  = document.getElementById('panel-close');

  const openPanel = (moduleKey) => {
    const meta = MODULE_META[moduleKey];
    if (!meta) return;

    document.getElementById('panel-index').textContent     = meta.index;
    document.getElementById('panel-tag-label').textContent = t(meta.tag, meta.tag_zh);
    document.getElementById('panel-title').textContent     = t(meta.title, meta.title_zh);

    const body = document.getElementById('panel-body');
    body.innerHTML = '';

    // destroy previous chart
    if (radarChart) { radarChart.destroy(); radarChart = null; }

    if (moduleKey === 'projects')  { body.innerHTML = buildProjects(); bindProjectDetailBtns(); }
    if (moduleKey === 'essays')    { body.innerHTML = buildEssays(); bindEssayToggle(); }
    if (moduleKey === 'milestone') body.innerHTML = buildMilestone();
    if (moduleKey === 'review')    { body.innerHTML = buildReview(); initRadarChart(); }

    panel.classList.add('panel-open');
    panel.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  const closePanel = () => {
    _removeEssayScrollListeners();
    closeEssayFullscreen();
    closeProjectDetail();
    panel.classList.remove('panel-open');
    panel.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  // open via card click or card-link click
  document.querySelectorAll('.module-card[data-module]').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-link')) return; // handled separately
      openPanel(card.dataset.module);
    });
  });
  document.querySelectorAll('.card-link[data-module]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      openPanel(link.dataset.module);
    });
  });

  backdrop.addEventListener('click', closePanel);
  closeBtn.addEventListener('click', closePanel);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
  });

  // ── Language toggle ──
  const langBtn = document.getElementById('lang-toggle');
  if (langBtn) {
    langBtn.addEventListener('click', () => {
      LANG = LANG === 'en' ? 'zh' : 'en';
      localStorage.setItem('lang', LANG);
      applyLang();
    });
  }

  // ── Theme toggle (cycles: dark → light → auto) ──
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', cycleTheme);
  }

  // Apply saved language on load
  applyLang();
}

// ── Content builders ──────────────────────────

function buildProjects() {
  return `<div class="projects-grid">` +
    PROJECTS.map((p, i) => `
      <div class="project-cell">
        <div class="project-cell-header">
          <span class="project-num">${p.num}</span>
          <span class="project-status">${t(p.status, p.status_zh)}</span>
        </div>
        <div class="project-name">${t(p.name, p.name_zh)}</div>
        <p class="project-summary">${t(p.summary, p.summary_zh)}</p>
        <div class="project-tags">${p.tags.map(tag => `<span>${tag}</span>`).join('')}</div>
        <div class="project-actions">
          <a class="project-url project-detail-btn" data-idx="${i}">${t('Read More →', '查看详情 →')}</a>
          ${p.url !== '#' ? `<a href="${p.url}" target="_blank" class="project-url project-visit-btn">${t('Visit →', '访问 →')}</a>` : ''}
        </div>
      </div>`).join('') +
  `</div>`;
}

function bindProjectDetailBtns() {
  document.querySelectorAll('.project-detail-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openProjectDetail(parseInt(btn.dataset.idx, 10));
    });
  });
}

function _ensureProjectDetailDOM() {
  if (document.getElementById('project-detail-reader')) return;
  const el = document.createElement('div');
  el.id        = 'project-detail-reader';
  el.className = 'essay-fullscreen';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <div class="efr-bar">
      <div class="efr-bar-left">
        <span class="efr-tag">BUILD</span>
        <span class="efr-title" id="pdr-title"></span>
      </div>
      <button class="efr-close" id="pdr-close">✕ CLOSE</button>
      <div class="efr-progress" id="pdr-progress"></div>
    </div>
    <div class="efr-scroll" id="pdr-scroll">
      <div class="md-body" id="pdr-body"></div>
      <div class="efr-end">— EOF —</div>
    </div>`;
  document.body.appendChild(el);

  const scroll   = document.getElementById('pdr-scroll');
  const progress = document.getElementById('pdr-progress');
  scroll.addEventListener('scroll', () => {
    const max = scroll.scrollHeight - scroll.clientHeight;
    if (max > 0) progress.style.width = (scroll.scrollTop / max * 100) + '%';
  }, { passive: true });

  document.getElementById('pdr-close').addEventListener('click', closeProjectDetail);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && el.classList.contains('active')) closeProjectDetail();
  });
}

function openProjectDetail(idx) {
  _ensureProjectDetailDOM();
  const p = PROJECTS[idx];
  if (!p) return;

  const content = t(p.detail, p.detail_zh || p.detail);
  const title   = t(p.name, p.name_zh);

  document.getElementById('pdr-title').textContent = title;
  document.getElementById('pdr-body').innerHTML =
    typeof marked !== 'undefined' ? marked.parse(content) : content.replace(/\n/g, '<br>');

  const scroll = document.getElementById('pdr-scroll');
  scroll.scrollTop = 0;
  document.getElementById('pdr-progress').style.width = '0%';

  const reader = document.getElementById('project-detail-reader');
  reader.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => reader.classList.add('active'));
}

function closeProjectDetail() {
  const reader = document.getElementById('project-detail-reader');
  if (!reader) return;
  reader.classList.remove('active');
  reader.setAttribute('aria-hidden', 'true');
}

function buildEssays() {
  const renderItem = (e, i) => {
    const content = t(e.content, e.content_zh || e.content);
    // Show only the first ~5 lines as a teaser inside the panel
    const previewLines = content.split('\n').filter(l => l.trim()).slice(0, 5).join('\n');
    const previewHtml = typeof marked !== 'undefined'
      ? marked.parse(previewLines)
      : previewLines.replace(/\n/g, '<br>');
    return `
      <div class="essay-item" data-essay="${i}">
        <div class="essay-header">
          <div class="essay-header-left">
            <div class="essay-title">${t(e.title, e.title_zh || e.title)}</div>
            <div class="essay-meta">
              <span>${e.date}</span>
              <span>${e.readTime}</span>
            </div>
          </div>
          <span class="essay-toggle">+</span>
        </div>
        <div class="essay-content">
          <div class="essay-preview-wrap">
            <div class="md-body">${previewHtml}</div>
          </div>
          <div class="essay-scroll-hint">
            <span class="essay-scroll-hint-arrow">↓</span>
            <span>${t('scroll or swipe down to read full article', '向下滚动进入全屏阅读模式')}</span>
          </div>
        </div>
      </div>`;
  };

  const essaysHtml = ESSAYS
    .map((e, i) => (e.type === 'essay' ? renderItem(e, i) : ''))
    .filter(Boolean)
    .join('');

  const notesHtml = ESSAYS
    .map((e, i) => (e.type === 'note' ? renderItem(e, i) : ''))
    .filter(Boolean)
    .join('');

  const emptyText = t('No content yet.', '暂无内容。');

  return `
    <div class="essay-groups">
      <div class="essays-section">
        <div class="essays-section-title">Essays</div>
        <div class="essays-list">
          ${essaysHtml || `<div class="essay-empty">${emptyText}</div>`}
        </div>
      </div>

      <div class="essays-section">
        <div class="essays-section-title">Notes</div>
        <div class="essays-list">
          ${notesHtml || `<div class="essay-empty">${emptyText}</div>`}
        </div>
      </div>
    </div>
  `;
}

// ── Fullscreen Essay Reader ─────────────────────────────

let _efrScrollListeners = { wheel: null, touchStart: null, touchMove: null };
let _efrTouchStartY = 0;

function _removeEssayScrollListeners() {
  const pb = document.getElementById('panel-body');
  if (!pb) return;
  if (_efrScrollListeners.wheel)      { pb.removeEventListener('wheel',      _efrScrollListeners.wheel);      _efrScrollListeners.wheel = null; }
  if (_efrScrollListeners.touchStart) { pb.removeEventListener('touchstart', _efrScrollListeners.touchStart); _efrScrollListeners.touchStart = null; }
  if (_efrScrollListeners.touchMove)  { pb.removeEventListener('touchmove',  _efrScrollListeners.touchMove);  _efrScrollListeners.touchMove = null; }
}

function _ensureEssayFullscreenDOM() {
  if (document.getElementById('essay-fullscreen-reader')) return;
  const el = document.createElement('div');
  el.id        = 'essay-fullscreen-reader';
  el.className = 'essay-fullscreen';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <div class="efr-bar">
      <div class="efr-bar-left">
        <span class="efr-tag">WRITE</span>
        <span class="efr-title"  id="efr-title"></span>
        <span class="efr-date"   id="efr-date"></span>
      </div>
      <button class="efr-close" id="efr-close">✕ CLOSE</button>
      <div class="efr-progress" id="efr-progress"></div>
    </div>
    <div class="efr-scroll" id="efr-scroll">
      <div class="md-body" id="efr-body"></div>
      <div class="efr-end" id="efr-end">— EOF —</div>
    </div>`;
  document.body.appendChild(el);

  // progress bar on scroll
  const scroll   = document.getElementById('efr-scroll');
  const progress = document.getElementById('efr-progress');
  scroll.addEventListener('scroll', () => {
    const max = scroll.scrollHeight - scroll.clientHeight;
    if (max > 0) progress.style.width = (scroll.scrollTop / max * 100) + '%';
  }, { passive: true });

  // close button
  document.getElementById('efr-close').addEventListener('click', closeEssayFullscreen);

  // keyboard Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && el.classList.contains('active')) closeEssayFullscreen();
  });
}

function openEssayFullscreen(idx) {
  _ensureEssayFullscreenDOM();
  const essay = ESSAYS[idx];
  if (!essay) return;

  const content = t(essay.content, essay.content_zh || essay.content);
  const title   = t(essay.title,   essay.title_zh   || essay.title);

  document.getElementById('efr-title').textContent = title;
  document.getElementById('efr-date').textContent  = [essay.date, essay.readTime].filter(Boolean).join(' · ');
  document.getElementById('efr-body').innerHTML    =
    typeof marked !== 'undefined' ? marked.parse(content) : content.replace(/\n/g, '<br>');

  const scroll = document.getElementById('efr-scroll');
  scroll.scrollTop = 0;
  document.getElementById('efr-progress').style.width = '0%';

  const reader = document.getElementById('essay-fullscreen-reader');
  reader.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => reader.classList.add('active'));
}

function closeEssayFullscreen() {
  const reader = document.getElementById('essay-fullscreen-reader');
  if (!reader) return;
  reader.classList.remove('active');
  reader.setAttribute('aria-hidden', 'true');
}

// ── Toggle + scroll/swipe detection ─────────────────────

function bindEssayToggle() {
  document.querySelectorAll('.essay-header').forEach((header) => {
    header.addEventListener('click', () => {
      const item    = header.closest('.essay-item');
      const wasOpen = item.classList.contains('expanded');

      // close any open essay and remove old listeners
      _removeEssayScrollListeners();
      document.querySelectorAll('.essay-item.expanded').forEach(el => el.classList.remove('expanded'));

      if (!wasOpen) {
        item.classList.add('expanded');
        const idx = parseInt(item.dataset.essay, 10);

        // wait for the open animation, then arm scroll/swipe detection
        setTimeout(() => {
          const pb = document.getElementById('panel-body');
          if (!pb) return;

          // mouse wheel — any downward delta triggers fullscreen
          _efrScrollListeners.wheel = (e) => {
            if (e.deltaY > 0) {
              _removeEssayScrollListeners();
              openEssayFullscreen(idx);
            }
          };

          // touch swipe down (finger moves up on screen = content scrolls down)
          _efrScrollListeners.touchStart = (e) => {
            _efrTouchStartY = e.touches[0].clientY;
          };
          _efrScrollListeners.touchMove = (e) => {
            const dy = _efrTouchStartY - e.touches[0].clientY;
            if (dy > 38) {
              _removeEssayScrollListeners();
              openEssayFullscreen(idx);
            }
          };

          pb.addEventListener('wheel',      _efrScrollListeners.wheel,      { passive: true });
          pb.addEventListener('touchstart', _efrScrollListeners.touchStart, { passive: true });
          pb.addEventListener('touchmove',  _efrScrollListeners.touchMove,  { passive: true });
        }, 350); // let accordion animation finish first
      }
    });
  });
}

function buildMilestone() {
  const isZh = LANG === 'zh';

  const mindmap = `
  <div class="milestone-mindmap-wrap">
    <div class="mm-section-label">${isZh ? '// 知识领域' : '// KNOWLEDGE DOMAINS'}</div>
    <div class="mindmap-container">
      <svg class="mindmap-svg" viewBox="0 0 660 260" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <!-- Main trunk -->
        <line class="mm-trunk" pathLength="100"
          x1="60" y1="130" x2="460" y2="130"
          style="stroke-dasharray:100;stroke-dashoffset:100"/>
        <!-- Left junction dot -->
        <circle class="mm-dot mm-dot-left" cx="190" cy="130" r="3.5"/>
        <!-- Left vertical branches -->
        <line class="mm-vert mm-vert-top" pathLength="100"
          x1="190" y1="130" x2="190" y2="50"
          style="stroke-dasharray:100;stroke-dashoffset:100"/>
        <line class="mm-vert mm-vert-bot" pathLength="100"
          x1="190" y1="130" x2="190" y2="210"
          style="stroke-dasharray:100;stroke-dashoffset:100"/>
        <!-- Math extra branches: Code(upper), AI(mid), BC(lower) fan left from Math -->
        <path class="mm-branch mm-b-math-code" pathLength="100"
          d="M190,50 C145,35 100,20 60,15"
          style="stroke-dasharray:100;stroke-dashoffset:100"/>
        <path class="mm-branch mm-b-math-ai" pathLength="100"
          d="M190,50 C140,51 90,52 40,52"
          style="stroke-dasharray:100;stroke-dashoffset:100"/>
        <path class="mm-branch mm-b-math-bc" pathLength="100"
          d="M190,50 C145,65 100,80 60,88"
          style="stroke-dasharray:100;stroke-dashoffset:100"/>
        <!-- Math extra dots -->
        <circle class="mm-dot mm-dot-code" cx="60" cy="15" r="3"/>
        <circle class="mm-dot mm-dot-ai" cx="40" cy="52" r="3"/>
        <circle class="mm-dot mm-dot-bc" cx="60" cy="88" r="3"/>
        <!-- Lead extra branches: Comm(upper-left), Indep(lower-left) fan from Lead -->
        <path class="mm-branch mm-b-lead-comm" pathLength="100"
          d="M190,210 C145,195 100,182 60,172"
          style="stroke-dasharray:100;stroke-dashoffset:100"/>
        <path class="mm-branch mm-b-lead-indep" pathLength="100"
          d="M190,210 C135,215 90,222 50,225"
          style="stroke-dasharray:100;stroke-dashoffset:100"/>
        <circle class="mm-dot mm-dot-comm" cx="60" cy="172" r="3"/>
        <circle class="mm-dot mm-dot-indep" cx="50" cy="225" r="3"/>
        <!-- Terminal dots left -->
        <circle class="mm-dot mm-dot-math" cx="190" cy="50" r="3"/>
        <circle class="mm-dot mm-dot-lead" cx="190" cy="210" r="3"/>
        <!-- Right junction dot -->
        <circle class="mm-jdot" cx="460" cy="130" r="5"/>
        <!-- Right branches: invest & brain use elegant bezier curves -->
        <path class="mm-branch mm-b1" pathLength="100"
          d="M460,130 C492,130 502,52 580,52"
          style="stroke-dasharray:100;stroke-dashoffset:100"/>
        <line class="mm-branch mm-b2" pathLength="100"
          x1="460" y1="130" x2="580" y2="130"
          style="stroke-dasharray:100;stroke-dashoffset:100"/>
        <path class="mm-branch mm-b3" pathLength="100"
          d="M460,130 C492,130 502,208 580,208"
          style="stroke-dasharray:100;stroke-dashoffset:100"/>
        <!-- Terminal dots right -->
        <circle class="mm-dot mm-dot-invest"  cx="580" cy="52"  r="3"/>
        <circle class="mm-dot mm-dot-startup" cx="580" cy="130" r="3"/>
        <circle class="mm-dot mm-dot-brain"   cx="580" cy="208" r="3"/>
      </svg>
      <div class="mm-node mm-n-math">
        <div class="mm-icon-ring"><i class="fa-solid fa-calculator"></i></div>
        <span class="mm-lbl">${isZh ? '数学' : 'Math'}</span>
      </div>
      <div class="mm-node mm-n-ai">
        <div class="mm-icon-ring"><i class="fa-solid fa-robot"></i></div>
        <span class="mm-lbl">AI</span>
      </div>
      <div class="mm-node mm-n-bc">
        <div class="mm-icon-ring"><i class="fa-brands fa-bitcoin"></i></div>
        <span class="mm-lbl">${isZh ? '区块链' : 'Blockchain'}</span>
      </div>
      <div class="mm-node mm-n-code">
        <div class="mm-icon-ring"><i class="fa-solid fa-code"></i></div>
        <span class="mm-lbl">${isZh ? '编程' : 'Code'}</span>
      </div>
      <div class="mm-node mm-n-lead">
        <div class="mm-icon-ring"><i class="fa-solid fa-crown"></i></div>
        <span class="mm-lbl">${isZh ? '领导力' : 'Leadership'}</span>
      </div>
      <div class="mm-node mm-n-comm">
        <div class="mm-icon-ring"><i class="fa-solid fa-comments"></i></div>
        <span class="mm-lbl">${isZh ? '沟通' : 'Comm'}</span>
      </div>
      <div class="mm-node mm-n-indep">
        <div class="mm-icon-ring"><i class="fa-solid fa-user-secret"></i></div>
        <span class="mm-lbl">${isZh ? '独立' : 'Indep.'}</span>
      </div>
      <div class="mm-node mm-n-invest">
        <div class="mm-icon-ring"><i class="fa-solid fa-chart-line"></i></div>
        <span class="mm-lbl">${isZh ? '投资' : 'Invest'}</span>
      </div>
      <div class="mm-node mm-n-startup">
        <div class="mm-icon-ring"><i class="fa-solid fa-rocket"></i></div>
        <span class="mm-lbl">${isZh ? '创业' : 'Startup'}</span>
      </div>
      <div class="mm-node mm-n-brain">
        <div class="mm-icon-ring"><i class="fa-solid fa-brain"></i></div>
        <span class="mm-lbl">${isZh ? '思考' : 'Think'}</span>
      </div>
    </div>
  </div>`;

  let html = mindmap + `<div class="timeline">`;
  MILESTONES.forEach(section => {
    html += `<div class="timeline-section-label">${section.year}</div>`;
    section.items.forEach(item => {
      html += `
        <div class="timeline-item${item.major ? ' major' : ''}">
          <div class="timeline-dot"></div>
          <div class="timeline-date">${item.date}</div>
          <div class="timeline-item-title">${t(item.title, item.title_zh || item.title)}</div>
          <p class="timeline-item-desc">${t(item.desc, item.desc_zh || item.desc)}</p>
          <span class="timeline-item-tag">${item.tag}</span>
        </div>`;
    });
  });
  html += `</div>`;
  return html;
}

function buildReview() {
  const dimRows = REVIEW_DATA.dims.map(d => `
    <div class="review-dim">
      <span class="review-dim-name">${d.name}</span>
      <div class="review-dim-bar-wrap">
        <div class="review-dim-bar">
          <div class="review-dim-fill" style="width:${(d.score / 30) * 100}%"></div>
        </div>
        <span class="review-dim-score">${d.score} / 30</span>
      </div>
    </div>`).join('');

  return `
    <div class="review-layout">
      <div class="review-chart-wrap">
        <canvas id="radar-chart"></canvas>
      </div>
      <div class="review-meta">
        <div class="review-period">// ${REVIEW_DATA.period} — ${t('System Review', '系统复盘')}</div>
        <div class="review-dim-list">${dimRows}</div>
      </div>
    </div>`;
}

function initRadarChart() {
  const ctx = document.getElementById('radar-chart');
  if (!ctx || typeof Chart === 'undefined') return;

  const labels = REVIEW_DATA.dims.map(d => d.name);
  const data   = REVIEW_DATA.dims.map(d => d.score);

  radarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: '#00D4FF',
        backgroundColor: 'rgba(0, 212, 255, 0.12)',
        borderWidth: 2.5,
        pointBackgroundColor: '#00D4FF',
        pointBorderColor: 'rgba(255, 255, 255, 0)',
        pointRadius: 5,
        pointHoverRadius: 7,
      }],
    },
    options: {
      scales: {
        r: {
          beginAtZero: true,
          min: 0,
          max: 30,
          ticks: {
            stepSize: 5,
            display: false,
          },
          grid: {
            color: 'rgba(0, 212, 255, 0.15)',
            lineWidth: 1.2,
          },
          angleLines: {
            color: 'rgba(0, 212, 255, 0.12)',
            lineWidth: 1,
          },
          pointLabels: {
            color: 'rgba(170, 170, 170, 0.9)',
            font: {
              family: "'Inter', 'Helvetica Neue', Arial, sans-serif",
              size: 12,
              weight: '400',
            },
          },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(10, 10, 10, 0.92)',
          borderColor: 'rgba(0, 212, 255, 0.4)',
          borderWidth: 1.5,
          titleColor: '#00D4FF',
          bodyColor: '#aaaaaa',
          titleFont: { family: 'Courier New', size: 11, weight: 'normal' },
          bodyFont: { family: 'Inter', size: 12 },
          padding: 10,
          callbacks: {
            title: (items) => items[0].label.toUpperCase(),
            label: (item) => `  Score: ${item.raw} / 30`,
          },
        },
      },
    },
  });
}
