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

после отваря адреса и подава номера на самата страница. Затова на гишето
картата се допира веднъж, а системата въпреки това научава кой чип е.

Номерът не влиза в адреса. Той се предава на страницата отделно, остава само в
паметта ѝ, и не се появява нито в адресната лента, нито в историята, нито в
нещо, което може да се копира.
"""

import json
import os
import re
import sys
import tempfile
import time

# Must be set before anything of Qt's is touched: the embedded browser reads
# this once, while it is starting, and ignores it afterwards.
#
# Two problems, both from the graphics card, and neither of them ours to fix on
# the machines this runs on.
#
# The page would come apart while scrolling — bands of one moment drawn over
# bands of another — because the drivers that come with ordinary office machines
# deliver the finished frames incorrectly. Drawing through a software card
# instead takes those drivers out of the picture entirely, and unlike simply
# turning the card off, it leaves the fast path intact: the till still scrolls
# like a computer rather than like a slideshow.
#
# The second is that a card is scanned by somebody holding a card, not by
# somebody touching the mouse. The browser inside decides on its own that a
# window nobody is using does not need drawing, so the profile would open into a
# page that was still showing the one before it, until a turn of the wheel woke
# it. The three flags after the first tell it to stay awake.
#
# Overridable, so a desk whose card actually works can be given the real one
# without a new build.
os.environ.setdefault(
    "QTWEBENGINE_CHROMIUM_FLAGS",
    "--use-angle=swiftshader"
    " --disable-renderer-backgrounding"
    " --disable-backgrounding-occluded-windows"
    " --disable-background-timer-throttling",
)

# Qt is reached through qtcompat, which picks Qt 6 where it exists and Qt 5 on
# the Windows 7 build, and gives both the same names. See its own comment for
# why there is a Windows 7 build at all.
import qtcompat
from qtcompat import (
    Qt, QThread, pyqtSignal, QUrl, QTimer, QRectF, QCoreApplication,
    QColor, QFont, QIcon, QPainter, QPen, QTextCursor,
    QApplication, QHBoxLayout, QLabel, QMainWindow, QMessageBox,
    QSplitter, QTextEdit, QVBoxLayout, QWidget,
    ALIGN_CENTER, HORIZONTAL, FRAMELESS, STAYS_ON_TOP,
    WA_DELETE_ON_CLOSE, WA_TRANSLUCENT, AA_SHARE_OPENGL,
    ANTIALIASING, WEIGHT_BOLD, WEIGHT_DEMIBOLD, CURSOR_END, ICON_CRITICAL,
)

APP_NAME = "TransitFlow NFC"
# The site these cards point at. Used only as a last resort, to recognise an
# address whose scheme was stored as a prefix byte and so is not in the text.
CARD_HOST = "transitflow.org"
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
SCARD_RESET_CARD = 1  # replaced from pyscard once it is loaded
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
    settings = {"home": DEFAULT_HOME}

    # Beside the program first, because that is the copy somebody can open and
    # edit; the one packaged inside is the fallback.
    places = [os.path.join(base_dir(), "settings.json")]
    bundled = getattr(sys, "_MEIPASS", None)
    if bundled:
        places.append(os.path.join(bundled, "settings.json"))

    for path in places:
        if not os.path.exists(path):
            continue
        try:
            with open(path, "r", encoding="utf-8") as f:
                loaded = json.load(f)
            if isinstance(loaded, dict) and isinstance(loaded.get("home"), str):
                settings["home"] = loaded["home"].strip() or DEFAULT_HOME
            break
        except Exception:
            continue
    return settings


def load_dependencies():
    global QWebEngineView, QWebEnginePage, BrowserPage
    global readers, toHexString, smartcard_available, SCARD_RESET_CARD

    _View, _Page = qtcompat.web_engine()
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
                window.setAttribute(WA_DELETE_ON_CLOSE)
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
        from smartcard.scard import SCARD_RESET_CARD as _reset
        readers = _readers
        toHexString = _toHexString
        SCARD_RESET_CARD = _reset
        smartcard_available = True
    except ImportError:
        smartcard_available = False


# Keys a card written for NDEF answers to. The first is the one the NFC Forum
# set aside for it; the others are what a card still carries if nobody changed
# them.
NDEF_KEYS = (
    (0xD3, 0xF7, 0xD3, 0xF7, 0xD3, 0xF7),
    (0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF),
    (0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5),
)


# Where a reader is asked to keep a key while it authenticates. Readers differ:
# some take volatile memory, some only non-volatile, and the slot number is not
# universal either. Cheap to try them all, and the alternative is knowing every
# reader on the market.
KEY_SLOTS = (
    (0x00, 0x00),  # volatile, slot 0 — the usual answer
    (0x00, 0x01),  # volatile, slot 1
    (0x20, 0x00),  # non-volatile, slot 0
    (0x20, 0x01),  # non-volatile, slot 1
)


# What the reader says when the card is no longer on it. This is the ordinary
# outcome of moving a card across too quickly, not a fault worth reporting in
# detail — the person just needs to hold it a moment longer.
CARD_GONE = ("0x80100069", "has been removed", "no smart card")


def card_was_lifted(error) -> bool:
    text = str(error).lower()
    return any(mark.lower() in text for mark in CARD_GONE)


def read_mifare_classic(connection, renew=None, remembered=None):
    """
    The memory of a MIFARE Classic card.

    Such a card answers nothing until the reader proves it knows a key, and the
    key belongs to a sector rather than to the whole card. So: load a key into
    the reader, authenticate a sector, read its three data blocks, move on.
    Every fourth block holds the sector's own keys rather than data and is
    skipped, or sixteen bytes of keys land in the middle of the message. Sector
    zero is the card's directory and carries no message.

    A wrong key does not merely fail — the card halts, and the reader then
    reports it as removed although it is lying on the antenna. A fresh
    connection is taken after any attempt that may have left it that way, and
    never before one, since letting go of a working connection wastes a tap.

    Returns the bytes, and either what opened the card or why nothing did.
    """
    def attempt(active, key, p1, slot, key_type):
        """One combination, on one connection. Returns (bytes, still_usable)."""
        try:
            _, s1, s2 = active.transmit([0xFF, 0x82, p1, slot, 0x06] + list(key))
        except Exception as e:
            return (None, "gone" if card_was_lifted(e) else False)
        if (s1, s2) != (0x90, 0x00):
            return (None, False)

        raw = bytearray()
        for sector in range(1, 16):
            first_block = sector * 4
            try:
                _, a1, a2 = active.transmit(
                    [0xFF, 0x86, 0x00, 0x00, 0x05, 0x01, 0x00,
                     first_block, key_type, slot]
                )
            except Exception as e:
                return (bytes(raw) or None, "gone" if card_was_lifted(e) else False)
            if (a1, a2) != (0x90, 0x00):
                # Sector 1 refusing means the key is wrong; a later sector
                # refusing usually means the message already ended.
                return (bytes(raw) or None, False)

            for block in (first_block, first_block + 1, first_block + 2):
                try:
                    data, r1, r2 = active.transmit([0xFF, 0xB0, 0x00, block, 0x10])
                except Exception as e:
                    return (bytes(raw) or None, "gone" if card_was_lifted(e) else False)
                if (r1, r2) != (0x90, 0x00):
                    return (bytes(raw) or None, False)
                raw.extend(data)

        return (bytes(raw) or None, True)

    # Whatever opened the last card is tried first. A company writes all its
    # cards the same way, so after the first one this is the only combination
    # ever needed — and every combination that fails costs somebody a tap.
    combinations = [
        (key, p1, slot, key_type)
        for key in NDEF_KEYS
        for p1, slot in KEY_SLOTS
        for key_type in (0x60, 0x61)
    ]
    if remembered in combinations:
        combinations.remove(remembered)
        combinations.insert(0, remembered)

    active = connection
    for combination in combinations:
        if active is None:
            active = renew() if renew else None
            if active is None:
                # The card is no longer reachable; nothing else will work either.
                return b"", ("gone", None)

        raw, usable = attempt(active, *combination)

        if usable == "gone":
            if raw and extract_ndef_url(raw):
                return raw, ("MIFARE Classic", combination)
            return b"", ("gone", None)

        if raw and extract_ndef_url(raw):
            return raw, ("MIFARE Classic", combination)

        # Anything that did not work may have halted the card.
        if not usable:
            active = None

    return b"", ("keys", None)


# A contactless card's ATR carries its type, in the two bytes after the PC/SC
# identifier A0 00 00 03 06. Reading it beats trying one kind of card and then
# the other: an NTAG needs no key at all, a Classic needs nothing else tried
# first, and each wrong guess costs a tap.
CARD_NAMES = {
    (0x00, 0x01): ("classic", "MIFARE Classic 1K"),
    (0x00, 0x02): ("classic", "MIFARE Classic 4K"),
    (0x00, 0x26): ("classic", "MIFARE Mini"),
    (0x00, 0x03): ("plain", "MIFARE Ultralight / NTAG"),
    (0x00, 0x36): ("plain", "MIFARE Ultralight C"),
}


def card_kind(atr_bytes):
    """Returns (how to read it, what to call it)."""
    try:
        marker = [0xA0, 0x00, 0x00, 0x03, 0x06]
        data = list(atr_bytes)
        for i in range(len(data) - len(marker) - 3):
            if data[i:i + len(marker)] == marker:
                name = (data[i + len(marker) + 1], data[i + len(marker) + 2])
                return CARD_NAMES.get(name, ("unknown", "непозната карта"))
    except Exception:
        pass
    return ("unknown", "непозната карта")


def card_atr(connection):
    """The card's answer-to-reset, which names its type outright."""
    try:
        return connection.getATR()
    except Exception:
        return []


