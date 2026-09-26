# History

> **This is not a portfolio.**

An archive of early code, experiments, prototypes, and project snapshots from **Charles Tao / Stickman Charles**.

Some of the code here is incomplete.  
Some of it is incorrect.  
Some of it would never pass review today.

That is the point.

This repository exists to preserve the path from early programming experiments to larger systems — without rewriting the past to make it look cleaner than it was.

---

## Why this repository exists

In September 2026, while setting up an old **MacBook Pro**, I found a collection of code from earlier stages of my development journey.

Some projects had already been published to GitHub and still had verifiable commit history.

Others had lived only on my local machine and had **never been committed to GitHub before**.

Instead of cleaning them up, rewriting them, or deleting the embarrassing parts, I decided to archive them.

The goal is simple:

**preserve the evidence of how things changed.**

Not just the finished products.

---

## Archive structure

```text
History/
├── charles/
│   ├── Python test1/
│   ├── practice/
│   ├── height app/
│   ├── hp_web_runner/
│   └── StoryForgeDAO/
│
├── Height-App-by-Charles-Tao/
├── Personal-website/
│
├── EchoForge-DAO MVP/
├── EchoForge-DAO- MVP-v2/
├── EchoForge-DAO-main/
│
├── total-commit.md
└── LICENSE
```

The folders represent different snapshots and stages rather than one continuous codebase.

---

## Early local code

The `charles/` directory contains code recovered from my old MacBook.

Examples include:

### `Python test1`

Very early Python experiments.

Some files contain incomplete syntax and unfinished ideas.

For example, this stage predates any real project structure or consistent Git workflow.

---

### `practice`

Small programming experiments and attempts to understand how different technologies fit together.

Some experiments are technically wrong — including code that mixes concepts that should have been separated into different layers.

They are intentionally preserved unchanged.

---

### `height app`

An early C++ version of a height prediction tool.

This was one of the first points where the code started moving beyond isolated syntax practice toward something resembling an actual application:

- user input
- functions
- unit conversion
- input normalization
- error handling
- formatted output

It later evolved into a web application.

---

### `hp_web_runner`

The web version of the height prediction project.

This introduced a larger application structure including:

- Python
- web backend
- HTML / CSS
- tests
- Docker
- deployment configuration

This project later received its own GitHub repository and therefore has independently preserved Git history.

---

### `StoryForgeDAO`

An early Streamlit prototype for a blockchain-based collaborative storytelling platform.

It experimented with concepts such as:

- proposal submission
- voting
- creator rewards
- community participation
- NFT-style identity / rewards
- settlement logic

StoryForgeDAO later became part of the conceptual origin of **EchoForge**.

---

## From StoryForgeDAO to EchoForge（https://stickmancharles.com/journal/from-storyforgedao-to-echoforge）

The early idea behind StoryForgeDAO was relatively narrow: collaborative storytelling.

The next step was to generalize the model.

That produced the first **EchoForge DAO MVP**.

Early versions experimented with a broader creator platform combining:

- content publishing
- community promotion
- rewards
- blockchain anchoring
- creator economics
- StoryForge as a possible submodule

The idea changed substantially afterward.

EchoForge eventually moved away from the original “Web3 content platform” concept and evolved into a different product architecture.

That change is exactly why the old versions are preserved here.

They show that projects do not emerge fully formed.

They mutate.

---

## Git-backed history

Some archived projects originally existed on GitHub.

Their original commit information is preserved in:

[`total-commit.md`](./total-commit.md)

Examples include:

| Date | Project | Event |
|---|---|---|
| 2025-12-21 | Height App / HP Web Runner | Initial Git commit |
| 2025-12-22 | Height App | README update |
| 2026-02-24 | Height App | Visual refactor |
| 2026-02-28 | Personal Website | Initial commits |
| 2026-03-07 | Personal Website | Major website iteration |
| 2026-03-13 | Personal Website | Structural cleanup and essay work |
| 2026-03-13 | EchoForge DAO | Full project structure uploaded |

For these projects, the original commit hashes and dates provide a stronger historical record than filesystem timestamps alone.

---

## Local-only recovered code

Not everything in this repository has original Git history.

In particular, parts of:

```text
charles/Python test1/
charles/practice/
charles/height app/
charles/StoryForgeDAO/
```

were recovered from local storage and had **never previously been committed to GitHub**.

Therefore:

> The commit date of this archive repository must **not** be interpreted as the original creation date of those files.

Where original Git history exists, `total-commit.md` records it.

Where it does not exist, the code is preserved as a recovered artifact without inventing a precise historical date.

---

## Preservation rules

This repository follows a few simple rules.

### 1. Do not rewrite old code

Historical code should remain historically accurate.

Do not “improve” old files merely because better approaches are known today.

---

### 2. Bugs are part of the record

Syntax errors, architectural mistakes, awkward naming, duplicated logic, and abandoned ideas are not automatically removed.

They show what I understood — and did not understand — at that point.

---

### 3. Separate history from current work

This repository is an archive.

It is not the source of truth for current versions of my projects.

Current development lives in their respective active repositories.

---

### 4. Do not invent dates

A Git commit date is evidence.

A recovered file is evidence.

But a current archive commit is not evidence of when an old local file was originally written.

Unknown dates remain unknown.

---

## Why preserve bad code?

Because polished repositories hide most of the process.

Looking only at finished work can create the illusion that capability appeared suddenly.

It did not.

There were broken scripts before applications.

There were applications before systems.

There were confused architectures before clearer ones.

There were abandoned ideas before better product decisions.

The interesting part is not that the early code was good.

It wasn't.

The interesting part is the delta.

---

## Current work

Today, my work is organized primarily around:

- **Stickman Charles** — writing, thinking, and my long-term personal platform
- **EchoForge** — a real-world builder environment for products, infrastructure, and experiments
- open-source engineering
- AI-assisted software development
- hardware + software systems
- long-term technical learning

This repository is the archaeological layer underneath those projects.

---

## About

**Charles Tao**  
Stickman Charles

Website: [stickmancharles.com](https://stickmancharles.com)

GitHub: [Charlie0113-T](https://github.com/Charlie0113-T)

---

## License

Unless otherwise stated, the source code in this repository is licensed under the **Apache License 2.0**.

See [`LICENSE`](./LICENSE) for the full license text.

Historical third-party dependencies, frameworks, libraries, or assets retain their respective licenses.

---

<p align="center">
  <sub>
    Preserve the mistakes. Measure the delta.
  </sub>
</p>
