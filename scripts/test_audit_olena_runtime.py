import contextlib
import io
import json
import runpy
import types
import unittest
from pathlib import Path
from unittest.mock import patch


class AuditTest(unittest.TestCase):
    def setUp(self):
        self.main = runpy.run_path(str(Path(__file__).with_name("audit-olena-runtime.py")))["main"]

    def execute(self, payload, version="2.14.1+cpu"):
        with patch.dict("sys.modules", {"torch": types.SimpleNamespace(__version__=version)}), patch.dict(
            self.main.__globals__, {"urlopen": lambda request, timeout: io.BytesIO(json.dumps(payload).encode())}
        ), contextlib.redirect_stdout(io.StringIO()):
            self.main()

    def test_clean_expected_version_passes(self):
        self.execute({})

    def test_vulnerability_invalid_response_or_wrong_version_blocks(self):
        for payload in ({"vulns": [{"id": "test-only"}]}, [], {"error": "unavailable"}):
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                self.execute(payload)
        with self.assertRaises(ValueError):
            self.execute({}, version="2.10.0+cpu")

    def test_network_failure_blocks(self):
        def unavailable(request, timeout):
            raise OSError("Audit unavailable")
        with patch.dict("sys.modules", {"torch": types.SimpleNamespace(__version__="2.14.1+cpu")}), patch.dict(
            self.main.__globals__, {"urlopen": unavailable}
        ), self.assertRaises(OSError):
            self.main()


if __name__ == "__main__":
    unittest.main()
