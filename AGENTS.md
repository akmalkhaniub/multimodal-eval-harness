# AGENTS.md — Autonomous Agent Operating Contract

## 🎯 Repository Purpose & Architecture
`multimodal-eval-harness` is a comparative evaluation and resiliency framework benchmarking Gemini 2.0, Claude 3.7 Vision, and GPT-4o with structural Zod validation, OCR field precision scoring with numeric tolerance, and a circuit-breaker fallback cascade.

### Tech Stack
- **Language**: TypeScript / Node.js
- **Testing**: Vitest
- **Key Modules**: `src/evaluators/`, `src/cascade/`, `src/cost/`

---

## ⚡ Autonomous Execution Protocol
1. Pull task from `TASKS.json`.
2. Implement metric evaluator or fallback logic.
3. Run verification: `npm test`.
4. Commit with: `feat(task-id): description`.