def read_card_memory(connection, open_connection=None, kind="unknown",
                     remembered=None):
    """
    The user memory of the card, page by page from block 4 — where an NTAG's
    own data starts. Stops at the first page the card refuses, which is how the
    end of memory announces itself.

    Returns the bytes and the status the card answered with, so a card that
    refuses the very first page can be told apart from one that is simply empty.
    """
    # Asked for sixteen bytes at a time, stepping four pages. The chip's own
    # READ returns four pages whatever is asked of it, and readers differ over
    # whether they hand back all of it or trim it to what was requested. Asking
    # for what it sends avoids both the trimming and the overlap that comes from
    # stepping one page while receiving four.
    last_status = None
    # A card that needs a key never answers a plain read, so do not spend a tap
    # asking it.
    if kind == "classic":
        if open_connection is None:
            return b"", None
        classic, how = read_mifare_classic(connection, open_connection, remembered)
        return (classic, how) if classic else (b"", how)

    for size, step in ((0x10, 4), (0x04, 1)):
        raw = bytearray()
        last_status = None
        for block in range(4, 36, step):
            try:
                data, s1, s2 = connection.transmit([0xFF, 0xB0, 0x00, block, size])
                last_status = (s1, s2)
                if s1 == 0x90 and s2 == 0x00 and data:
                    raw.extend(data)
                else:
                    break
            except Exception as e:
                if card_was_lifted(e):
                    return b"", ("gone", [])
                last_status = str(e)
                break
        if raw:
            return bytes(raw), last_status

    # Nothing came back plainly, so this is a card that wants authenticating.
    # Its serial is four bytes rather than seven, and it answers a plain read
    # with 63 00 — which is what a MIFARE Classic does.
    # Nothing came back plainly, so this card wants authenticating first.
    if open_connection is None or kind == "plain":
        return b"", last_status
    classic, how = read_mifare_classic(connection, open_connection, remembered)
    return (classic, how) if classic else (b"", how)


