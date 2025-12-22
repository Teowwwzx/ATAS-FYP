# AI Hybrid Search Architecture

This document explains the technical implementation of the **Multilingual Hybrid Agentic Search** system used in the Expert Marketplace.

## 🚀 Overview

The search system is designed to go beyond simple keyword matching. It uses **Artificial Intelligence** to understand the *intent* and *meaning* behind a user's query, regardless of the language used (English, Mandarin, Hindi, Korean, etc.).

It follows a two-stage process:
1.  **Retrieval (Broad Search):** Finds relevant candidates using Vector Semantic Search.
2.  **Reranking (Precision Filter):** Uses an LLM Agent to strictly validate specific constraints (Time, Date, Niche).

---

## 📉 Lessons Learned: Why Previous Attempts Failed

Before arriving at this architecture, we encountered several critical failures. Understanding these helps justify the current design:

### ❌ Failure 1: The "1pm vs 7pm" Problem (Semantic Blindness)
*   **The Issue:** Vector search relies on "semantic similarity." To a vector model, *"I am available at 1pm"* and *"I am available at 7pm"* are 99% identical (both are about time availability).
*   **The Result:** A user searching for *"After 7pm"* would get results for *"1pm"* because the math said they were similar. The AI didn't "understand" the constraint, only the topic.

### ❌ Failure 2: The "Keystroke" Token Drain
*   **The Issue:** We initially triggered the AI search on every letter the user typed (`onChange`).
*   **The Result:** Typing "Python" fired 6 separate API calls. This burned through our Gemini Free Tier quota in seconds and caused `429 Too Many Requests` errors, breaking the app.

### ❌ Failure 3: Database Operator Inconsistency
*   **The Issue:** We relied solely on the PostgreSQL `<->` (distance) operator inside the SQL query.
*   **The Result:** Due to floating-point nuances and threshold sensitivity, valid results were often filtered out silently, leading to the dreaded *"No experts found"* message even when matches existed.

---

## ✅ The Solution: What We Changed

We pivoted to a **Hybrid Agentic** approach to solve these specific problems:

1.  **Added "The Brain" (LLM Reranking):**
    *   *Fixes Failure 1.* We don't trust the vector search blindly anymore. We use it only to fetch *candidates*. We then force a fast LLM (Gemini Flash) to "read" the profile and answer a logic question: *"Is 1pm after 7pm?"* → **NO**. This creates true understanding.

2.  **Explicit Search Trigger:**
    *   *Fixes Failure 2.* We removed auto-search. The AI only runs when the user explicitly clicks "Search" or hits Enter. This reduced API calls by ~90%.

3.  **Python-Side Distance Calculation:**
    *   *Fixes Failure 3.* Instead of trusting the SQL operator blindly, we fetch the vectors and calculate the **Euclidean Distance** in Python. This gives us full control over the threshold (currently set to `1.1`) and guarantees valid matches are returned.

4.  **Rate Limiting:**
    *   *Security Layer.* We added a backend limit (30 requests/hour) to ensure no single user can crash the AI service for everyone else.

---

## 🏗️ System Architecture

```mermaid
graph TD
    A[User Query] -->|Multi-language Input| B(Embedding Model)
    B -->|Vector [0.1, -0.5, ...]| C{Vector Database}
    C -->|Top 20 Semantic Matches| D[Candidate Pool]
    D -->|Context + Query| E(AI Agent - Gemini Flash)
    E -->|Reasoning & Validation| F[Final Validated Results]
```

---

## 🧩 Step-by-Step Implementation

### 1. Vector Embedding (The "Universal Translator")
*   **Technology:** `Google Gemini text-embedding-004`
*   **Concept:** The system converts text into a list of numbers (a vector) representing its *meaning*.
*   **Why it supports multiple languages:** 
    *   The model is trained on massive multilingual datasets.
    *   The vector for *"Doctor"* (English) is mathematically very similar to *"医生"* (Chinese) or *"의사"* (Korean).
    *   This allows users to search in Hindi and find experts who wrote their bio in English!

### 2. Semantic Retrieval (The "Fuzzy" Match)
*   **Technology:** `PostgreSQL` with `pgvector`
*   **Logic:** 
    *   We compare the User Query Vector with all Expert Profile Vectors stored in the database.
    *   We use **Euclidean Distance** to find the closest matches.
    *   *Result:* This finds anyone *semantically related*.
    *   *Limitation:* It groups concepts loosely. "1pm" and "7pm" are both "times", so vector search sees them as similar.

### 3. Agentic Reranking (The "Brain")
*   **Technology:** `Google Gemini Flash` (High-speed LLM)
*   **Logic:**
    *   The system takes the Top 20 results from Step 2.
    *   It feeds the **User Query** and the **Candidate Profile** into an LLM.
    *   **Prompt Engineering:** We ask the AI: *"Does this candidate REASONABLY satisfy the user's specific constraints (e.g., time, date)? Answer YES or NO."*
    *   *Example:* 
        *   **Query:** "Weekdays after 7pm"
        *   **Candidate:** "Available at 1pm"
        *   **Vector Search:** Match (Similar concept)
        *   **LLM Reranker:** **REJECT** (Logic: 1pm is not after 7pm).

---

## ⚡ Performance Optimization
*   **Hybrid Approach:** We don't run the expensive LLM on the entire database (slow). We only run it on the top 20 results from the fast Vector Search.
*   **Explicit Trigger:** Search only runs on "Enter" or "Click" to save tokens and prevent lag.

## 🛠️ Key Files
*   `backend/app/services/ai_service.py`: Handles vector generation.
*   `backend/app/routers/profile_router.py`: Implements the Hybrid Search logic (Vector Search + Gemini Reranking loop).
