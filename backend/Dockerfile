# ==========================================
# 第一阶段：构建环境 (Builder)
# ==========================================
FROM python:3.11-slim AS builder

# 设置工作目录
WORKDIR /app

# 设置环境变量，防止 Python 产生 .pyc 文件以及启用缓冲
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 安装构建依赖（有些包需要编译，如 psycopg2）
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
  && rm -rf /var/lib/apt/lists/*

# 创建并激活虚拟环境，安装依赖
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# ==========================================
# 第二阶段：运行环境 (Final)
# ==========================================
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 从 builder 阶段只拷贝安装好的虚拟环境（不拷贝源代码和构建工具）
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# 安装数据库运行时的必要库（体积非常小）
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    bash \
    curl \
    libpq5 \
  && rm -rf /var/lib/apt/lists/*

COPY . /app

# 【关键】大厂标准：不要使用 root 用户运行容器
RUN useradd -m appuser \
  && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

