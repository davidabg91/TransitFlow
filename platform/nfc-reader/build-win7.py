# -*- coding: utf-8 -*-
"""
Builds the Windows 7 copy of the reader.

Run it with any Python:

    python build-win7.py

There are two things this exists to get right, and both of them cost an
afternoon to find:

1.  It builds somewhere else. Qt 5 hangs at startup when its own files sit under
    a path with Cyrillic in it, and this project lives in „ИИ ПРОЕКТИ“. The
    program never gets as far as printing anything — it simply stops inside
    Qt5Core — so the symptom looks like a broken build rather than a bad path.
    Everything is copied to a plain ASCII folder and built there.

2.  It builds with Python 3.8. Not because anything here needs an old Python,
    but because 3.9 onwards links a Windows 10 API that Windows 7 does not have,
    which is the whole reason the customer saw
    „api-ms-win-core-path-l1-1-0.dll is missing“. Newer Pythons also turn on
    hardware stack protection, which Qt 5.15's binaries predate and are killed
    by, so even on Windows 10 the build would not start.

Afterwards it reads the import table of everything it produced and reports any
library that Windows 7 does not have — the one check that can be made without a
Windows 7 machine to hand.
"""
import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCES = ["reader.py", "qtcompat.py", "settings.json", "icon.ico",
           "TransitFlow-NFC.spec", "win7check.py"]

# Pinned, because these are the last versions that work where this has to work.
# PyQt5 5.15 is the last Qt with Windows 7 support; PyInstaller 6 produces a
# bootloader that does not start there.
PACKAGES = ["PyQt5==5.15.10", "PyQtWebEngine==5.15.6",
            "pyscard==2.0.7", "pyinstaller==5.13.2"]

PYTHON38 = os.environ.get("PYTHON38") or os.path.join(
    os.environ.get("LOCALAPPDATA", ""), "Programs", "Python", "Python38", "python.exe")

BUILD = os.path.join(tempfile.gettempdir(), "transitflow-win7")


def run(*command, **kwargs):
    print("  $", " ".join(str(c) for c in command[:3]), "…" if len(command) > 3 else "")
    subprocess.run(command, check=True, **kwargs)


def main():
    if not os.path.exists(PYTHON38):
        print("Липсва Python 3.8.\n"
              "  Свалете python-3.8.10-amd64.exe от python.org и го сложете в\n"
              f"  {os.path.dirname(PYTHON38)}\n"
              "  или посочете друго място през променливата PYTHON38.")
        return 1

    version = subprocess.run([PYTHON38, "-c", "import sys; print('%d.%d' % sys.version_info[:2])"],
                             capture_output=True, text=True).stdout.strip()
    if version != "3.8":
        print(f"PYTHON38 сочи към Python {version}, а трябва 3.8.")
        return 1

    if os.path.exists(BUILD):
        shutil.rmtree(BUILD)
    os.makedirs(BUILD)
    print(f"Строи се в {BUILD}")

    for name in SOURCES:
        source = os.path.join(HERE, name)
        if os.path.exists(source):
            shutil.copy2(source, BUILD)

    venv = os.path.join(BUILD, ".venv")
    python = os.path.join(venv, "Scripts", "python.exe")
    print("Обкръжение…")
    run(PYTHON38, "-m", "venv", venv)
    run(python, "-m", "pip", "install", "--quiet", *PACKAGES)

    print("Пакетиране…")
    run(python, "-m", "PyInstaller", "TransitFlow-NFC.spec", "--noconfirm", cwd=BUILD)

    out = os.path.join(BUILD, "dist", "TransitFlow-NFC")
    shutil.copy2(os.path.join(BUILD, "settings.json"), out)

    print("\nПроверка за Windows 7:")
    check = subprocess.run([python, os.path.join(BUILD, "win7check.py"), out])

    print(f"\nГотово: {out}")
    if check.returncode:
        print("Има файлове, които няма да тръгнат на Windows 7 — вижте горе.")
    return check.returncode


if __name__ == "__main__":
    sys.exit(main())
