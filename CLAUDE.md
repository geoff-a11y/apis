# APIS — Agent Psychology Intelligence System
## Claude Code Instructions

This project runs the APIS foundational research study and signal interaction study.
It measures AI agent purchase psychology across 26 dimensions and 6 LLMs.
Read this file in full before writing any code or running any commands.

---

## PRE-REGISTRATION REMINDER

The user will complete OSF pre-registration manually before running Phase 3.
This is their responsibility — no code gate enforces it.

When Phase 3 is about to run, print a one-line reminder at startup:
  "Reminder: confirm OSF pre-registration is complete before this run counts."

That is all. Do not block execution. The user knows what they are doing.

---

## Running order

```
Phase 0 — Setup (do this now):
  python scripts/utils/api_client.py --test-all
  python scripts/01_build_stimuli.py
  → Review outputs, fix any schema errors
  → Inspect stimulus_library_v1.json

Phase 1 — Pilot (run before pre-registration):
  python scripts/02_pilot_run.py --dimension all
  python scripts/03_manipulation_checks.py
  → If any dimension fails manipulation check, stop and redesign
  → Re-run pilot on redesigned dimensions only

Phase 2 — Pre-registration (user handles this externally):
  → User completes OSF registration at osf.io before Phase 3
  → User records number in registration/osf_registration.md
  → 1-month embargo recommended

Phase 3 — Main data collection:
  python scripts/04_main_collection.py
  → Estimated runtime: 8–12 hours
  → Monitor progress output
  → Script is resumable if interrupted

  python scripts/05_interaction_study.py
  → Can run in parallel with or after main collection
  → Estimated runtime: 2–3 hours

Phase 4 — Scoring and analysis:
  python scripts/06_judge_scoring.py
  python scripts/07_icc_analysis.py
  → Review ICC results. Flag any dimension below 0.70.
  python scripts/08_main_analysis.py
  python scripts/09_interaction_analysis.py

Phase 5 — Output review:
  → Review outputs/ directory
  → Confirm all pre-registered hypotheses have been tested
  → Label any additional analyses as EXPLORATORY
```

---

## Environment setup

### Step 1: Create .env file

```bash
cp .env.example .env
```

Then edit `.env` and add all API keys.

### Step 2: Install dependencies

```bash
pip install -r requirements.txt
```

### Step 3: Verify model access

```bash
python scripts/utils/api_client.py --test-all
```

This runs a single "hello world" call to each of the 6 models and prints
latency + cost estimate. Do not proceed until all 6 pass.

---

## Models tested

**Test subjects (6 models):**
- GPT-5.4 (OpenAI)
- o3 (OpenAI)
- Gemini 3.1 Pro (Google)
- Claude Sonnet 4.6 (Anthropic)
- Llama 4 Scout (Together AI)
- Perplexity Sonar Pro

**Judge models (3 models):**
- Claude Opus 4.6 (primary judge)
- GPT-5.4
- Gemini 3.1 Pro

---

## 26 Dimensions

### Cluster A — Replication (dims 1-8)
Based on Filandrianos et al. 2025 findings.

### Cluster B — Value-Based (dims 9-11)
Sustainability, privacy, local preference.

### Cluster C — Risk and Assurance (dims 12-15)
Novelty, risk aversion, warranty, returns.

### Cluster D — Information Processing (dims 16-19)
Negative reviews, recency, specificity, comparison framing.

### Cluster E — Choice Architecture (dims 24-26)
Ethics, defaults, loss framing.

### Cluster F — Agentic Behaviors (dims 20-23)
Multi-turn interaction patterns.

---

## Key design decisions

1. **Blinding protocol**: All responses stripped of model identifiers before judge scoring
2. **Three-judge consensus**: Claude Opus, GPT-5.4, and Gemini all score each response
3. **Special handling**: Claude responses scored by GPT-5.4 + Gemini (not Opus) as primary
4. **Resumability**: All scripts check for existing data before making API calls
5. **Cost tracking**: All costs logged to data/cost_log.csv
6. **Write-once raw data**: Never overwrite or delete raw response files

---

## Error handling standards

Every script must:
- Log all errors to data/logs/
- Continue processing when single API calls fail
- Never retry more than 2 times per trial
- Ask for confirmation if estimated cost exceeds $50
- Print warning if total project cost exceeds $800

---

## Data integrity rules

- Raw response files are write-once
- Every response includes exact prompt, model string, timestamp
- blinding_key.json must exist before scoring
- Never delete from data/raw/ — flag failed trials instead
- Run validators.py --check-completeness before analysis
