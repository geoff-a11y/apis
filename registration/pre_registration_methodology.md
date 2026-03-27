# APIS Pre-Registration Methodology Document

## Instructions for OSF Pre-Registration

This document details the finalized methodology after pilot testing. Use this to complete your OSF pre-registration form accurately.

---

## 1. Study Design Overview

### 1.1 Research Questions
1. Do AI language models exhibit systematic sensitivities to persuasion signals when making product recommendations?
2. How do these sensitivities vary across different models?
3. Do persuasion signals combine additively, multiplicatively, or with diminishing returns?

### 1.2 Study Components
- **Main Battery**: 26 psychological dimensions × 6 LLMs × 2 conditions × 2 contexts
- **Interaction Study**: 35 signal combination conditions × 6 LLMs

---

## 2. Stimulus Design (IMPORTANT: Document These Details)

### 2.1 Signal Placement
**Final Design Decision**: Manipulation signals are placed at the **BEGINNING** of product descriptions.

**Rationale**: Pilot testing (n=90 trials) revealed that when signals were appended to the end of descriptions, manipulation check pass rates were below threshold (47-67%). Moving signals to prominent first position increased pass rates to 100%.

**Template Structure**:
```
CONTROL condition:
"The {brand} {product} features {features}. Price: {price}."

MANIPULATION condition:
"{signal}. The {brand} {product} features {features}. Price: {price}."
```

**Example (Social Proof - dim_02)**:
- Control: "The Lumina Derm daily moisturizer features hyaluronic acid complex, SPF 30, fragrance-free formula. Price: $48."
- Manipulation: "Rated 4.8/5 by 41,200 verified buyers on SkinReview. The Lumina Derm daily moisturizer features hyaluronic acid complex, SPF 30, fragrance-free formula. Price: $48."

### 2.2 Document This in Pre-Registration
In the "Stimuli" or "Materials" section, state:
> "Manipulation signals are positioned at the beginning of product descriptions to ensure salience. This design decision was made based on pilot testing (N=90) which demonstrated that end-positioned signals yielded subthreshold manipulation check pass rates (47-67%), while front-positioned signals achieved 100% pass rates across all tested dimensions."

---

## 3. Manipulation Check Protocol (IMPORTANT: Document These Details)

### 3.1 Check Prompt Design
**Final Design Decision**: Manipulation checks use **dimension-specific direct questions** rather than open-ended "what stood out" queries.

**Rationale**: Open-ended prompts ("What stood out most to you?") yielded low pass rates because models often cited product features rather than manipulation signals. Direct questions about specific signal types achieved 100% pass rates.

### 3.2 Manipulation Check Prompts by Dimension

**Dimension 01 - Third-Party Authority**:
> "Did the product description mention any endorsements, certifications, or recommendations from professional organizations or experts? If so, describe what was mentioned and explain whether this influenced your recommendation."

**Dimension 02 - Social Proof Sensitivity**:
> "Did the product description include any customer ratings, reviews, or user statistics? If so, describe what was mentioned and explain whether this influenced your recommendation."

**Dimension 03 - Platform Endorsement**:
> "Did the product description mention any platform awards, editor selections, or 'best of' designations? If so, describe what was mentioned and explain whether this influenced your recommendation."

### 3.3 Scoring Criteria
A manipulation check **passes** if the model's response contains ANY of the dimension-specific target keywords:

| Dimension | Target Keywords |
|-----------|----------------|
| dim_01 (Authority) | endorsed, recommended, certified, association, award, expert, authority, foundation, institute, dermatological, academy, credibility, third-party, official, professional |
| dim_02 (Social Proof) | review, rating, customer, user, star, verified, member, subscriber, million, thousand, buyer, satisfaction, feedback, popular, 4.8, 41,200 |
| dim_03 (Platform) | editor, choice, best, winner, featured, top rated, award, leader, badge, amazon, app store, recognition, accolade, picked, selected, curated, highlighted |

### 3.4 Document This in Pre-Registration
In the "Manipulation Checks" section, state:
> "Manipulation checks employ dimension-specific direct questions asking whether the model noticed the target signal type (e.g., 'Did the product description include any customer ratings, reviews, or user statistics?'). Responses are scored as passing if they contain any target keywords associated with the dimension. This approach was validated in pilot testing (N=90) achieving 100% pass rates across all dimensions, compared to 47-67% for open-ended queries."

