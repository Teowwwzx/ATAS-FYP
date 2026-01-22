from __future__ import annotations

from app.worker import ping


def main() -> None:
    res = ping.delay()
    print(res.get(timeout=10))


if __name__ == "__main__":
    main()

