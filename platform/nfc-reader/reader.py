"""
TransitFlow NFC — четец за гише.

Защо съществува
---------------
Когато телефон допре карта, браузърът получава само записания в нея адрес.
Серийният номер на чипа не е част от това — той се предава по-рано, при самото
установяване на връзката, и никой браузър не го подава на страницата.

Тази програма е четец, не браузър. При едно допиране тя взима и двете:

    FF CA 00 00 00   →  серийният номер на чипа
    FF B0 ..         →  адресът, записан в картата

после долепя номера към адреса и го отваря в собствения си прозорец. Затова на
гишето картата се допира веднъж, а системата въпреки това научава кой чип е.

Записаният в картата адрес остава чист: номерът се добавя тук, в момента на
сканиране, и не се вижда никъде върху картата.
"""

import json
import os
import re
import sys
import tempfile
import time

from PyQt6.QtCore import Qt, QThread, pyqtSignal, QUrl, QTimer, QRectF, QCoreApplication
from PyQt6.QtGui import QColor, QFont, QIcon, QPainter, QPen, QTextCursor
from PyQt6.QtWidgets import (
    QApplication, QHBoxLayout, QLabel, QMainWindow, QMessageBox,
    QSplitter, QTextEdit, QVBoxLayout, QWidget,
)

APP_NAME = "TransitFlow NFC"
DEFAULT_HOME = "https://app.transitflow.org/"

# The brand, so the desk looks like the system it belongs to.
INK = "#0b1120"
PANEL = "#111a2e"
LINE = "#1e293b"
CYAN = "#22d3ee"
TEXT = "#e2e8f0"
MUTED = "#94a3b8"
GOOD = "#22c55e"
WARN = "#fbbf24"
BAD = "#f87171"

# Filled in by load_dependencies(), which runs while the splash screen is up —
# QtWebEngine and pyscard together take seconds to import, and a window that
# appears instantly and then explains itself beats a few seconds of nothing.
QWebEngineView = None
QWebEnginePage = None
BrowserPage = None
readers = None
toHexString = None
smartcard_available = False


def base_dir() -> str:
    """Where the program lives — next to the .exe once it is packaged."""
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))


def load_settings() -> dict:
    """
    Optional settings.json beside the program.

    Only one thing is worth setting: which page to open at startup. Everything
    else about a card — which company it belongs to, its printed number — is in
    the card's own address or in the system, so the reader needs to know none of
    it.
    """
    path = os.path.join(base_dir(), "settings.json")
    settings = {"home": DEFAULT_HOME}
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                loaded = json.load(f)
            if isinstance(loaded, dict) and isinstance(loaded.get("home"), str):
                settings["home"] = loaded["home"].strip() or DEFAULT_HOME
        except Exception:
            pass
    return settings


def load_dependencies():
    global QWebEngineView, QWebEnginePage, BrowserPage
    global readers, toHexString, smartcard_available

    from PyQt6.QtWebEngineWidgets import QWebEngineView as _View
    from PyQt6.QtWebEngineCore import QWebEnginePage as _Page
    QWebEngineView = _View
    QWebEnginePage = _Page

    class _BrowserPage(_Page):
        """A page that can open a second window, and says what it is doing."""

        def __init__(self, log_signal, parent=None):
            super().__init__(parent)
            self.log_signal = log_signal
            self.view_ref = parent
            self._windows = []

        def createWindow(self, window_type):
            try:
                window = QMainWindow()
                view = QWebEngineView(window)
                page = _BrowserPage(self.log_signal, view)
                view.setPage(page)

                main = (self.view_ref or self.view()).window()
                if hasattr(main, "grant_camera"):
                    page.featurePermissionRequested.connect(main.grant_camera)
                if hasattr(main, "print_to_pdf"):
                    page.printRequested.connect(main.print_to_pdf)

                window.setCentralWidget(view)
                window.setWindowTitle(f"{APP_NAME} — профил")
                window.resize(1000, 760)
                # Kept on the instance, or PyQt collects them and the window shuts.
                window.view = view
                window.page = page
                window.setAttribute(Qt.WidgetAttribute.WA_DeleteOnClose)
                self._windows.append(window)
                window.destroyed.connect(
                    lambda: self._windows.remove(window) if window in self._windows else None
                )
                window.show()
                window.raise_()
                return page
            except Exception as e:
                self.log_signal.emit(f"Прозорецът не се отвори: {e}")
                return None

    BrowserPage = _BrowserPage

    try:
        from smartcard.System import readers as _readers
        from smartcard.util import toHexString as _toHexString
        readers = _readers
        toHexString = _toHexString
        smartcard_available = True
    except ImportError:
        smartcard_available = False


