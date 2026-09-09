# -*- coding: utf-8 -*-
"""
The one place that knows which Qt this is.

Qt 6 does not run on Windows 7 and never will: it asks for a Windows 10 API set
the older system never had, which is what `api-ms-win-core-path-l1-1-0.dll is
missing` means when it appears at a counter. Python says the same thing a
different way — 3.8 was the last release for Windows 7, and 3.9 onwards links
that same API.

One of our companies runs its desk on such a machine, so the reader has to be
buildable against Qt 5 as well. The alternative to this file is two copies of a
nine-hundred-line program that must be kept in step by hand, and they would not
stay in step. So everything the two Qts spell differently is spelled once, here,
and `reader.py` reads the same on both.

Qt 6 is used wherever it is installed. Qt 5 is what a Windows 7 build gets, and
nothing outside this file needs to know which it got.
"""

QT5 = False

try:
    from PyQt6.QtCore import (  # noqa: F401
        Qt, QThread, pyqtSignal, QUrl, QTimer, QRectF, QCoreApplication,
    )
    from PyQt6.QtGui import (  # noqa: F401
        QColor, QFont, QIcon, QPainter, QPen, QTextCursor,
    )
    from PyQt6.QtWidgets import (  # noqa: F401
        QApplication, QHBoxLayout, QLabel, QMainWindow, QMessageBox,
        QSplitter, QTextEdit, QVBoxLayout, QWidget,
    )
except ImportError:
    QT5 = True
    from PyQt5.QtCore import (  # noqa: F401
        Qt, QThread, pyqtSignal, QUrl, QTimer, QRectF, QCoreApplication,
    )
    from PyQt5.QtGui import (  # noqa: F401
        QColor, QFont, QIcon, QPainter, QPen, QTextCursor,
    )
    from PyQt5.QtWidgets import (  # noqa: F401
        QApplication, QHBoxLayout, QLabel, QMainWindow, QMessageBox,
        QSplitter, QTextEdit, QVBoxLayout, QWidget,
    )

# ─────────────────────────────────────────────────────────────────────────────
# Names for the constants
#
# Qt 6 nests them under the enum they belong to; Qt 5 hangs them off the class.
# Neither spelling works on the other, so the program uses neither and says
# ALIGN_CENTRE.
# ─────────────────────────────────────────────────────────────────────────────

if QT5:
    ALIGN_CENTER = Qt.AlignCenter
    HORIZONTAL = Qt.Horizontal
    FRAMELESS = Qt.FramelessWindowHint
    STAYS_ON_TOP = Qt.WindowStaysOnTopHint
    WA_DELETE_ON_CLOSE = Qt.WA_DeleteOnClose
    WA_TRANSLUCENT = Qt.WA_TranslucentBackground
    AA_SHARE_OPENGL = Qt.AA_ShareOpenGLContexts
    ANTIALIASING = QPainter.Antialiasing
    WEIGHT_BOLD = QFont.Bold
    WEIGHT_DEMIBOLD = QFont.DemiBold
    CURSOR_END = QTextCursor.End
    ICON_CRITICAL = QMessageBox.Critical
else:
    ALIGN_CENTER = Qt.AlignmentFlag.AlignCenter
    HORIZONTAL = Qt.Orientation.Horizontal
    FRAMELESS = Qt.WindowType.FramelessWindowHint
    STAYS_ON_TOP = Qt.WindowType.WindowStaysOnTopHint
    WA_DELETE_ON_CLOSE = Qt.WidgetAttribute.WA_DeleteOnClose
    WA_TRANSLUCENT = Qt.WidgetAttribute.WA_TranslucentBackground
    AA_SHARE_OPENGL = Qt.ApplicationAttribute.AA_ShareOpenGLContexts
    ANTIALIASING = QPainter.RenderHint.Antialiasing
    WEIGHT_BOLD = QFont.Weight.Bold
    WEIGHT_DEMIBOLD = QFont.Weight.DemiBold
    CURSOR_END = QTextCursor.MoveOperation.End
    ICON_CRITICAL = QMessageBox.Icon.Critical


def web_engine():
    """
    The browser classes, imported late.

    Late because loading QtWebEngine takes seconds, and the splash screen is up
    while it happens. Qt 6 moved the page out of QtWebEngineWidgets and into
    QtWebEngineCore; Qt 5 keeps both together.
    """
    if QT5:
        from PyQt5.QtWebEngineWidgets import QWebEngineView, QWebEnginePage
    else:
        from PyQt6.QtWebEngineWidgets import QWebEngineView
        from PyQt6.QtWebEngineCore import QWebEnginePage
    return QWebEngineView, QWebEnginePage


def camera_features(page_class):
    """The two permissions a photograph needs, named for whichever Qt this is."""
    if QT5:
        return (page_class.MediaVideoCapture, page_class.MediaAudioVideoCapture)
    return (page_class.Feature.MediaVideoCapture,
            page_class.Feature.MediaAudioVideoCapture)


def permission(page_class, granted):
    """Granted or refused, named for whichever Qt this is."""
    if QT5:
        return (page_class.PermissionGrantedByUser if granted
                else page_class.PermissionDeniedByUser)
    return (page_class.PermissionPolicy.PermissionGrantedByUser if granted
            else page_class.PermissionPolicy.PermissionDeniedByUser)


def enable_high_dpi():
    """
    Qt 6 scales for the screen without being asked. Qt 5 has to be told, and
    told before the QApplication exists, or a counter on a laptop gets a window
    drawn at a quarter size with blurred text.
    """
    if not QT5:
        return
    for name in ("AA_EnableHighDpiScaling", "AA_UseHighDpiPixmaps"):
        attribute = getattr(Qt, name, None)
        if attribute is not None:
            QCoreApplication.setAttribute(attribute, True)


def run(app):
    """Qt 5 spells it exec_, because exec was a keyword when it was named."""
    return app.exec_() if QT5 else app.exec()


def show(dialog):
    """The same difference, for a modal box."""
    return dialog.exec_() if QT5 else dialog.exec()
