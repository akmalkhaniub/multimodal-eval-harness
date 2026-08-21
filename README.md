# 👁️ Multimodal Eval Harness

> **Production Multimodal Model Evaluation Framework, Cost Modeling, and Resilient Fallback Cascade.**

![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)
![Gemini](https://img.shields.io/badge/Gemini-2.0_Flash-4285f4)
![Claude](https://img.shields.io/badge/Claude-3.7_Vision-d97757)
![GPT-4o](https://img.shields.io/badge/OpenAI-GPT--4o-10a37f)
![Vitest](https://img.shields.io/badge/Vitest-Passing-729b1b)

---

## 🌟 Overview

Designed to fulfill the applied AI requirements for MVP engagements at **Conrad Labs**:
- Multi-provider model evaluation across vision, image, and video providers.
- Output quality frameworks (schema compliance, OCR/field precision, latency percentiles).
- Production resilience (retry backoff, circuit breakers, automatic 429 failover cascade).
- FinOps cost modeling (per-call USD token calculations and cache efficiency tracking).

---

## 🏗️ Architecture & Fallback Cascade

```mermaid
graph TD
  App[Multimodal Client / OCR Pipeline] --> Cascade[⚡ MultimodalFallbackCascade]
  
  subgraph CircuitBreakerGroup [Protected Provider Cascade]
    Cascade -->|1. Primary Fast & Low Cost| P1[Gemini 2.0 Flash]
    P1 -->|Timeout / 429 RateLimit| P2[Claude 3.7 Sonnet Vision]
    P2 -->|Fallback| P3[GPT-4o Vision]
  end

  P1 --> Breaker1[Circuit Breaker 1]
  P2 --> Breaker2[Circuit Breaker 2]
  P3 --> Breaker3[Circuit Breaker 3]

  Cascade --> Eval[📊 Quality & Schema Evaluator]
  Cascade --> FinOps[💰 FinOps Cost & Token Model]
```

---

## 🚀 Quickstart & Testing

```bash
# Install dependencies
npm install

# Run unit & integration test suites
npm test

# Run benchmark evaluation runner
npm run benchmark
```
