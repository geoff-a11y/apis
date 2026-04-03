"""
Core scoring logic for APIS.
Fetches URL content, detects signals, and calculates ML scores.
"""

import re
import json
import uuid
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from pathlib import Path

from models import (
    MLScore,
    SignalPresence,
    SignalInteraction,
    ZoneContribution,
    Recommendation,
)

# Import advanced scraper with fallback strategies
from scraper import fetch_url_content, validate_url


# Load dimension and effect size data with validation
DATA_DIR = Path(__file__).parent.parent / "data"

def load_json_safe(filepath: Path, default: list) -> list:
    """Load JSON file with validation and fallback."""
    if not filepath.exists():
        import logging
        logging.warning(f"Data file not found: {filepath}")
        return default
    try:
        with open(filepath) as f:
            data = json.load(f)
            if not isinstance(data, list):
                raise ValueError(f"Expected list in {filepath}")
            return data
    except (json.JSONDecodeError, ValueError) as e:
        import logging
        logging.error(f"Failed to load {filepath}: {e}")
        return default

DIMENSIONS = load_json_safe(DATA_DIR / "dimensions.json", [])
EFFECT_SIZES = load_json_safe(DATA_DIR / "effect_sizes.json", [])

# Create dimension lookup
DIM_LOOKUP = {d["id"]: d for d in DIMENSIONS}

# Create effect size lookup by dimension and model
EFFECT_LOOKUP: Dict[str, Dict[str, float]] = {}
for effect in EFFECT_SIZES:
    dim_id = effect["dimension_id"]
    model_id = effect["model_id"]
    cohen_h = effect["cohen_h"]

    if dim_id not in EFFECT_LOOKUP:
        EFFECT_LOOKUP[dim_id] = {}
    EFFECT_LOOKUP[dim_id][model_id] = cohen_h


# Model IDs from the research study
MODEL_IDS = ["claude", "gemini", "gpt54", "llama", "o3", "perplexity"]


# Load interaction coefficients from research study
def load_interaction_coefficients() -> Dict:
    """Load interaction coefficients for signal combination modeling."""
    filepath = DATA_DIR / "interaction_coefficients.json"
    if not filepath.exists():
        import logging
        logging.warning(f"Interaction coefficients not found: {filepath}")
        return {"baselines": {}, "combination_analyses": {}}
    try:
        with open(filepath) as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        import logging
        logging.error(f"Failed to load interaction coefficients: {e}")
        return {"baselines": {}, "combination_analyses": {}}

INTERACTION_DATA = load_interaction_coefficients()
BASELINES = INTERACTION_DATA.get("baselines", {})
COMBINATION_ANALYSES = INTERACTION_DATA.get("combination_analyses", {})

# Signal combination mapping (dimension IDs that form known combinations)
# Based on the interaction study conditions
POSITIVE_PAIR_SIGNALS = [
    ("dim_01", "dim_02"),  # authority + social_proof
    ("dim_03", "dim_01"),  # platform + authority
    ("dim_02", "dim_06"),  # social_proof + brand
    ("dim_05", "dim_04"),  # anchoring + scarcity
    ("dim_07", "dim_08"),  # free_trial + bundle
    ("dim_06", "dim_01"),  # brand + authority
]

NEGATIVE_PAIR_SIGNALS = [
    ("dim_06", "dim_05"),  # brand + anchoring (undermines premium)
    ("dim_04", "dim_07"),  # scarcity + free_trial (conflicting urgency)
    ("dim_01", "dim_05"),  # authority + anchoring
    ("dim_03", "dim_04"),  # platform + scarcity
    ("dim_02", "dim_04"),  # social_proof + scarcity
    ("dim_06", "dim_07"),  # brand + free_trial
]


# Note: validate_url and fetch_url_content are now imported from scraper.py
# The advanced scraper implements multi-layered fallback:
# 1. Enhanced requests with realistic headers
# 2. Playwright headless browser (bypasses most bot detection)
# 3. ScrapingBee API (premium fallback if SCRAPINGBEE_API_KEY is set)


