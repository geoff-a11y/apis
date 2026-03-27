# APIS — Agent Psychology Intelligence System

A foundational research study measuring AI agent purchase psychology across 26 dimensions and 6 LLMs.

## Overview

APIS conducts two studies:
1. **Main Battery**: Tests 26 psychological dimensions across 6 LLM models in B2C and B2B contexts
2. **Signal Interaction Study**: Examines how persuasion signals combine (additive, multiplicative, diminishing)

## Quick Start

```bash
# 1. Setup environment
cp .env.example .env
# Edit .env with your API keys

# 2. Install dependencies
pip install -r requirements.txt

# 3. Verify API access
python scripts/utils/api_client.py --test-all

# 4. Build stimuli
python scripts/01_build_stimuli.py
```

## Project Structure

```
APIS/
├── config/           # Model configs, dimensions, study parameters
├── stimuli/          # Stimulus files and templates
├── scripts/          # All processing scripts
├── data/             # Raw responses, scored data, analysis outputs
├── outputs/          # Final analysis outputs and figures
└── registration/     # OSF pre-registration materials
```

## Research Phases

| Phase | Script | Description |
|-------|--------|-------------|
| 0 | `01_build_stimuli.py` | Generate and validate all stimulus prompts |
| 1 | `02_pilot_run.py` | Pilot study (GPT-5.4 only, 15 trials/condition) |
| 2 | `03_manipulation_checks.py` | Validate manipulation effectiveness |
| 3 | `04_main_collection.py` | Full data collection (6 models) |
| 3 | `05_interaction_study.py` | Signal combination study |
| 4 | `06_judge_scoring.py` | Three-judge blind scoring |
| 4 | `07_icc_analysis.py` | Inter-rater reliability |
| 4 | `08_main_analysis.py` | Pre-registered analysis |
| 4 | `09_interaction_analysis.py` | Interaction model fitting |

## Models Tested

- GPT-5.4 (OpenAI)
- o3 (OpenAI)
- Gemini 3.1 Pro (Google)
- Claude Sonnet 4.6 (Anthropic)
- Llama 4 Scout (Together AI)
- Perplexity Sonar Pro

## Dimensions

26 dimensions across 6 clusters:
- **Cluster A** (1-8): Replication dimensions from Filandrianos et al. 2025
- **Cluster B** (9-11): Value-based dimensions (sustainability, privacy, local)
- **Cluster C** (12-15): Risk and assurance
- **Cluster D** (16-19): Information processing
- **Cluster E** (24-26): Choice architecture
- **Cluster F** (20-23): Agentic behaviors (multi-turn)

## Pre-Registration

This study is pre-registered on OSF. See `registration/osf_registration.md` for details.

## License

Research use only. Contact authors for commercial licensing.
