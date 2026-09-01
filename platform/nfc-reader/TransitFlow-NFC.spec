# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller recipe for the desk reader.

QtWebEngine is not found on its own — its process, resources and translations
have to be named, or the packaged program starts and shows a blank window.
"""
import os
from PyInstaller.utils.hooks import collect_data_files, collect_dynamic_libs

datas = collect_data_files('PyQt6', includes=[
    'Qt6/resources/*',
    'Qt6/translations/qtwebengine_locales/*',
])
datas += [('settings.json', '.')]
if os.path.exists('icon.ico'):
    datas += [('icon.ico', '.')]

binaries = collect_dynamic_libs('PyQt6')

a = Analysis(
    ['reader.py'],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=[
        'PyQt6.QtWebEngineWidgets',
        'PyQt6.QtWebEngineCore',
        'smartcard',
        'smartcard.System',
        'smartcard.util',
    ],
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
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