def detect_platform(url: str, content: str) -> Optional[str]:
    """Detect e-commerce platform from URL or content."""
    url_lower = url.lower()

    if "amazon.com" in url_lower or "amazon." in url_lower:
        return "amazon"
    elif "walmart.com" in url_lower:
        return "walmart"
    elif "shopping.google.com" in url_lower:
        return "google_shopping"
    else:
        return "web"


def detect_signal_presence(
    dimension_id: str,
    title: str,
    body_text: str
) -> SignalPresence:
    """
    Detect presence of a signal dimension in the content.

    Returns a SignalPresence with 0-1 score and zone contributions.
    """
    dimension = DIM_LOOKUP[dimension_id]
    signal_name = dimension["name"]

    # Combine title and body for analysis
    full_text = f"{title} {body_text}".lower()

    # Signal detection patterns based on dimension characteristics
    patterns = get_signal_patterns(dimension)

    # Analyze different zones
    title_score = detect_in_zone(title.lower(), patterns)
    body_score = detect_in_zone(body_text.lower(), patterns)

    # Weight zones: title is more important
    overall_score = (title_score * 0.4) + (body_score * 0.6)

    # Clamp to 0-1
    overall_score = max(0.0, min(1.0, overall_score))

    zone_contributions = [
        ZoneContribution(
            zone="title",
            score=title_score,
            evidence=extract_evidence(title, patterns)
        ),
        ZoneContribution(
            zone="body",
            score=body_score,
            evidence=extract_evidence(body_text[:500], patterns)
        ),
    ]

    return SignalPresence(
        dimension_id=dimension_id,
        score=overall_score,
        zone_contributions=zone_contributions
    )


