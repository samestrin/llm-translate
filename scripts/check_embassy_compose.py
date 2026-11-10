"""
Check the embassy compose file, as resolved by `docker compose config`.

    docker compose -f docker-compose.embassy.yml config --format json \
        | python scripts/check_embassy_compose.py docker-compose.embassy.yml

`config` resolves `env_file` away, so that one field is read from the file itself.

Fails (exit 1, one line per problem) if a service publishes a host port, mounts
anything, runs a model server, or leaves out `restart: unless-stopped`, the
`.env.embassy` env file or the external `proxy` network; or if the frontend is
not built with the `/api` base URL. See docs/deploy/embassy.md.
"""

import json
import re
import sys

import yaml

SERVICES = {"backend", "frontend"}
API_URL = "/api"
MODEL_SERVER = re.compile(r"ollama|vllm|litellm|llama|text-generation|localai|lmstudio|tgi", re.I)


def problems(config, raw):
    found = []
    services = config.get("services", {})
    if set(services) != SERVICES:
        found.append(f"services are {sorted(services)}, expected {sorted(SERVICES)}")

    for name, svc in services.items():
        if svc.get("ports"):
            found.append(f"{name}: publishes a host port {svc['ports']}")
        if svc.get("volumes"):
            found.append(f"{name}: mounts {[v.get('source') for v in svc['volumes']]}")
        if svc.get("restart") != "unless-stopped":
            found.append(f"{name}: restart is {svc.get('restart')!r}, expected 'unless-stopped'")
        env_files = raw.get("services", {}).get(name, {}).get("env_file", [])
        env_files = [env_files] if isinstance(env_files, str) else env_files
        env_files = [e["path"] if isinstance(e, dict) else e for e in env_files]
        if name == "backend" and env_files != [".env.embassy"]:
            found.append(f"backend: env_file is {env_files}, expected .env.embassy")
        if "proxy" not in svc.get("networks", {}):
            found.append(f"{name}: not on the proxy network")
        image = svc.get("image", "")
        if MODEL_SERVER.search(f"{name} {image}"):
            found.append(f"{name}: looks like a model server ({image or name})")
        if not svc.get("build", {}).get("context"):
            found.append(f"{name}: not built from this repo's production Dockerfile")
        if svc.get("deploy", {}).get("resources", {}).get("reservations", {}).get("devices"):
            found.append(f"{name}: reserves a device (GPU)")

    frontend_args = services.get("frontend", {}).get("build", {}).get("args", {})
    if frontend_args.get("VITE_API_URL") != API_URL:
        found.append(f"frontend: VITE_API_URL build arg is {frontend_args.get('VITE_API_URL')!r}, expected {API_URL!r}")

    proxy = config.get("networks", {}).get("proxy", {})
    if not proxy.get("external"):
        found.append("network proxy is not external")
    return found


def main():
    with open(sys.argv[1]) as f:
        raw = yaml.safe_load(f)
    found = problems(json.load(sys.stdin), raw)
    for line in found:
        print(f"{sys.argv[1]}: {line}")
    if found:
        return 1
    print(f"{sys.argv[1]}: ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