def read_ndef_url(connection):
    """
    The address written in the card.

    Read page by page from block 4 — where the user memory of an NTAG starts —
    until the card stops answering, then pick the URI record out of the NDEF
    message. The one-byte prefix at its head stands for the scheme, which is why
    "https://" takes no room on the card.
    """
    raw = bytearray()
    for block in range(4, 36):
        try:
            data, s1, s2 = connection.transmit([0xFF, 0xB0, 0x00, block, 0x04])
            if s1 == 0x90 and s2 == 0x00:
                raw.extend(data)
            else:
                break
        except Exception:
            break

    if not raw:
        return None

    prefixes = {
        0x00: "", 0x01: "http://www.", 0x02: "https://www.",
        0x03: "http://", 0x04: "https://",
    }

    try:
        i = 0
        while i < len(raw) - 3:
            if raw[i] == 0x03:  # NDEF message TLV
                length = raw[i + 1]
                if i + 2 + length <= len(raw):
                    ndef = raw[i + 2: i + 2 + length]
                    if len(ndef) > 5 and ndef[3] == 0x55:  # 'U' — a URI record
                        body = ndef[5:].decode("ascii", errors="ignore")
                        body = body.rstrip("\x00").rstrip("\xfe")
                        return prefixes.get(ndef[4], "") + body
            i += 1
    except Exception:
        pass

    # A card written by something that laid the message out differently still
    # has the address in it as plain text.
    try:
        text = raw.decode("ascii", errors="ignore")
        found = re.search(r"https?://\S+", text)
        if found:
            return re.sub(r"[^\x20-\x7E].*$", "", found.group(0)).strip()
    except Exception:
        pass

    return None


class ReaderThread(QThread):
    """Watches the reader and reports every card that touches it."""

    reader_status = pyqtSignal(str, str)          # text, colour
    scan_status = pyqtSignal(str, str, str, str)  # icon, text, colour, detail
    history = pyqtSignal(str, bool)               # text, went well
    card_scanned = pyqtSignal(str)                # the address to open

    def __init__(self):
        super().__init__()
        self.running = True
        self.last_uid = None
        self.last_time = 0.0

    def find_reader(self):
        while self.running:
            try:
                available = readers()
                # A contactless reader announces itself as PICC; anything else
                # plugged in is more likely a chip-and-pin slot.
                for reader in available:
                    if "PICC" in str(reader).upper():
                        return reader
                if available:
                    return available[-1]
                self.reader_status.emit("Четецът не е намерен", BAD)
            except Exception as e:
                self.reader_status.emit(f"Грешка при четеца: {e}", BAD)
            time.sleep(2)
        return None

    def run(self):
        reader = self.find_reader()
        if not reader:
            return
        self.reader_status.emit(f"Свързан: {reader}", GOOD)
        self.scan_status.emit("📡", "Готов за сканиране", CYAN, "Поставете карта върху четеца")

        holding = False
        while self.running:
            try:
                connection = reader.createConnection()
                connection.connect()

                if not holding:
                    holding = True
                    self.scan_status.emit("💳", "Четене…", WARN, "Задръжте картата")

                uid_data, s1, s2 = connection.transmit([0xFF, 0xCA, 0x00, 0x00, 0x00])
                if s1 != 0x90 or s2 != 0x00:
                    time.sleep(0.4)
                    continue

                uid = toHexString(uid_data).replace(" ", "").upper()

                # A card left lying on the reader repeats every few hundred
                # milliseconds; one tap should be one scan.
                now = time.time()
                if uid == self.last_uid and now - self.last_time < 3:
                    time.sleep(0.5)
                    continue
                self.last_uid, self.last_time = uid, now

                url = read_ndef_url(connection)
                if not url:
                    self.history.emit("Карта без адрес на TransitFlow", False)
                    self.scan_status.emit("❌", "Непозната карта", BAD,
                                          "В картата няма записан адрес")
                    time.sleep(2)
                    self.scan_status.emit("📡", "Готов за сканиране", CYAN,
                                          "Поставете карта върху четеца")
                    continue

                url = url.strip().rstrip("\x00").strip()
                if not url.startswith("http"):
                    url = "https://" + url

                # The serial is added here, at the moment of the tap. It is not
                # written on the card and does not appear on it anywhere.
                joined = f"{url}{'&' if '?' in url else '?'}uid={uid}"

                self.history.emit(f"Карта прочетена\n{url}\nЧип: {uid}", True)
                self.scan_status.emit("✅", "Прочетена", GOOD, f"Чип: {uid}")
                self.card_scanned.emit(joined)

                time.sleep(2)
                self.scan_status.emit("📡", "Готов за следваща", CYAN,
                                      "Поставете карта върху четеца")

            except Exception:
                # No card on the reader is the ordinary case, not an error.
                if holding:
                    holding = False
                time.sleep(0.4)

    def stop(self):
        self.running = False