def get_signal_patterns(dimension: Dict) -> List[str]:
    """
    Generate search patterns for a dimension based on its characteristics.
    """
    patterns = []

    name = dimension["name"]

    # Pattern mapping based on dimension type
    # Enhanced with B2B/services patterns alongside consumer patterns
    pattern_map = {
        "third_party_authority": [
            # Consumer patterns
            r"recommended by",
            r"endorsed by",
            r"approved by",
            r"certified by",
            r"association",
            r"expert",
            # B2B/Enterprise patterns
            r"trusted by\s+\d+",
            r"trusted by\s+\w+\s+(companies|enterprises|organizations|businesses)",
            r"used by\s+\d+",
            r"(fortune|inc)\s+\d+",
            r"gartner",
            r"forrester",
            r"g2\s+(crowd|rating)",
            r"capterra",
            r"iso\s+\d+",
            r"soc\s*[12]",
            r"hipaa\s+(compliant|certified)",
            r"gdpr\s+(compliant|ready)",
            r"fedramp",
            r"pci[\-\s]dss",
            r"industry[\-\s]leading",
        ],
        "social_proof_sensitivity": [
            # Consumer patterns
            r"\d+[\.,]?\d*\s*(stars?|rating|reviews?|buyers?|customers?)",
            r"rated\s+\d",
            r"\d+\s+verified",
            r"bestseller",
            r"top rated",
            # B2B/Enterprise patterns
            r"\d+[,\.]?\d*[kmb]?\+?\s*(users?|companies|clients|customers|teams|organizations)",
            r"(serving|powering|trusted by)\s+\d+",
            r"enterprise[\-\s]grade",
            r"customer\s+(logos?|stories|case studies)",
            r"case\s+stud(y|ies)",
            r"success\s+stor(y|ies)",
            r"testimonial",
            r"(our|their)\s+customers\s+include",
            r"join\s+(leading|top|\d+)",
            r"nps\s+(of\s+)?\d+",
        ],
        "platform_endorsement": [
            # Consumer patterns
            r"editor'?s?\s+choice",
            r"featured",
            r"award",
            r"selected",
            r"curated",
            # B2B patterns
            r"(aws|azure|google cloud|salesforce)\s+(partner|marketplace)",
            r"partner\s+(program|network|ecosystem)",
            r"integration",
            r"certified\s+(partner|solution)",
            r"technology\s+partner",
            r"strategic\s+partner",
        ],
        "scarcity_urgency": [
            # Consumer patterns
            r"only\s+\d+\s+(left|remaining|in stock)",
            r"limited",
            r"selling fast",
            r"low stock",
            r"almost gone",
            r"hurry",
            # B2B/Services patterns
            r"limited\s+(spots|seats|availability|capacity)",
            r"waitlist",
            r"exclusive\s+access",
            r"early\s+access",
            r"founding\s+(member|customer|partner)",
            r"beta\s+(program|access)",
        ],
        "anchoring_susceptibility": [
            # Consumer patterns
            r"was\s+\$\d+",
            r"originally",
            r"\d+%\s+off",
            r"save\s+\$\d+",
            r"retail price",
            r"compare at",
            # B2B/Services patterns
            r"starting\s+(at|from)\s+\$\d+",
            r"roi\s+(of\s+)?\d+",
            r"saves?\s+(you\s+)?\d+\s*(hours?|%|x)",
            r"\d+x\s+(faster|cheaper|more|better)",
            r"reduce\s+(costs?|time|spend)\s+by\s+\d+",
            r"pricing\s+plans?",
            r"(enterprise|team|business)\s+pricing",
            r"custom\s+pricing",
        ],
        "brand_premium_acceptance": [
            # Consumer patterns
            r"since\s+\d{4}",
            r"trusted",
            r"heritage",
            r"established",
            r"leading brand",
            r"\d+\s+years",
            # B2B patterns
            r"market\s+leader",
            r"industry\s+leader",
            r"category\s+(leader|creator)",
            r"(the\s+)?#1\s+(in|for)",
            r"pioneer",
            r"global\s+(leader|presence|reach)",
            r"enterprise[\-\s]ready",
        ],
        "free_trial_conversion": [
            # Consumer patterns
            r"free\s+(trial|sample|shipping|gift)",
            r"complimentary",
            r"bonus",
            r"no charge",
            # B2B/Services patterns
            r"request\s+(a\s+)?demo",
            r"schedule\s+(a\s+)?(demo|call|meeting)",
            r"book\s+(a\s+)?(demo|call|meeting|consultation)",
            r"get\s+(a\s+)?quote",
            r"talk\s+to\s+(sales|an?\s+expert|us)",
            r"free\s+(consultation|assessment|audit|evaluation)",
            r"(14|30)[\-\s]day\s+(free\s+)?trial",
            r"no\s+credit\s+card\s+(required|needed)",
            r"cancel\s+any\s*time",
            r"pilot\s+program",
            r"poc\b",
        ],
        "bundle_preference": [
            # Consumer patterns
            r"bundle",
            r"includes",
            r"comes with",
            r"set of",
            r"value",
            r"package",
            # B2B/Services patterns
            r"(starter|pro|business|enterprise|team)\s+plan",
            r"pricing\s+tiers?",
            r"(all[\-\s]in[\-\s]one|complete)\s+(solution|platform|suite)",
            r"full[\-\s]stack",
            r"end[\-\s]to[\-\s]end",
            r"(unified|integrated)\s+(platform|solution)",
            r"everything\s+you\s+need",
        ],
        "sustainability_premium": [
            # Consumer patterns
            r"sustainable",
            r"eco[\-\s]friendly",
            r"carbon[\-\s]neutral",
            r"recyclable",
            r"green",
            r"environmental",
            r"b[\-\s]corp",
            # B2B/Services patterns
            r"esg\s+(compliant|reporting|goals)",
            r"net[\-\s]zero",
            r"scope\s+[123]\s+emissions",
            r"climate\s+(positive|neutral|commitment)",
            r"sustainability\s+(report|goals|commitment)",
        ],
        "privacy_tradeoff": [
            # Consumer patterns
            r"privacy",
            r"no\s+(tracking|data|account)",
            r"anonymous",
            r"discreet",
            r"confidential",
            # B2B/Services patterns
            r"data\s+(protection|security|residency)",
            r"(gdpr|ccpa|hipaa)\s+(compliant|ready)",
            r"(your|customer)\s+data\s+(is\s+)?(safe|secure|protected)",
            r"encryption",
            r"sso\b",
            r"single\s+sign[\-\s]on",
            r"mfa\b",
            r"multi[\-\s]factor",
            r"audit\s+(log|trail)",
            r"role[\-\s]based\s+access",
        ],
        "local_preference": [
            # Consumer patterns
            r"made in",
            r"locally",
            r"domestic",
            r"manufactured in",
            r"sourced locally",
            # B2B/Services patterns
            r"data\s+(center|residency)\s+in",
            r"(us|eu|apac|regional)\s+(data\s+)?center",
            r"local\s+(support|team|presence)",
            r"offices?\s+in",
            r"(regional|local)\s+compliance",
        ],
        "novelty_seeking": [
            # Consumer patterns
            r"new",
            r"just launched",
            r"breakthrough",
            r"innovative",
            r"first",
            r"patented",
            r"cutting[\-\s]edge",
            # B2B/Services patterns
            r"ai[\-\s](powered|driven|native|first)",
            r"(machine|deep)\s+learning",
            r"next[\-\s]gen(eration)?",
            r"(modern|cloud[\-\s]native)\s+(platform|solution|architecture)",
            r"disrupt(ive|ing|or)?",
            r"transform(ative|ation|ing)?",
            r"reinvent(ing)?",
            r"automat(e|ed|ion)",
        ],
        "risk_aversion": [
            # Consumer patterns
            r"trusted",
            r"proven",
            r"established",
            r"\d+\s+years",
            r"track record",
            r"reliable",
            # B2B/Services patterns
            r"\d+\.?\d*%?\s+(uptime|availability|sla)",
            r"99\.?\d*%",
            r"enterprise[\-\s](grade|ready|scale)",
            r"battle[\-\s]tested",
            r"production[\-\s]ready",
            r"(serving|processing)\s+\d+",
            r"mission[\-\s]critical",
            r"24[\-/]7\s+(support|availability|monitoring)",
            r"sla\s+(guarantee|backed)",
            r"(high\s+)?availability",
            r"disaster\s+recovery",
            r"backup",
        ],
        "warranty_weight": [
            # Consumer patterns
            r"warranty",
            r"guarantee",
            r"coverage",
            r"protected",
            r"backed by",
            # B2B/Services patterns
            r"sla\b",
            r"service\s+level\s+agreement",
            r"uptime\s+guarantee",
            r"\d+[\-\s]?(day|month|year)\s+(contract|commitment|agreement)",
            r"(dedicated|premium)\s+support",
            r"(24[\-/]7|round[\-\s]the[\-\s]clock)\s+support",
            r"customer\s+success\s+(manager|team)",
            r"onboarding",
            r"implementation\s+(support|team|partner)",
        ],
        "return_policy_sensitivity": [
            # Consumer patterns
            r"return",
            r"refund",
            r"money[\-\s]back",
            r"no questions asked",
            r"free returns",
            # B2B/Services patterns
            r"cancel\s+(anytime|at\s+any\s+time)",
            r"no\s+(long[\-\s]term\s+)?contract",
            r"month[\-\s]to[\-\s]month",
            r"flexible\s+(terms|contracts|billing)",
            r"(exit|migration)\s+assist(ance)?",
            r"data\s+(export|portability)",
        ],
        "negative_review_weight": [
            # Consumer patterns
            r"note:",
            r"some (users|customers|reviewers)",
            r"however",
            r"criticism",
            r"drawback",
            # B2B patterns
            r"limitations?",
            r"not\s+(ideal|suitable|designed)\s+for",
            r"(best|better)\s+suited\s+for",
            r"prerequisites?",
            r"requirements?",
        ],
        "recency_bias": [
            # Consumer patterns
            r"recently",
            r"updated",
            r"new version",
            r"reformulated",
            r"improved",
            r"20(2[4-9]|3[0-9])",  # Recent years
            # B2B patterns
            r"latest\s+(version|release|update)",
            r"v\d+\.\d+",
            r"just\s+(released|shipped|launched)",
            r"(new|latest)\s+features?",
            r"roadmap",
            r"coming\s+soon",
        ],
        "specificity_preference": [
            # Consumer patterns
            r"\d+\.?\d*\s*%",
            r"precisely",
            r"exactly",
            r"clinically proven",
            r"tested",
            r"\d+\s+(days|hours|mg|ml|oz)",
            # B2B patterns
            r"\d+[kmb]?\+?\s+(api\s+)?calls?",
            r"\d+\s*(gb|tb|pb)",
            r"\d+\s*ms\s+(latency|response)",
            r"(supports?|handles?|processes?)\s+\d+",
            r"(real[\-\s]time|instant)",
            r"(sub[\-\s])?second",
            r"unlimited",
            r"(detailed|comprehensive)\s+(analytics?|reports?|insights?)",
        ],
        "comparison_framing": [
            # Consumer patterns
            r"compared to",
            r"vs\.?",
            r"better than",
            r"outperforms",
            r"superior",
            r"leading competitor",
            # B2B patterns
            r"(unlike|vs\.?|versus)\s+(legacy|traditional|other|competitors?)",
            r"replaces?\s+(your|legacy|existing)",
            r"alternative\s+to",
            r"migration?\s+from",
            r"switch(ing)?\s+from",
            r"(simpler|faster|easier|cheaper)\s+than",
        ],
        "information_seeking_depth": [
            # Consumer patterns
            r"available upon request",
            r"more information",
            r"details available",
            r"contact us",
            # B2B patterns
            r"(documentation|docs|api\s+docs)",
            r"developer\s+(portal|docs|guide)",
            r"knowledge\s+base",
            r"help\s+(center|desk)",
            r"(white[\-\s]?paper|ebook|guide)",
            r"webinar",
            r"(product|solution)\s+overview",
        ],
        "clarification_requests": [
            # Consumer patterns
            r"may vary",
            r"depending on",
            r"individual results",
            r"consult",
            # B2B patterns
            r"(custom|enterprise)\s+(pricing|solution|implementation)",
            r"(varies|depends)\s+(by|on)\s+(usage|volume|tier)",
            r"contact\s+(sales|us)\s+for",
            r"tailored\s+(to|for)",
        ],
        "recommendation_revision": [
            # Consumer patterns
            r"however",
            r"although",
            r"but",
            r"though",
            r"while",
            # B2B patterns
            r"(best|ideal|perfect)\s+(for|suited)",
            r"(designed|built|optimized)\s+for",
            r"use\s+cases?",
            r"(who|teams?|companies?)\s+(should|can)\s+use",
        ],
        "confidence_calibration": [
            r"may",
            r"might",
            r"appears",
            r"seems",
            r"possibly",
            r"uncertain",
            r"difficult to predict",
        ],
        "ethical_concern_weight": [
            # Consumer patterns
            r"fair trade",
            r"ethical",
            r"cruelty[\-\s]free",
            r"living wage",
            r"transparent supply",
            # B2B patterns
            r"responsible\s+ai",
            r"ethical\s+ai",
            r"(dei|diversity)\s+(commitment|program|initiative)",
            r"accessibility",
            r"wcag",
            r"(supplier|vendor)\s+(diversity|code)",
            r"corporate\s+(responsibility|citizenship)",
        ],
        "default_option_bias": [
            # Consumer patterns
            r"most popular",
            r"recommended",
            r"best[\-\s]seller",
            r"selected by \d+%",
            r"default",
            # B2B patterns
            r"(most\s+)?popular\s+(choice|plan|option)",
            r"recommended\s+(for|plan)",
            r"best\s+value",
            r"(teams?|companies?)\s+like\s+yours",
            r"(our|the)\s+flagship",
        ],
        "loss_framing_sensitivity": [
            # Consumer patterns
            r"prevent",
            r"avoid",
            r"protect against",
            r"without .* would",
            r"stop",
            # B2B patterns
            r"(don'?t|stop)\s+(miss(ing)?|lose|waste|fall behind)",
            r"(risk|threat)\s+of",
            r"(security|data)\s+(breach|loss)",
            r"downtime",
            r"(competitive|market)\s+advantage",
            r"(before\s+)?your\s+competitors?",
            r"left\s+behind",
        ],
    }

    return pattern_map.get(name, [name.replace("_", " ")])