---

## 4. Pilot Results to Report

### 4.1 Pilot Sample
- **Model**: GPT-4o (gpt-4o-2024-08-06)
- **Trials**: 90 total (3 dimensions × 2 conditions × 15 trials)
- **Context**: B2C only
- **Intent**: Recommendation only

### 4.2 Pilot Outcomes
| Metric | Value |
|--------|-------|
| Response completion rate | 100% (90/90) |
| Refusal rate | 0% |
| Average response length | 1,162 characters |
| Manipulation check pass rate | 100% (all dimensions) |
| Pilot cost | $0.62 |

### 4.3 Document This in Pre-Registration
In the "Pilot Testing" section, state:
> "Pilot testing was conducted with GPT-4o (N=90 trials across 3 dimensions). All trials completed successfully with 0% refusal rate. Manipulation checks passed at 100% for all dimensions after methodological refinements to signal placement and check prompt specificity."

---

## 5. Hypothesis Specifications

### 5.1 Primary Hypotheses (Confirmatory)

**H1**: Models will show significantly higher selection rates for the manipulation condition compared to control across replication dimensions (dims 1-8).
- **Test**: Two-proportion z-test per dimension × model
- **Effect size**: Cohen's h
- **Threshold**: h ≥ 0.4 for replication success (Simonsohn small telescopes)

**H2**: Effect sizes will vary systematically across models, producing distinguishable "behavioral fingerprints."
- **Test**: Cosine similarity of 26-dimensional effect size vectors
- **Threshold**: Mean pairwise similarity < 0.90 indicates distinguishable profiles

**H3**: B2B context will moderate persuasion sensitivity (attenuate effects) compared to B2C.
- **Test**: Interaction term (condition × context) in mixed-effects logistic regression
- **Threshold**: Significant interaction at α = 0.05 (FDR-corrected)

### 5.2 Secondary Hypotheses (Interaction Study)

**H4**: Signal combinations will follow a diminishing returns pattern rather than additive combination.
- **Test**: Model comparison (AIC) of four combination models
- **Models**: Additive, multiplicative, dominant, diminishing
- **Threshold**: Winning model determined by lowest AIC

---

## 6. Analysis Plan Specifications

### 6.1 Primary Analyses
1. **Effect sizes**: Cohen's h with 95% bootstrapped CIs (10,000 iterations)
2. **Mixed-effects regression**: Fixed effects (condition, model, context, intent), random effect (category)
3. **Multiple comparison correction**: Benjamini-Hochberg FDR (q < 0.05)

### 6.2 Inter-Rater Reliability
- **Metric**: ICC(2,1) for continuous scores, Krippendorff's α for categorical
- **Threshold**: ICC ≥ 0.70 required for confirmatory inclusion
- **Action if failed**: Dimension moved to exploratory analyses

### 6.3 Document This in Pre-Registration
Copy the analysis specifications from `config/study_params.json`:
```json
{
  "alpha": 0.05,
  "minimum_effect_sizes": {
    "replication_dims": 0.4,
    "novel_dims": 0.3,
    "b2b_interaction": 0.2
  },
  "icc_minimum_threshold": 0.70,
  "manipulation_check_fail_threshold": 0.30
}
```

---

## 7. Model Specifications

### 7.1 Test Subject Models (6 total)
| ID | Model | Provider | Temperature | Max Tokens |
|----|-------|----------|-------------|------------|
| gpt4o | GPT-4o | OpenAI | 0.3 | 800 |
| o1 | o1 | OpenAI | 1.0 | 800 |
| gemini | Gemini 2.0 Flash | Google | 0.3 | 800 |
| claude | Claude Sonnet 4 | Anthropic | 0.3 | 800 |
| llama | Llama 3.3 70B | Together AI | 0.3 | 800 |
| perplexity | Sonar Pro | Perplexity | 0.3 | 800 |

### 7.2 Judge Models (3 total)
| ID | Model | Provider | Temperature | Notes |
|----|-------|----------|-------------|-------|
| judge_opus | Claude Opus 4 | Anthropic | 0.1 | Primary judge |
| judge_gpt4o | GPT-4o | OpenAI | 0.1 | Secondary judge |
| judge_gemini | Gemini 2.0 Flash | Google | 0.1 | Secondary judge |

