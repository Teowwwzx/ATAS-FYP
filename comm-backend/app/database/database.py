from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import declarative_base
from app.core.config import settings
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

Base = declarative_base()

def get_engine():
    url = settings.DATABASE_URL
    if url.startswith("postgresql+psycopg2://"):
        url = url.replace("postgresql+psycopg2://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    parts = urlsplit(url)
    connect_args: dict | None = None
    if parts.query:
        query_pairs = parse_qsl(parts.query, keep_blank_values=True)
        query_map = {k.lower(): v for (k, v) in query_pairs}

        sslmode = query_map.get("sslmode")
        if sslmode and sslmode.lower() in {"require", "verify-ca", "verify-full"}:
            connect_args = {"ssl": True}

        url = urlunsplit((parts.scheme, parts.netloc, parts.path, "", parts.fragment))

    if connect_args:
        return create_async_engine(url, future=True, echo=False, connect_args=connect_args)
    return create_async_engine(url, future=True, echo=False)