def detect_in_zone(text: str, patterns: List[str]) -> float:
    """
    Detect signal patterns in a zone of text.
    Returns 0-1 score based on pattern matches.
    """
    if not text:
        return 0.0

    matches = 0
    for pattern in patterns:
        if re.search(pattern, text, re.IGNORECASE):
            matches += 1

    # Normalize: each matched pattern adds 0.3, capped at 1.0
    score = min(1.0, matches * 0.3)
    return score


def extract_evidence(text: str, patterns: List[str], max_length: int = 200) -> str:
    """
    Extract a snippet of text showing evidence of signal patterns.
    """
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            # Extract context around the match
            start = max(0, match.start() - 50)
            end = min(len(text), match.end() + 100)
            snippet = text[start:end].strip()
            if start > 0:
                snippet = "..." + snippet
            if end < len(text):
                snippet = snippet + "..."
            return snippet[:max_length]

    return text[:max_length]


def calculate_universal_score(signal_inventory: List[SignalPresence]) -> float:
    """
    Calculate universal ML score (0-100) using effect sizes.

    Uses mean Cohen's h across all models, weighted by signal presence.
    """
    if not signal_inventory:
        return 0.0

    total_weighted_effect = 0.0
    total_abs_effect = 0.0

    for signal in signal_inventory:
        dim_id = signal.dimension_id
        signal_score = signal.score

        # Validate signal score
        if not isinstance(signal_score, (int, float)) or signal_score < 0:
            continue

        # Get mean effect size across all models for this dimension
        effects = EFFECT_LOOKUP.get(dim_id, {})
        if effects and len(effects) > 0:
            mean_effect = sum(effects.values()) / len(effects)

            # Weight by signal presence
            weighted_effect = abs(mean_effect) * signal_score
            total_weighted_effect += weighted_effect
            total_abs_effect += abs(mean_effect)

    # Normalize to 0-100 scale with division by zero protection
    if total_abs_effect > 1e-10:  # Use small epsilon instead of zero check
        raw_score = (total_weighted_effect / total_abs_effect) * 100
    else:
        raw_score = 0.0

    return min(100.0, max(0.0, raw_score))


