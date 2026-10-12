"""Restore only artifacts from this branch or main, never unrelated PR branches."""
import json
import os
import subprocess
from pathlib import Path


def main():
    repo = os.environ["GITHUB_REPOSITORY"]
    branch = os.environ["GITHUB_REF_NAME"]
    selections = [("Olena-Math-Qwen-Candidate-v2", "previous"), ("Olena-Math-Training-Report-v2", "last-attempt")]
    for name, directory in selections:
        response = subprocess.run(["gh", "api", f"repos/{repo}/actions/artifacts?name={name}&per_page=30"], capture_output=True, text=True, timeout=30)
        if response.returncode:
            raise RuntimeError("Cannot inspect retained training artifacts")
        artifacts = json.loads(response.stdout)["artifacts"]
        allowed = [a for a in artifacts if not a["expired"] and a["workflow_run"]["head_branch"] in {"main", branch}]
        if not allowed:
            print(f"No retained {name}; start with the verified base.")
            continue
        latest = max(allowed, key=lambda a: a["created_at"])
        destination = Path(".olena-learning") / directory
        result = subprocess.run(["gh", "run", "download", str(latest["workflow_run"]["id"]), "--name", name, "--dir", str(destination)], capture_output=True, text=True, timeout=120)
        if result.returncode:
            raise RuntimeError("Cannot restore retained training artifact; refusing silent reset")
        print(f"Restored {name} from run {latest['workflow_run']['id']}.")


if __name__ == "__main__":
    main()
