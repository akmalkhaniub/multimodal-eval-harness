# Google Cloud Professional Agentic Architect: Production Improvement Plan
## Repository: multimodal-eval-harness
**Audit Date:** November 6, 2026  
**Target Standard:** Google Cloud Professional Agentic Architect (Domain 4: Evaluating and Deploying Agentic Workflows)

---

### Current Assessment
A comparative evaluation and resiliency framework benchmarking Gemini 2.0, Claude 3.7 Vision, and GPT-4o with structural Zod validation, OCR field precision scoring with numeric tolerance, and a circuit-breaker fallback cascade defending against 429 quota exhaustion.

### Critical Gaps
1. **Lacks ADK `evalset` Export Format:** Evaluation results are saved in custom JSON formats rather than conforming to the standard Google Cloud ADK `evalset.json` schema.
2. **Missing Vertex AI Gen AI Evaluation Service Integration:** Does not currently call Google Cloud's cloud-hosted evaluation service or utilize its managed autoraters.
3. **No Trajectory Evaluation:** Evaluates multimodal response text and bounding boxes, but does not yet evaluate multi-turn tool calling trajectories.

---

### Actionable Implementation Steps

#### 1. Implement ADK `evalset.json` Export Adapter
Add an export module converting evaluation runs into ADK-compatible test datasets:
```python
def export_to_adk_evalset(benchmark_results: list[dict], output_file: str):
    adk_evalset = []
    for res in benchmark_results:
        adk_evalset.append({
            "id": res["test_id"],
            "conversation": [{"role": "user", "content": res["prompt"], "media": res.get("image_uri")}],
            "expected_trajectory": res.get("expected_tool_calls", []),
            "reference_response": res["ground_truth_text"]
        })
    with open(output_file, "w") as f:
        json.dump(adk_evalset, f, indent=2)
```

#### 2. Call the Vertex AI Gen AI Evaluation API
Integrate the cloud-native evaluation service:
```python
from google.cloud import aiplatform

aiplatform.init(project="nexus-eval-prod", location="us-central1")
eval_dataset = aiplatform.TabularDataset.create(display_name="multimodal_golden_set", gcs_source="gs://eval-bucket/golden.jsonl")

# Run evaluation experiment using managed autoraters
job = aiplatform.PipelineJob(
    display_name="gemini-multimodal-evaluation",
    template_path="https://us-kfp.pkg.dev/ml-pipeline/google-cloud-registry/gen-ai-eval/latest",
    parameter_values={"metrics": ["groundedness", "tool_accuracy", "safety"]}
)
job.run()
```

#### 3. Token-Cost & Latency Attribution
Extend benchmark summary outputs to include:
* p95/p99 latency per provider.
* Cost per 1,000 successful evaluations across Gemini 2.0 Flash vs. Pro.