def calculate_model_scores(
    signal_inventory: List[SignalPresence],
    model_distribution: Optional[Dict[str, float]] = None
) -> Dict[str, float]:
    """
    Calculate model-specific scores based on model-specific effect sizes.

    If model_distribution is provided, also calculate a weighted client score.
    """
    model_scores = {}

    for model_id in MODEL_IDS:
        total_weighted_effect = 0.0
        total_abs_effect = 0.0

        for signal in signal_inventory:
            dim_id = signal.dimension_id
            signal_score = signal.score

            # Get model-specific effect size
            effect = EFFECT_LOOKUP.get(dim_id, {}).get(model_id, 0.0)

            weighted_effect = abs(effect) * signal_score
            total_weighted_effect += weighted_effect
            total_abs_effect += abs(effect)

        # Normalize to 0-100 with division by zero protection
        if total_abs_effect > 1e-10:
            model_scores[model_id] = min(100.0, (total_weighted_effect / total_abs_effect) * 100)
        else:
            model_scores[model_id] = 0.0

    return model_scores


def calculate_client_score(
    model_scores: Dict[str, float],
    model_distribution: Dict[str, float]
) -> float:
    """
    Calculate client-specific score based on their model distribution.
    """
    weighted_score = 0.0
    for model_id, weight in model_distribution.items():
        if model_id in model_scores:
            weighted_score += model_scores[model_id] * weight

    return min(100.0, max(0.0, weighted_score))