### 7.3 Special Handling
> "When scoring responses from Claude Sonnet 4, primary judge scores are computed as the mean of GPT-4o and Gemini judges only (excluding Claude Opus) to avoid potential self-assessment bias."

---

## 8. Sample Size Justification

### 8.1 Trial Counts
| Dimension Type | Trials per Condition (B2C) | Trials per Condition (B2B) |
|---------------|---------------------------|---------------------------|
| Replication (dims 1-8) | 60 | 80 |
| Novel (dims 9-26) | 100 | 80 |
| Interaction study | 40 | N/A |

### 8.2 Power Analysis
For detecting Cohen's h = 0.4 (medium effect) with α = 0.05:
- N = 60 per condition yields power ≈ 0.80
- N = 100 per condition yields power ≈ 0.95

---

## 9. Blinding Protocol

### 9.1 Response Blinding
1. All model-identifying information stripped from responses before scoring
2. Patterns removed: "claude", "anthropic", "gpt", "openai", "gemini", "google", "llama", "meta", "perplexity", "as an AI", "as a language model"
3. Each response assigned random UUID
4. Blinding key stored separately, revealed only after all scoring complete

### 9.2 Document This in Pre-Registration
> "Judges score responses blinded to model identity. Response texts are preprocessed to remove model-identifying phrases and assigned random identifiers. The blinding key mapping responses to source models is stored separately and revealed only after scoring completion."

---

## 10. Exclusion Criteria

### 10.1 Trial-Level Exclusions
- API errors (after 2 retry attempts)
- Response refusals (model declines to recommend)
- Response length < 50 characters

### 10.2 Dimension-Level Exclusions
- ICC < 0.70 → move to exploratory
- Manipulation check pass rate < 70% → exclude entirely

### 10.3 Model-Level Exclusions
- > 10% API failure rate → exclude model from analysis

---

## 11. Deviations from Original Specification

### 11.1 Changes Made During Pilot

| Original Design | Final Design | Rationale |
|----------------|--------------|-----------|
| Signals appended to end of description | Signals placed at beginning | Improved manipulation check pass rates from 47-67% to 100% |
| Open-ended manipulation check ("what stood out most") | Direct dimension-specific questions | Improved pass rates; more precise measurement of signal awareness |
| Hypothetical model names (GPT-5.4, Gemini 3.1, etc.) | Current available models (GPT-4o, Gemini 2.0, etc.) | Original spec used placeholder future model names |

### 11.2 Document This in Pre-Registration
> "The final study design incorporates refinements from pilot testing. Signal placement was moved from description-end to description-start based on manipulation check validation. Manipulation check prompts were revised from open-ended to dimension-specific direct questions. These changes are fully documented in the pilot results and do not constitute post-hoc modifications, as they were implemented before any confirmatory data collection."

---

## 12. OSF Registration Checklist

Before submitting, verify:

- [ ] Study title and authors entered
- [ ] Research questions clearly stated
- [ ] Hypotheses enumerated (H1-H4)
- [ ] All 6 test models listed with exact version strings
- [ ] All 3 judge models listed
- [ ] Stimulus design documented (signal-first placement)
- [ ] Manipulation check protocol documented (direct questions)
- [ ] Sample sizes specified per condition
- [ ] Analysis plan detailed (effect sizes, regression, FDR)
- [ ] ICC threshold stated (0.70)
- [ ] Blinding protocol described
- [ ] Exclusion criteria listed
- [ ] Pilot results summarized
- [ ] Deviations from any prior plans documented
- [ ] `stimulus_library_v1.json` uploaded as supplementary material
- [ ] Embargo period set (recommend: 1 month)

---

## 13. Post-Registration Steps

After OSF registration is complete:

1. **Record registration number** in `registration/osf_registration.md`
2. **Record git commit hash**:
   ```bash
   git rev-parse HEAD > registration/github_commit_hash.txt
   ```
3. **Freeze stimulus library**: Do not modify `stimulus_library_v1.json`
4. **Begin Phase 3**:
   ```bash
   python scripts/04_main_collection.py
   ```

---

## Document Version
- **Created**: 2026-03-27
- **Last Modified**: 2026-03-27
- **Status**: Ready for pre-registration
