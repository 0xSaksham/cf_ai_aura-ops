# 🧠 Aura-Ops: Engineering Journal & AI Prompts

Aura-Ops was built using an iterative "Human-in-the-loop" approach. AI was used not just to generate code, but to brainstorm architectural trade-offs and debug complex edge-runtime behaviors.

## 🏗️ Phase 1: Architectural Design
**The Goal:** Move incident detection from a central database to the Cloudflare Edge.

**Prompt used:**
> "I am designing an edge-native observability tool called Aura-Ops. I need to maintain stateful incident contexts per service without using a traditional database. Compare using Cloudflare KV vs. Durable Objects for a high-frequency log ingestion use case where atomicity and low-latency are critical."

**Outcome:** Decided on **Durable Objects** to ensure strong consistency and to co-locate the AI analysis logic with the log data.

---

## ⚙️ Phase 2: Developing the Stateful Engine
**The Goal:** Build a rolling-window log aggregator.

**Prompt used:**
> "Write a TypeScript class for a Cloudflare Durable Object that manages a rolling buffer of 50 `LogEntry` objects. Implement a logic gate that triggers an external workflow when the count of logs with `level: 'error'` exceeds a specific threshold. Ensure the environment bindings for Workers AI are correctly injected into the class context."

---

## 🧠 Phase 3: AI Workflow & Prompt Engineering
**The Goal:** Turn raw logs into actionable SRE insights.

**Prompt used:**
> "I need to write a system prompt for Llama 3.1 that performs Retrieval-Augmented Generation (RAG). The AI should ingest a JSON array of system logs and output a two-part response: 1. A root cause analysis. 2. A specific remediation step. The tone must be professional SRE-grade. How do I structure the prompt to prevent hallucination when logs are sparse?"

---

## 🛠️ Phase 4: The Debugging Marathon (Hardships & Resolutions)

Aura-Ops was not a "smooth" build. I encountered three major production-level hurdles that required deep dives into the Cloudflare Worker runtime.

### 1. The Local TLS Mismatch (The "Environment" Bug)
**The Issue:** During local testing, I hit a `kj/compat/tls.c++:256: failed: TLS peer's certificate is not trusted` error.
**Resolution:** Identified this as a hostname mismatch in the local `workerd` proxy when calling the AI gateway. Instead of getting stuck, I pivoted to a **Preview Deployment workflow**, verifying the logic on the live Cloudflare Edge where the certificate environment is stable.

### 2. The Model Availability Error (Code 5007)
**The Issue:** Initial calls to `llama-3.3-70b` returned a `No such model` error.
**Resolution:** Realized that model availability varies by region and tier. I refactored the code to use `@cf/meta/llama-3.1-8b-instruct` and implemented a **defensive try/catch block** with a fallback message to ensure the system remained resilient even if the AI upstream blipped.

### 3. The "Body Already Read" Stream Error
**The Issue:** The system returned a `500 Internal Server Error` because the request body was being consumed in the Worker before reaching the Durable Object.
**Resolution:** Refactored the `index.ts` router to act as a **pure pass-through handler**. I learned that in Workers, request bodies are streams that can only be read once. By passing `c.req.raw` directly to the DO, I preserved the stream for the internal logic engine.

---

## 📈 Final Refinement
**Prompt used:**
> "Review my TypeScript interfaces for `LogEntry`, `Incident`, and `Env`. Ensure there are no 'any' types and that the Durable Object class is correctly inheriting the Env interface for strict type-checking of the AI binding."

**Outcome:** Reached a 100% type-safe codebase that catches infrastructure errors at compile-time.