def calculate_readability_score(text: str) -> Tuple[float, List[str]]:
    """
    Simple readability scoring (0-100) based on text complexity.

    Returns (score, flags)
    """
    flags = []
    score = 100.0

    # Check text length
    if len(text) < 100:
        flags.append("Very short content")
        score -= 20
    elif len(text) > 10000:
        flags.append("Very long content")
        score -= 10

    # Check for overly long sentences
    sentences = re.split(r'[.!?]+', text)
    avg_sentence_length = sum(len(s.split()) for s in sentences) / max(len(sentences), 1)
    if avg_sentence_length > 30:
        flags.append("Long sentences")
        score -= 15

    # Check for jargon/complexity (simple heuristic)
    long_words = [w for w in text.split() if len(w) > 12]
    if len(long_words) > len(text.split()) * 0.15:
        flags.append("Complex vocabulary")
        score -= 10

    return max(0.0, score), flags


def generate_recommendations(
    signal_inventory: List[SignalPresence],
    universal_score: float
) -> List[Recommendation]:
    """
    Generate improvement recommendations based on signal gaps.
    """
    recommendations = []

    # Sort dimensions by potential impact (mean effect size * signal gap)
    dimension_impacts = []

    for signal in signal_inventory:
        dim_id = signal.dimension_id
        current_signal = signal.score

        # Calculate mean effect size
        effects = EFFECT_LOOKUP.get(dim_id, {})
        if effects:
            mean_effect = sum(abs(e) for e in effects.values()) / len(effects)
            gap = 1.0 - current_signal
            impact = mean_effect * gap

            dimension_impacts.append({
                "dimension_id": dim_id,
                "current_signal": current_signal,
                "mean_effect": mean_effect,
                "gap": gap,
                "impact": impact,
            })

    # Sort by impact (descending)
    dimension_impacts.sort(key=lambda x: x["impact"], reverse=True)

    # Generate top 5 recommendations
    for item in dimension_impacts[:5]:
        dim_id = item["dimension_id"]
        dimension = DIM_LOOKUP[dim_id]

        # Set target signal and priority
        if item["impact"] > 0.3:
            priority = "high"
            target_signal = 0.9
        elif item["impact"] > 0.15:
            priority = "medium"
            target_signal = 0.7
        else:
            priority = "low"
            target_signal = 0.5

        # Predict delta from improvement
        predicted_delta = item["mean_effect"] * (target_signal - item["current_signal"]) * 10

        # Generate copy suggestion from dimension examples
        signal_example = dimension["signal_example"]["present"]
        copy_suggestion = f"Add {dimension['display_name']} signal. Example: {signal_example[:150]}..."

        recommendations.append(
            Recommendation(
                dimension_id=dim_id,
                current_signal=item["current_signal"],
                target_signal=target_signal,
                gap=item["gap"],
                predicted_delta=predicted_delta,
                copy_suggestion=copy_suggestion,
                zone="body",
                priority=priority,
            )
        )

    return recommendations


