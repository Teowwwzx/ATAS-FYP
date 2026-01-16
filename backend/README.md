# ATAS 2.0: AI-Native Distributed Mentorship Ecosystem

> **Engineering-first evolution of a mentorship platform, designed for scalability, high availability, and intelligent social discovery.**

## 🚀 The 2.0 Evolution (Why it matters)
ATAS 2.0 is not just a feature update; it's a complete architectural overhaul. While version 1.0 focused on solving student pain points, version 2.0 is built to handle enterprise-level traffic and complex data relationships found in top-tier tech firms.

### Key Architectural Upgrades:
- **Distributed Task Processing:** Offloaded heavy I/O (Email, AI Embeddings) to **Celery/Redis** workers.
- **High-Performance Caching:** Implemented **Redis** Cache-Aside patterns, reducing DB load by ~70%.
- **Social Graph Engine:** Migrated mentorship relations to **Neo4j**, enabling $O(1)$ discovery of multi-degree connections.
- **AI-Driven Semantic Search:** Leveraging **pgvector** and LLMs for contextual expert matching.
- **Financial-Grade Reliability:** Implemented comprehensive **Audit Logging** and **RBAC (Role-Based Access Control)**.

---

## 🛠 Tech Stack
- **Backend:** Python (FastAPI), Golang (Notification Microservice)
- **Frontend:** Next.js 15, TypeScript, Tailwind CSS, Shadcn UI
- **Infrastructure:** Docker, Redis (Caching/Rate Limiting), Celery (MQ)
- **Databases:** PostgreSQL (pgvector), Neo4j (Graph)
- **AI/ML:** Groq/OpenAI API, Sentence-Transformers

---

## 🏗 System Architecture


---

## 🌟 Core Features & Implementation Details

### 1. Intelligent Expert Discovery
Uses **pgvector** to perform cosine similarity searches on user profiles. 
- *Engineering Highlight:* Optimized vector dimensions and implemented indexing for sub-second retrieval.

### 2. Social Recommendation Engine (Neo4j)
Moving beyond SQL joins, ATAS 2.0 uses Cypher queries to recommend mentors based on mutual connections and shared skill clusters.

### 3. Real-time Community Engagement
- **SSE (Server-Sent Events):** For lightweight, real-time system notifications.
- **Stream Chat Integration:** Scalable messaging infrastructure.

---

## 📈 Engineering Standards
- **Testing:** 90%+ coverage with `pytest` (Unit, Integration, E2E).
- **CI/CD:** Automated linting via `Ruff` and type checking via `MyPy`.
- **Observability:** Structured JSON logging for ELK/Prometheus compatibility.

---

## 🛠 Getting Started (Docker-based)
```bash
# Clone the v2 worktree
git clone -b v2-refactor [your-repo-link]

# Launch the entire stack
docker-compose up --build