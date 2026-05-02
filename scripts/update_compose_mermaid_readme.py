#!/usr/bin/env python3
"""
Replace the Mermaid block between COMPOSE_MERMAID_AUTO_START/END in README.md
using docker-compose-viz-mermaid (docker-compose.yml → Mermaid text).

Requires Docker. From repo root:
  python scripts/update_compose_mermaid_readme.py

Environment:
  COMPOSE_VIZ_IMAGE — override image (default: derlin/docker-compose-viz-mermaid)
"""
from __future__ import annotations

import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
README = ROOT / "README.md"
COMPOSE_REL = "docker-compose.yml"
IMAGE = os.environ.get("COMPOSE_VIZ_IMAGE", "derlin/docker-compose-viz-mermaid")

START = "<!-- COMPOSE_MERMAID_AUTO_START -->"
END = "<!-- COMPOSE_MERMAID_AUTO_END -->"


def run_viz() -> str:
    compose = ROOT / COMPOSE_REL
    if not compose.is_file():
        sys.exit(f"Missing {compose}")

    cmd = [
        "docker",
        "run",
        "--rm",
        "-v",
        f"{ROOT}:/work",
        "-w",
        "/work",
        IMAGE,
        COMPOSE_REL,
        "-f",
        "text",
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        msg = r.stderr.strip() or r.stdout.strip() or "unknown error"
        sys.exit(f"docker-compose-viz-mermaid failed ({r.returncode}): {msg}")
    return r.stdout.rstrip("\n")


def main() -> None:
    text = README.read_text(encoding="utf-8")
    if START not in text or END not in text:
        sys.exit(f"{README} must contain {START!r} and {END!r}")

    mermaid_body = run_viz().strip()
    if not mermaid_body:
        sys.exit("Visualizer returned empty Mermaid output")

    block = f"```mermaid\n{mermaid_body}\n```"
    pattern = re.compile(re.escape(START) + r"\s*.*?\s*" + re.escape(END), re.DOTALL)
    new_text, n = pattern.subn(f"{START}\n{block}\n{END}", text, count=1)
    if n != 1:
        sys.exit("Could not replace exactly one marked region (check markers are unique and paired).")

    if new_text == text:
        print("README.md already up to date.")
        return

    README.write_text(new_text, encoding="utf-8", newline="\n")
    print("Updated README.md Mermaid diagram.")


if __name__ == "__main__":
    main()