def detect_signal_interactions(
    signal_inventory: List[SignalPresence],
    threshold: float = 0.3
) -> List[SignalInteraction]:
    """
    Detect meaningful signal interactions when multiple signals are present.

    Uses the multiplicative model from the interaction study research.
    Only considers signals above the threshold as "present".
    """
    interactions = []

    # Build a dict of present signals (above threshold)
    present_signals = {
        s.dimension_id: s.score
        for s in signal_inventory
        if s.score >= threshold
    }

    if len(present_signals) < 2:
        return interactions

    # Check for positive pair interactions
    for dim_a, dim_b in POSITIVE_PAIR_SIGNALS:
        if dim_a in present_signals and dim_b in present_signals:
            # Get individual baseline effects
            effect_a = BASELINES.get(dim_a, 0.0)
            effect_b = BASELINES.get(dim_b, 0.0)

            # Multiplicative model: combined = (1 + a) * (1 + b) - 1
            # This captures synergy: signals reinforce each other
            combined = (1 + abs(effect_a)) * (1 + abs(effect_b)) - 1
            additive = abs(effect_a) + abs(effect_b)
            interaction_bonus = combined - additive

            # Weight by actual signal presence
            weighted_bonus = interaction_bonus * present_signals[dim_a] * present_signals[dim_b]

            interactions.append(SignalInteraction(
                signal_ids=[dim_a, dim_b],
                combination_type="positive_pair",
                individual_effects={dim_a: effect_a, dim_b: effect_b},
                combined_effect=combined,
                interaction_bonus=weighted_bonus,
                model_used="multiplicative"
            ))

    # Check for negative pair interactions (signals that may interfere)
    for dim_a, dim_b in NEGATIVE_PAIR_SIGNALS:
        if dim_a in present_signals and dim_b in present_signals:
            effect_a = BASELINES.get(dim_a, 0.0)
            effect_b = BASELINES.get(dim_b, 0.0)

            # Negative pairs: multiplicative but with diminishing effect
            # Combined effect is less than additive (signals compete)
            additive = abs(effect_a) + abs(effect_b)
            combined = additive * 0.7  # 30% reduction for conflicting signals
            interaction_bonus = combined - additive  # Will be negative

            weighted_bonus = interaction_bonus * present_signals[dim_a] * present_signals[dim_b]

            interactions.append(SignalInteraction(
                signal_ids=[dim_a, dim_b],
                combination_type="negative_pair",
                individual_effects={dim_a: effect_a, dim_b: effect_b},
                combined_effect=combined,
                interaction_bonus=weighted_bonus,
                model_used="multiplicative"
            ))

    # Check for triple combos if 3+ signals present
    if len(present_signals) >= 3:
        # Get top 3 signals by presence score
        top_signals = sorted(present_signals.items(), key=lambda x: x[1], reverse=True)[:3]
        signal_ids = [s[0] for s in top_signals]

        effects = {s: BASELINES.get(s, 0.0) for s in signal_ids}

        # Triple combo multiplicative model
        combined = 1.0
        for effect in effects.values():
            combined *= (1 + abs(effect))
        combined -= 1

        additive = sum(abs(e) for e in effects.values())
        interaction_bonus = (combined - additive) * 0.5  # Dampen triple effects

        # Weight by minimum signal presence (weakest link)
        min_presence = min(s[1] for s in top_signals)
        weighted_bonus = interaction_bonus * min_presence

        interactions.append(SignalInteraction(
            signal_ids=signal_ids,
            combination_type="triple_combo",
            individual_effects=effects,
            combined_effect=combined,
            interaction_bonus=weighted_bonus,
            model_used="multiplicative"
        ))

    return interactions


