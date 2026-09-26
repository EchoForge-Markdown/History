## 快速概览

这个仓库包含若干小工具与一个简单的 web-based C++ 运行器（位于 `hp_web_runner/`）。AI 代理在本仓库中常见任务包括：修复或扩展 `hp_web_runner` 的后端/前端、识别安全风险、以及定位小型 C++ 示例程序。

核心事实（可被代码直接验证）：
- 后端是一个最小 Flask 应用：`hp_web_runner/app.py`，在根路由渲染 `templates/index.html` 并在 `/run` 接受 POST 请求。
- POST `/run` 的实现流程：把表单字段 `code` 写入 `temp.cpp`（相对工作目录），调用 `g++ temp.cpp -o temp` 编译，然后以 `./temp` 运行，设置超时 5 秒并捕获 stdout/stderr（参见 `app.py`）。
- 前端示例在 `hp_web_runner/templates/index.html`：使用表单直接 POST 到 `/run` 并在页面展示 `output` 或 `error`。
- 仓库在运行时依赖系统的 `g++`（用于编译）以及 Python 的 `Flask` 包。仓库内没有 requirements.txt，运行需自行安装依赖。

## 立即可用的开发/运行命令
- 进入运行器目录并启动开发服务器（macOS / zsh）：

    推荐在仓库根以模块方式启动（避免相对导入问题）：

        # 从仓库根运行（确保当前目录是仓库根）
        python3 -m hp_web_runner.app

    或者在进入目录后以脚本方式运行（注意相对导入可能出错）：

        cd hp_web_runner
        python3 app.py

- 如果没有 Flask：

    python3 -m pip install flask

- 原始编译/运行流程（与后端行为等价）示例（可用于自动化测试）:

    # 将要运行的 C++ 写入 temp.cpp
    g++ temp.cpp -o temp
    ./temp  # 注意：app.py 会对执行加 timeout=5s

## 关键文件与修改点（快速导航）
- `hp_web_runner/app.py` — 主要逻辑。重要行/行为：写入 `temp.cpp`、调用 `g++`、使用 `subprocess.run(..., timeout=5)`、返回 JSON `{output, error}`。
- `hp_web_runner/templates/index.html` — 页面表单和 JS fetch；前端直接将表单 body 作为 POST 发送，不做额外包装。
- `hp_web_runner/temp.cpp` — 仓库下存在同名文件；注意运行时 `app.py` 会覆盖或创建此文件（依赖当前工作目录）。

## 可修改的常见点（在哪里改，如何改）
- 要更改超时或编译参数：修改 `app.py` 中 `subprocess.run(['g++', 'temp.cpp', '-o', 'temp'], ...)` 或 `timeout=5` 参数。
- 如果需要把临时文件放到其他位置：修改写文件路径（目前是相对路径 `temp.cpp` 和 `./temp`），并更新工作目录说明。

## 可观察的约定与坑（Agent 应知道）
- 单体（monolith）结构：Flask app 与静态模板在同一目录，未使用蓝图或包结构；因此编辑 `app.py` 会直接影响运行行为。
- 无认证/无沙箱：`/run` 会编译并执行任意上传的 C++ 代码（仓库中可见）。这是一个显著的安全/权限边界——任何修复或新增功能应考虑其安全后果并在提交说明中提醒人类审查者。
- 依赖隐式：没有 `requirements.txt` 或容器，依赖需手工安装（Flask、系统 g++）。

## 示例：如何为该仓库编写补丁或实现特性
- 场景：将编译日志包含到返回 JSON 中
  - 打开 `hp_web_runner/app.py`，查找 `compile_process = subprocess.run(...)`，在返回错误时，将 `compile_process.stderr` 以 `compile_error` 字段返回；保持现有 `error` 字段兼容。

## 与其它文件/脚本的关系
- 仓库根下还有若干单文件/实验脚本（例如 `24to12.py`, `Protect our earth.py`, `height app/v1/v1.cpp` 等），它们通常是独立的小工具或示例，修改时请确认不影响 `hp_web_runner` 的相对路径假设。

## 交付与验证要点（Agent 应做的最小验证）
- 修改后能否启动 Flask：在 `hp_web_runner` 目录运行 `python3 app.py`，访问 http://127.0.0.1:5000/ 查看页面是否能加载。
- 与后端交互：用页面表单或 curl POST 一个小示例 C++（`cin`/`cout`）并确认返回 JSON 中 `output` 为预期。
- 编译/运行失败时保留原始 stderr（app.py 当前实现把 `stderr` 作为 `error` 返回）。

## 新增：身高预测功能与测试
- 新增后端模块 `hp_web_runner/height.py`，提供 `normalize_gender`, `to_cm`, `predict_height`，并由 `hp_web_runner/app.py` 的 `/height` 路由使用。
- 新增前端表单在 `hp_web_runner/templates/index.html`（页面底部）用于交互式预测。
- 运行测试：在 `hp_web_runner` 目录内安装 pytest 并运行：

        python3 -m pip install pytest
        python3 -m pytest -q

- 使用 curl + jq 验证 `/height`：

        curl -sS -X POST http://127.0.0.1:5000/height \
            -H "Content-Type: application/json" \
            -d '{"gender":"男","father_height":180,"father_unit":"cm","mother_height":165,"mother_unit":"cm"}' | jq

    或不安装 jq 时使用 Python 格式化：

        curl -sS -X POST http://127.0.0.1:5000/height \
            -H "Content-Type: application/json" \
            -d '{"gender":"男","father_height":180,"father_unit":"cm","mother_height":165,"mother_unit":"cm"}' | python3 -m json.tool

---

如果有特定偏好（例如希望我添加 `requirements.txt`、把临时文件移到 `tmp/`、或把运行器改为使用容器），告诉我你想优先做的更改，我会基于此更新文档并可以提交相应 PR。
