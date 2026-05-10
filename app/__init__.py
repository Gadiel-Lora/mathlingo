"""Compatibility package for legacy imports.

The current Python backend lives under ``backend``. Some tests and debug
scripts still import ``app.*`` from the earlier package layout, so this module
aliases those imports without duplicating code.
"""
from __future__ import annotations

import importlib
import pkgutil
import sys

_ALIASES = ("core", "models", "routes", "schemas", "services")

for _name in _ALIASES:
    _module = importlib.import_module(f"backend.{_name}")
    globals()[_name] = _module
    sys.modules[f"app.{_name}"] = _module

    if hasattr(_module, "__path__"):
        for _info in pkgutil.walk_packages(_module.__path__, prefix=f"backend.{_name}."):
            _submodule = importlib.import_module(_info.name)
            sys.modules[_info.name.replace("backend.", "app.", 1)] = _submodule
