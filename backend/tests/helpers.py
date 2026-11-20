"""Tiny image fixtures. Only the leading bytes matter to the validator (it checks signatures)."""
import struct
import zlib


def make_png() -> bytes:
    """A genuine 1x1 PNG."""

    def chunk(kind: bytes, payload: bytes) -> bytes:
        body = kind + payload
        return struct.pack(">I", len(payload)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    header = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)
    pixel = zlib.compress(b"\x00\xff\x6b\x1a")
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", pixel) + chunk(b"IEND", b"")


def make_jpeg() -> bytes:
    return b"\xff\xd8\xff\xe0" + b"\x00" * 64


def make_webp() -> bytes:
    return b"RIFF" + b"\x24\x00\x00\x00" + b"WEBP" + b"VP8 " + b"\x00" * 32