def extract_ndef_url(raw):
    """
    The address out of an NDEF message.

    The one-byte prefix at the head of a URI record stands for the scheme, which
    is why "https://" takes no room on the card.
    """
    if not raw:
        return None

    prefixes = {
        0x00: "", 0x01: "http://www.", 0x02: "https://www.",
        0x03: "http://", 0x04: "https://", 0x05: "tel:", 0x06: "mailto:",
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
    # carries the address as text — but not always the scheme. A URI record
    # keeps "https://" as a single prefix byte, so what sits in memory begins at
    # the host. Looking only for "https://" finds nothing on a perfectly good
    # card, which is why the host is looked for as well.
    try:
        text = raw.decode("ascii", errors="ignore")

        found = re.search(r"https?://\S+", text)
        if found:
            return re.sub(r"[^\x20-\x7E].*$", "", found.group(0)).strip()

        at = text.find(CARD_HOST)
        if at >= 0:
            start, end = at, at
            while start > 0 and 33 <= ord(text[start - 1]) <= 126:
                start -= 1
            while end < len(text) and 33 <= ord(text[end]) <= 126:
                end += 1
            body = text[start:end].strip()
            if body:
                return body if body.startswith("http") else "https://" + body
    except Exception:
        pass

    return None


class ReaderThread(QThread):
    """Watches the reader and reports every card that touches it."""

    reader_status = pyqtSignal(str, str)          # text, colour
    scan_status = pyqtSignal(str, str, str, str)  # icon, text, colour, detail
    history = pyqtSignal(str, bool)               # text, went well
    card_scanned = pyqtSignal(str, str)           # address, chip serial

    def __init__(self):
        super().__init__()
        self.running = True
        self.last_uid = None
        self.last_time = 0.0
        # What opened the last Classic card, tried first on the next one.
        self.known_key = None

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

                # One connection at a time. The reader hands out a single
                # link to the card, so a new one cannot be opened while the
                # last is still held — asking anyway is refused, and the refusal
                # looks exactly like a card that was taken off the antenna.
                held = [connection]

                def open_connection():
                    """
                    Let go of the current link and take a fresh one.

                    Reviving a halted connection does not work: the reader
                    reports the card as removed while it lies on the antenna.
                    Releasing first and asking again finds it.
                    """
                    try:
                        if held[0] is not None:
                            held[0].disconnect()
                    except Exception:
                        pass
                    held[0] = None

                    # The reader needs a moment between letting go and being
                    # asked again, and how long varies — so it is asked a few
                    # times, waiting a little longer each time, rather than once
                    # and giving up.
                    for wait in (0.08, 0.15, 0.3):
                        time.sleep(wait)
                        try:
                            fresh = reader.createConnection()
                            fresh.connect()
                            held[0] = fresh
                            return fresh
                        except Exception:
                            continue
                    return None

                atr = card_atr(connection)
                kind, card_name = card_kind(atr)

                # Two goes before giving up. A card set down and read in the
                # same instant sometimes refuses the first command and answers
                # the second; asking twice costs a fraction of a second and
                # saves the person a tap.
                memory, status = b"", None
                for go in range(2):
                    memory, status = read_card_memory(
                        connection, open_connection, kind, self.known_key
                    )
                    if memory or (isinstance(status, tuple) and status[0] == "gone"):
                        break
                    fresh = open_connection()
                    if fresh is None:
                        break
                    connection = fresh
                    time.sleep(0.1)

                url = extract_ndef_url(memory)

                if not url:
                    # Three things can go wrong and each needs a different
                    # sentence. None of them needs the technical detail on
                    # screen — that goes to the console, for when somebody is
                    # actually debugging.
                    print(f"[nfc] {card_name} uid={uid} status={status} "
                          f"atr={' '.join(f'{b:02X}' for b in atr)}")

                    if isinstance(status, tuple) and status[0] == "gone":
                        message = ("Задръжте картата малко по-дълго върху четеца — "
                                   "беше вдигната, преди да се прочете.")
                        icon, title = "✋", "Задръжте картата"
                    elif memory:
                        message = ("Тази карта е празна — в нея няма записан адрес. "
                                   "Проверете дали е от картите на системата.")
                        icon, title = "❌", "Празна карта"
                    else:
                        message = ("Картата не се разчете. Задръжте я неподвижно и "
                                   "опитайте пак. Ако продължава, вероятно не е от "
                                   "картите на системата.")
                        icon, title = "❌", "Картата не се разчете"

                    self.history.emit(message, False)
                    self.scan_status.emit(icon, title, WARN if icon == "✋" else BAD,
                                          f"{card_name} · чип {uid}")
                    time.sleep(1.5)
                    self.scan_status.emit("📡", "Готов за сканиране", CYAN,
                                          "Поставете карта върху четеца")
                    continue

                url = url.strip().rstrip("\x00").strip()
                if not url.startswith("http"):
                    url = "https://" + url

                # Remember what opened it. Every card a company holds is written
                # the same way, so the next one is read on the first try.
                if isinstance(status, tuple) and status[0] == "MIFARE Classic":
                    self.known_key = status[1]

                self.history.emit(f"Карта прочетена\n{url}\nЧип: {uid}", True)
                self.scan_status.emit("✅", "Прочетена", GOOD, f"Чип: {uid}")
                self.card_scanned.emit(url, uid)

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
        self.setWindowFlags(FRAMELESS | STAYS_ON_TOP)
        self.setAttribute(WA_TRANSLUCENT)
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
        p.setRenderHint(ANTIALIASING)

        p.setBrush(QColor(INK))
        p.setPen(QPen(QColor(LINE), 1))
        p.drawRoundedRect(QRectF(0, 0, self.width(), self.height()), 18, 18)

        p.setPen(QPen(QColor(CYAN), 3))
        p.drawArc(QRectF(self.width() / 2 - 22, 52, 44, 44), self.angle * 16, 110 * 16)

        p.setPen(QColor(TEXT))
        p.setFont(QFont("Segoe UI", 13, WEIGHT_DEMIBOLD))
        p.drawText(QRectF(0, 112, self.width(), 26), ALIGN_CENTER, APP_NAME)

        p.setPen(QColor(MUTED))
        p.setFont(QFont("Segoe UI", 9))
        p.drawText(QRectF(0, 140, self.width(), 22), ALIGN_CENTER, "Зареждане…")
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
        self.thread.card_scanned.connect(self.open_card)
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
        title.setFont(QFont("Segoe UI", 16, WEIGHT_BOLD))
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
        self.scan_icon.setAlignment(ALIGN_CENTER)
        self.scan_icon.setStyleSheet("font-size: 40px; border: none;")
        inner.addWidget(self.scan_icon)

        self.scan_text = QLabel("Изчакайте")
        self.scan_text.setAlignment(ALIGN_CENTER)
        self.scan_text.setFont(QFont("Segoe UI", 12, WEIGHT_DEMIBOLD))
        self.scan_text.setStyleSheet("border: none;")
        inner.addWidget(self.scan_text)

        self.scan_detail = QLabel("")
        self.scan_detail.setAlignment(ALIGN_CENTER)
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

        # The site drops its blurred backgrounds when it is being drawn without a
        # graphics card, and it has to be told. It was guessing from the name Qt
        # gives itself, which is a guess that quietly stops being true when Qt
        # renames something. Saying it outright costs one line and cannot drift.
        profile = page.profile()
        profile.setHttpUserAgent(profile.httpUserAgent() + " TransitFlowReader")
        page.featurePermissionRequested.connect(self.grant_camera)
        page.printRequested.connect(self.print_to_pdf)
        self.browser.setUrl(QUrl(self.settings["home"]))

        splitter = QSplitter(HORIZONTAL)
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
        self.history_box.moveCursor(CURSOR_END)

    def open_card(self, url, uid):
        """
        Open the card, then hand the page its serial.

        The page is a single-page application, so opening another card is often
        only a change of fragment and no page load happens — there is no load
        event to wait for. The serial is therefore offered a few times over the
        next moment, and it names the card it came from, so the page takes it
        only if that is the card it is showing. Neither side has to arrive first.
        """
        found = re.search(r"/client/([0-9A-Fa-f]{12})", url)
        code = found.group(1).upper() if found else ""

        self.browser.setUrl(QUrl(url))
        self.raise_()
        self.activateWindow()
        self.hand_over_serial(uid, code, 0)

    def hand_over_serial(self, uid, code, attempt):
        script = (
            "(function(){"
            "if (typeof window.transitflowChip !== 'function') return false;"
            f"return window.transitflowChip('{uid}', '{code}');"
            "})()"
        )

        def answered(accepted):
            if accepted:
                return
            if attempt >= 16:
                # The page never offered the channel. The card still works; its
                # serial is simply not recorded from this tap.
                self.add_history("Страницата не прие номера на чипа", False)
                return
            # Roughly six seconds in all. By the time a card is tapped the app is
            # normally long since loaded and the first try succeeds; this covers a
            # card presented in the first seconds after the program starts.
            QTimer.singleShot(350, lambda: self.hand_over_serial(uid, code, attempt + 1))

        self.browser.page().runJavaScript(script, answered)

    # ── What the page is allowed to do ──────────────────────────────────────

    def grant_camera(self, origin, feature):
        """
        The camera, because issuing a card takes the passenger's photograph.
        Everything else is refused — the desk has no reason to hand out a
        microphone or a location.
        """
        Page = QWebEnginePage
        allowed = feature in qtcompat.camera_features(Page)
        page = self.sender() if isinstance(self.sender(), Page) else self.browser.page()
        page.setFeaturePermission(origin, feature, qtcompat.permission(Page, allowed))

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
    QCoreApplication.setAttribute(AA_SHARE_OPENGL)
    qtcompat.enable_high_dpi()
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
        box.setIcon(ICON_CRITICAL)
        box.setWindowTitle(APP_NAME)
        box.setText(
            "Липсва библиотеката за четеца (pyscard).\n\n"
            "Инсталирайте я с:\n    pip install pyscard"
        )
        qtcompat.show(box)
        sys.exit(1)

    window = MainWindow(load_settings())
    window.show()
    splash.close()
    sys.exit(qtcompat.run(app))


if __name__ == "__main__":
    main()