class Splash(QWidget):
    """Something on screen while QtWebEngine loads, which is not instant."""

    def __init__(self):
        super().__init__()
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint | Qt.WindowType.WindowStaysOnTopHint)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setFixedSize(340, 200)
        screen = QApplication.primaryScreen().geometry()
        self.move(screen.center().x() - 170, screen.center().y() - 100)
        self.angle = 0
        self.timer = QTimer(self)
        self.timer.timeout.connect(self.spin)
        self.timer.start(28)

    def spin(self):
        self.angle = (self.angle + 6) % 360
        self.update()

    def paintEvent(self, _event):
        p = QPainter(self)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)

        p.setBrush(QColor(INK))
        p.setPen(QPen(QColor(LINE), 1))
        p.drawRoundedRect(QRectF(0, 0, self.width(), self.height()), 18, 18)

        p.setPen(QPen(QColor(CYAN), 3))
        p.drawArc(QRectF(self.width() / 2 - 22, 52, 44, 44), self.angle * 16, 110 * 16)

        p.setPen(QColor(TEXT))
        p.setFont(QFont("Segoe UI", 13, QFont.Weight.DemiBold))
        p.drawText(QRectF(0, 112, self.width(), 26), Qt.AlignmentFlag.AlignCenter, APP_NAME)

        p.setPen(QColor(MUTED))
        p.setFont(QFont("Segoe UI", 9))
        p.drawText(QRectF(0, 140, self.width(), 22), Qt.AlignmentFlag.AlignCenter, "Зареждане…")
        p.end()


