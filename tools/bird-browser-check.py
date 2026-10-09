"""Compatibility entry point for the current Bird Siege round model."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name('bird-v2-browser-check.py')),run_name="__main__")
