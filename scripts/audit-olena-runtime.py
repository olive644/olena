"""Fail-closed OSV check for the official CPU wheel skipped by pip-audit."""
import json
from urllib.request import Request, urlopen


def main():
    import torch

    version = str(torch.__version__).split("+")[0]
    if version != "2.14.1":
        raise ValueError("Unexpected CPU runtime version")
    request = Request(
        "https://api.osv.dev/v1/query",
        data=json.dumps({"package": {"name": "torch", "ecosystem": "PyPI"}, "version": version}).encode(),
        headers={"Content-Type": "application/json"}, method="POST",
    )
    with urlopen(request, timeout=20) as response:
        raw = response.read(1000001)
    if len(raw) > 1000000:
        raise ValueError("Audit response too large")
    payload = json.loads(raw)
    if not isinstance(payload, dict) or payload.get("vulns"):
        raise ValueError("CPU runtime audit failed")
    if set(payload) - {"vulns"}:
        raise ValueError("Unexpected audit response")
    print(f"OSV CPU runtime audit passed: torch {version}")


if __name__ == "__main__":
    main()
