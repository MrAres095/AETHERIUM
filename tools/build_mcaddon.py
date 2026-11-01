#!/usr/bin/env python3
"""Build a distributable AETHERIUM .mcaddon from the repository packs."""
from __future__ import annotations

import json
import subprocess
import sys
import zipfile
from io import BytesIO
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"


def read_manifest(pack: Path) -> dict:
    path = pack / "manifest.json"
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def make_mcpack(pack: Path) -> bytes:
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(pack.rglob("*")):
            if path.is_file():
                archive.write(path, path.relative_to(pack).as_posix())
    return buffer.getvalue()


def main() -> int:
    validator = ROOT / "tools" / "validate_pack.py"
    result = subprocess.run([sys.executable, str(validator)], cwd=ROOT)
    if result.returncode:
        print("Build stopped: static validation failed.", file=sys.stderr)
        return result.returncode

    bp = ROOT / "behavior_pack"
    rp = ROOT / "resource_pack"
    bp_manifest = read_manifest(bp)
    rp_manifest = read_manifest(rp)
    version = bp_manifest["header"]["version"]
    if version != rp_manifest["header"]["version"]:
        print("Build stopped: behavior/resource pack versions differ.", file=sys.stderr)
        return 1

    version_text = ".".join(str(part) for part in version)
    output = DIST / f"AETHERIUM-{version_text}.mcaddon"
    DIST.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as addon:
        addon.writestr("AETHERIUM-Behavior.mcpack", make_mcpack(bp))
        addon.writestr("AETHERIUM-Resources.mcpack", make_mcpack(rp))

    with zipfile.ZipFile(output, "r") as addon:
        bad_member = addon.testzip()
        if bad_member:
            output.unlink(missing_ok=True)
            print(f"Build stopped: corrupt archive member {bad_member}", file=sys.stderr)
            return 1
        names = set(addon.namelist())
        expected = {"AETHERIUM-Behavior.mcpack", "AETHERIUM-Resources.mcpack"}
        if names != expected:
            output.unlink(missing_ok=True)
            print("Build stopped: unexpected .mcaddon contents.", file=sys.stderr)
            return 1
        for name in sorted(expected):
            payload = BytesIO(addon.read(name))
            with zipfile.ZipFile(payload, "r") as pack:
                if pack.testzip():
                    output.unlink(missing_ok=True)
                    print(f"Build stopped: corrupt nested pack {name}", file=sys.stderr)
                    return 1
                if "manifest.json" not in pack.namelist():
                    output.unlink(missing_ok=True)
                    print(f"Build stopped: {name} has no manifest.json", file=sys.stderr)
                    return 1

    print(f"Built: {output.relative_to(ROOT)} ({output.stat().st_size} bytes)")
    print("Archive integrity passed. Import and in-game testing are still required.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
