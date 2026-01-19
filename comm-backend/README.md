# ATAS Link (Community Edition)

> The "RedNote" (Xiaohongshu) for University Students.
> 
> Where Campus Lifestyle meets Social Growth.

## 📖 Introduction

**ATAS Link** is a high-performance, rich-media social platform designed exclusively for the modern university ecosystem. While traditional social media is often too broad, ATAS Link focuses on **hyper-local campus utility**: providing a dedicated space for students to share lifestyle "hacks," review courses, "avoid red flags" (避雷) in campus life, and find activity partners.

Currently, the platform is optimized for the **Chinese-speaking student community**, delivering a culturally familiar experience (similar to *Xiaohongshu*) with a robust technical foundation capable of scaling to global campus networks.

> **Ecosystem Note:** This project is developed as a standalone social engine but is architectured to integrate with **ATAS 2.0 (The Professional Tool)**. The vision is a "Dual-Identity" system where students manage their professional reputation and campus lifestyle under one unified account.

---

## 🚀 Key Features

### 🎨 Lifestyle & Content (UGC)

- **Waterfall Feed:** An immersive, dual-column discovery feed optimized for visual storytelling.

- **Rich Media Notes:** Create posts with multi-image support (up to 9 images), titles, and rich-text descriptions.

- **Hierarchical Discussions:** Advanced "Reply-to-Reply" (nested) comment system allowing for deep community engagement.

- **Campus Wiki (POI):** Tag specific campus locations (e.g., "Library L3", "West Canteen") to aggregate local intel.

### 🛠️ Strategic Tech Architecture

- **High-Concurrency Scaling:** Built on **FastAPI (Python 3.11)** with a fully asynchronous I/O core.

- **Real-Time Engine:** **WebSocket (Socket.IO)** integration for instant notifications (likes, mentions, and new replies).

- **Distributed Task Queue:** **Celery + Redis** handles background media processing, image compression (via Cloudinary), and AI moderation.

- **Social Graph & Interactions:** High-speed interaction tracking (Likes/Bookmarks) using **Redis atomic counters** with scheduled database write-backs to ensure performance under load.

---

## 💻 Tech Stack

| **Layer**       | **Technology**                                     |
| --------------- | -------------------------------------------------- |
| **Backend**     | FastAPI, SQLAlchemy 2.0 (Async), Pydantic v2       |
| **Real-time**   | Socket.IO (with Redis Manager)                     |
| **Database**    | PostgreSQL 15 + **pgvector** (for semantic search) |
| **Cache/Queue** | Redis 7                                            |
| **Worker**      | Celery                                             |
| **Media/CDN**   | Cloudinary                                         |
| **DevOps**      | Docker, Docker Compose                             |

---

## 📂 Project Structure

Plaintext

```
comm-backend/
├── app/
│   ├── api/            # API Endpoints (v1)
│   ├── core/           # Security, Auth, and Global Config
│   ├── models/         # SQLAlchemy Models (Post, Comment, Interactions)
│   ├── schemas/        # Pydantic v2 Models (DTOs)
│   ├── services/       # Business Logic (Feed Algorithm, Socket Manager)
│   ├── tasks/          # Celery Workers (Image Processing, Notifications)
│   └── main.py         # Application Entrypoint
├── tests/              # Pytest Suite
├── Dockerfile          # Containerization
└── requirements.txt    # Project Dependencies
```

---

## 🏁 Getting Started

### 1. Environment Setup

Create a `.env` file in the `comm-backend` directory:

Bash

```
DATABASE_URL=postgresql+psycopg2://comm_user:password@localhost:5433/community
REDIS_URL=redis://localhost:6379/1
CLOUDINARY_URL=your_cloudinary_url
```

### 2. Launching via Docker

This project is part of a monorepo. Launch the community services using:

Bash

```
docker-compose up --build comm_api comm_worker
```

- **API URL:** `http://localhost:8001`

- **Documentation:** `http://localhost:8001/docs`

---

## 🔮 Roadmap

- **Phase 1:** Core UGC engine (Posts, Likes, Comments) and Image Processing.

- **Phase 2:** Real-time notification center via WebSocket and Global Search (Keyword + Vector).

- **Phase 3:** **Professional-Lifestyle Link**: Integrating with ATAS 2.0 to sync professional achievements into the social feed.

- **Phase 4:** Advanced AI Moderation for the Chinese-speaking community (Slang/Context detection).

---


This project follows **Big Tech Engineering Standards**. Please ensure:

1. All logic is kept in the `services/` layer.

2. Type hints are used for all function signatures.

3. Database migrations are managed via Alembic.

---

**Built for students, by students. Let's make campus life better.**

---

## 🌈 Frontend Note (Tailwind CSS)
- Any demo or admin UI that interfaces with this backend should use Tailwind CSS for rapid development and consistent styling.
- CORS is enabled for Tailwind-based clients; connect to API at `http://localhost:8001` and Socket.IO at `/ws`.
