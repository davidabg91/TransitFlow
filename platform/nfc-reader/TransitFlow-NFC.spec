# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller recipe for the desk reader.

QtWebEngine is not found on its own — its process, resources and translations
have to be named, or the packaged program starts and shows a blank window.

Which Qt is packaged is decided by which one the environment has, the same way
reader.py decides at runtime. Qt 6 is the ordinary build; a Qt 5 environment
produces the Windows 7 one. See qtcompat.py for why the second exists.
"""
import os
from PyInstaller.utils.hooks import collect_data_files, collect_dynamic_libs

try:
    import PyQt6  # noqa: F401
    QT, MAJOR = 'PyQt6', 'Qt6'
except ImportError:
    QT, MAJOR = 'PyQt5', 'Qt5'

print(f'*** TransitFlow NFC: packaging against {QT}')

datas = collect_data_files(QT, includes=[
    f'{MAJOR}/resources/*',
    f'{MAJOR}/translations/qtwebengine_locales/*',
])
datas += [('settings.json', '.')]
if os.path.exists('icon.ico'):
    datas += [('icon.ico', '.')]

binaries = collect_dynamic_libs(QT)

a = Analysis(
    ['reader.py'],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=[
        # Imported late, from qtcompat.web_engine(), so nothing in the source
        # names them where PyInstaller would see it. Qt 5 keeps the page in
        # QtWebEngineWidgets; Qt 6 moved it to QtWebEngineCore.
        f'{QT}.QtWebEngineWidgets',
        f'{QT}.QtWebEngineCore',
        'smartcard',
        'smartcard.System',
        'smartcard.util',
    ],
    hookspath=[],
    runtime_hooks=[],
    # The other Qt, if it happens to be installed, would be packaged alongside
    # and the program would load whichever answered first.
    excludes=['PyQt6'] if QT == 'PyQt5' else ['PyQt5'],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='TransitFlow-NFC',
    debug=False,
    strip=False,
    upx=False,
    console=False,
    icon='icon.ico' if os.path.exists('icon.ico') else None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    name='TransitFlow-NFC',
)