def calculate_interaction_adjustment(interactions: List[SignalInteraction]) -> float:
    """
    Calculate total score adjustment from all detected interactions.

    Returns a value that can be added to the base score (can be positive or negative).
    """
    if not interactions:
        return 0.0

    # Sum all interaction bonuses, scaled to 0-100 score range
    total_bonus = sum(i.interaction_bonus for i in interactions)

    # Scale to meaningful score impact (10 points max adjustment)
    adjustment = total_bonus * 100
    return max(-10.0, min(10.0, adjustment))


def score_url(
    url: str,
    model_distribution: Optional[Dict[str, float]] = None
) -> MLScore:
    """
    Main scoring function: fetch URL, detect signals, calculate scores.
    """
    # Fetch content
    title, body_text = fetch_url_content(url)

    # Detect platform
    platform = detect_platform(url, body_text)

    # Determine extraction quality
    if len(body_text) > 500 and title:
        extraction_quality = "full"
    elif len(body_text) > 100:
        extraction_quality = "partial"
    else:
        extraction_quality = "minimal"

    # Detect signal presence for all 26 dimensions
    signal_inventory = []
    for dimension in DIMENSIONS:
        signal = detect_signal_presence(dimension["id"], title, body_text)
        signal_inventory.append(signal)

    # Calculate base scores
    base_score = calculate_universal_score(signal_inventory)

    # Detect signal interactions (Layer 4)
    signal_interactions = detect_signal_interactions(signal_inventory)
    interaction_adjustment = calculate_interaction_adjustment(signal_interactions)

    # Apply interaction adjustment to get final universal score
    universal_score = max(0.0, min(100.0, base_score + interaction_adjustment))

    # Calculate model-specific scores
    model_scores = calculate_model_scores(signal_inventory, model_distribution)

    # Calculate client score if distribution provided
    client_score = None
    if model_distribution:
        client_score = calculate_client_score(model_scores, model_distribution)
        # Apply interaction adjustment to client score too
        client_score = max(0.0, min(100.0, client_score + interaction_adjustment))

    # Calculate readability
    readability_score, readability_flags = calculate_readability_score(body_text)

    # Generate recommendations
    recommendations = generate_recommendations(signal_inventory, universal_score)

    # Create response
    ml_score = MLScore(
        id=str(uuid.uuid4()),
        url=url,
        scored_at=datetime.utcnow().isoformat() + "Z",
        universal_score=round(universal_score, 2),
        client_score=round(client_score, 2) if client_score else None,
        model_distribution=model_distribution,
        signal_inventory=signal_inventory,
        signal_interactions=signal_interactions,
        interaction_adjustment=round(interaction_adjustment, 2),
        readability_score=round(readability_score, 2),
        readability_flags=readability_flags,
        recommendations=recommendations,
        platform=platform,
        extraction_quality=extraction_quality,
    )

    return ml_score