class MainWindow(QMainWindow):
    log = pyqtSignal(str)

    def __init__(self, settings):
        super().__init__()
        self.settings = settings
        self.setWindowTitle(APP_NAME)
        self.resize(1280, 840)
        icon = os.path.join(base_dir(), "icon.ico")
        if os.path.exists(icon):
            self.setWindowIcon(QIcon(icon))

        self.build_ui()

        self.thread = ReaderThread()
        self.thread.reader_status.connect(self.set_reader_status)
        self.thread.scan_status.connect(self.set_scan_status)
        self.thread.history.connect(self.add_history)
        self.thread.card_scanned.connect(self.open_url)
        self.thread.start()

        self.log.connect(lambda text: self.add_history(text, True))

    # ── Layout ──────────────────────────────────────────────────────────────

    def build_ui(self):
        self.setStyleSheet(f"""
            QMainWindow, QWidget {{ background: {INK}; color: {TEXT};
                                    font-family: 'Segoe UI'; }}
            QTextEdit {{ background: {PANEL}; border: 1px solid {LINE};
                         border-radius: 10px; padding: 8px; color: {MUTED};
                         font-size: 12px; }}
            QSplitter::handle {{ background: {LINE}; }}
        """)

        side = QWidget()
        side.setFixedWidth(330)
        column = QVBoxLayout(side)
        column.setContentsMargins(16, 16, 16, 16)
        column.setSpacing(12)

        title = QLabel(APP_NAME)
        title.setFont(QFont("Segoe UI", 16, QFont.Weight.Bold))
        title.setStyleSheet(f"color: {CYAN};")
        column.addWidget(title)

        self.reader_label = QLabel("Търсене на четец…")
        self.reader_label.setWordWrap(True)
        self.reader_label.setStyleSheet(f"color: {MUTED}; font-size: 12px;")
        column.addWidget(self.reader_label)

        card = QWidget()
        card.setStyleSheet(f"background: {PANEL}; border: 1px solid {LINE}; border-radius: 14px;")
        inner = QVBoxLayout(card)
        inner.setContentsMargins(16, 20, 16, 20)
        inner.setSpacing(8)

        self.scan_icon = QLabel("⏳")
        self.scan_icon.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.scan_icon.setStyleSheet("font-size: 40px; border: none;")
        inner.addWidget(self.scan_icon)

        self.scan_text = QLabel("Изчакайте")
        self.scan_text.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.scan_text.setFont(QFont("Segoe UI", 12, QFont.Weight.DemiBold))
        self.scan_text.setStyleSheet("border: none;")
        inner.addWidget(self.scan_text)

        self.scan_detail = QLabel("")
        self.scan_detail.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.scan_detail.setWordWrap(True)
        self.scan_detail.setStyleSheet(f"color: {MUTED}; font-size: 11px; border: none;")
        inner.addWidget(self.scan_detail)

        column.addWidget(card)

        history_label = QLabel("Последни сканирания")
        history_label.setStyleSheet(f"color: {MUTED}; font-size: 11px; font-weight: 600;")
        column.addWidget(history_label)

        self.history_box = QTextEdit()
        self.history_box.setReadOnly(True)
        column.addWidget(self.history_box, 1)

        self.browser = QWebEngineView()
        page = BrowserPage(self.log, self.browser)
        self.browser.setPage(page)
        page.featurePermissionRequested.connect(self.grant_camera)
        page.printRequested.connect(self.print_to_pdf)
        self.browser.setUrl(QUrl(self.settings["home"]))

        splitter = QSplitter(Qt.Orientation.Horizontal)
        splitter.addWidget(side)
        splitter.addWidget(self.browser)
        splitter.setStretchFactor(1, 1)

        wrapper = QWidget()
        layout = QHBoxLayout(wrapper)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.addWidget(splitter)
        self.setCentralWidget(wrapper)

    # ── Signals ─────────────────────────────────────────────────────────────

    def set_reader_status(self, text, colour):
        self.reader_label.setText(text)
        self.reader_label.setStyleSheet(f"color: {colour}; font-size: 12px;")

    def set_scan_status(self, icon, text, colour, detail):
        self.scan_icon.setText(icon)
        self.scan_text.setText(text)
        self.scan_text.setStyleSheet(f"color: {colour}; border: none;")
        self.scan_detail.setText(detail)

    def add_history(self, text, ok):
        colour = GOOD if ok else BAD
        stamp = time.strftime("%H:%M:%S")
        body = text.replace("\n", "<br>")
        self.history_box.append(
            f'<div style="margin-bottom:8px">'
            f'<span style="color:{MUTED}">{stamp}</span> '
            f'<span style="color:{colour}">{body}</span></div>'
        )
        self.history_box.moveCursor(QTextCursor.MoveOperation.End)

    def open_url(self, url):
        self.browser.setUrl(QUrl(url))
        self.raise_()
        self.activateWindow()

    # ── What the page is allowed to do ──────────────────────────────────────

    def grant_camera(self, origin, feature):
        """
        The camera, because issuing a card takes the passenger's photograph.
        Everything else is refused — the desk has no reason to hand out a
        microphone or a location.
        """
        from PyQt6.QtWebEngineCore import QWebEnginePage as Page
        allowed = feature in (Page.Feature.MediaVideoCapture,
                              Page.Feature.MediaAudioVideoCapture)
        page = self.sender() if isinstance(self.sender(), Page) else self.browser.page()
        page.setFeaturePermission(
            origin, feature,
            Page.PermissionPolicy.PermissionGrantedByUser if allowed
            else Page.PermissionPolicy.PermissionDeniedByUser,
        )

    def print_to_pdf(self):
        """Reports print through a PDF, which the system opens to preview."""
        try:
            page = self.sender() or self.browser.page()
            path = os.path.join(tempfile.gettempdir(), f"transitflow_{int(time.time())}.pdf")

            def finished(saved_path, ok):
                try:
                    page.pdfPrintingFinished.disconnect(finished)
                except Exception:
                    pass
                if ok:
                    self.add_history(f"Документът е готов: {saved_path}", True)
                    os.startfile(saved_path)
                else:
                    self.add_history("Документът не се подготви", False)

            page.pdfPrintingFinished.connect(finished)
            page.printToPdf(path)
        except Exception as e:
            self.add_history(f"Грешка при печат: {e}", False)

    def closeEvent(self, event):
        self.thread.stop()
        self.thread.wait(1500)
        event.accept()


def main():
    QCoreApplication.setAttribute(Qt.ApplicationAttribute.AA_ShareOpenGLContexts)
    app = QApplication(sys.argv)
    app.setStyle("Fusion")

    splash = Splash()
    splash.show()
    app.processEvents()

    load_dependencies()
    app.processEvents()

    if not smartcard_available:
        splash.close()
        box = QMessageBox()
        box.setIcon(QMessageBox.Icon.Critical)
        box.setWindowTitle(APP_NAME)
        box.setText(
            "Липсва библиотеката за четеца (pyscard).\n\n"
            "Инсталирайте я с:\n    pip install pyscard"
        )
        box.exec()
        sys.exit(1)

    window = MainWindow(load_settings())
    window.show()
    splash.close()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
