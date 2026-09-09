# -*- coding: utf-8 -*-
"""
Reads the import table of every binary in a build and reports anything that
only exists on Windows 8 or 10.

The customer's failure was one line — `api-ms-win-core-path-l1-1-0.dll is
missing` — and it names exactly the kind of thing this looks for: an API set
introduced after Windows 7, which is absent there and makes the loader refuse
the whole program before a single line runs. Testing on Windows 10 cannot see
this, because on Windows 10 the file is present.

Not a substitute for running it on Windows 7. It is the part that can be
checked without one.
"""
import os
import struct
import sys

# API sets that do not exist on Windows 7. The first is the one that killed the
# Qt 6 build; the rest arrived with it or later and would fail the same way.
WIN8_PLUS = {
    "api-ms-win-core-path-l1-1-0.dll",
    "api-ms-win-core-winrt-l1-1-0.dll",
    "api-ms-win-core-winrt-string-l1-1-0.dll",
    "api-ms-win-shcore-scaling-l1-1-1.dll",
    "api-ms-win-core-featurestaging-l1-1-0.dll",
    "api-ms-win-core-libraryloader-l1-2-0.dll",
    "api-ms-win-core-synch-l1-2-0.dll",
    "api-ms-win-core-realtime-l1-1-0.dll",
    "api-ms-win-core-quirks-l1-1-0.dll",
    "api-ms-win-core-wow64-l1-1-1.dll",
}


def imports_of(path):
    """The DLL names a PE file imports. Returns None if it is not a PE."""
    with open(path, "rb") as f:
        data = f.read()
    if len(data) < 0x40 or data[:2] != b"MZ":
        return None
    pe = struct.unpack_from("<I", data, 0x3C)[0]
    if pe + 24 > len(data) or data[pe:pe + 4] != b"PE\0\0":
        return None

    sections = struct.unpack_from("<H", data, pe + 6)[0]
    opt_size = struct.unpack_from("<H", data, pe + 20)[0]
    opt = pe + 24
    magic = struct.unpack_from("<H", data, opt)[0]
    # The import directory sits at a different offset in 32- and 64-bit headers.
    dir_offset = opt + (112 if magic == 0x20B else 96)
    if dir_offset + 8 > len(data):
        return None
    import_rva, import_size = struct.unpack_from("<II", data, dir_offset)
    if not import_rva:
        return set()

    # Section table, to turn addresses into file offsets.
    table = []
    base = opt + opt_size
    for i in range(sections):
        entry = base + i * 40
        if entry + 40 > len(data):
            return None
        virtual_size, virtual_address, raw_size, raw_ptr = struct.unpack_from(
            "<IIII", data, entry + 8)
        table.append((virtual_address, max(virtual_size, raw_size), raw_ptr))

    def at(rva):
        for virtual_address, size, raw_ptr in table:
            if virtual_address <= rva < virtual_address + size:
                return raw_ptr + (rva - virtual_address)
        return None

    found = set()
    descriptor = at(import_rva)
    if descriptor is None:
        return set()
    while descriptor + 20 <= len(data):
        fields = struct.unpack_from("<IIIII", data, descriptor)
        if not any(fields):
            break
        name_offset = at(fields[3])
        if name_offset is not None:
            end = data.find(b"\0", name_offset)
            if end > name_offset:
                found.add(data[name_offset:end].decode("ascii", "replace").lower())
        descriptor += 20
    return found


def main(root):
    # What the build carries with it. An API set that is missing from Windows 7
    # but shipped in the folder resolves from the folder, so it is not a
    # problem — several of the Python runtime's own forwarders are like this,
    # and one of them names itself in its own import table.
    shipped = set()
    for folder, _dirs, files in os.walk(root):
        for name in files:
            shipped.add(name.lower())

    checked = 0
    trouble = []
    for folder, _dirs, files in os.walk(root):
        for name in files:
            if not name.lower().endswith((".exe", ".dll", ".pyd")):
                continue
            path = os.path.join(folder, name)
            try:
                names = imports_of(path)
            except Exception as e:
                print("  ?  %s (%s)" % (os.path.relpath(path, root), e))
                continue
            if names is None:
                continue
            checked += 1
            bad = (names & WIN8_PLUS) - shipped
            if bad:
                trouble.append((os.path.relpath(path, root), sorted(bad)))

    print("Проверени двоични файлове:", checked)
    if not trouble:
        print("Нито един не иска библиотека, която липсва на Windows 7.")
        return 0
    print("Тези няма да тръгнат на Windows 7:")
    for path, bad in trouble:
        print("   %-60s %s" % (path, ", ".join(bad)))
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
