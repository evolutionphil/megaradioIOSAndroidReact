"""CDN history safety and checkpoint behavior tests (stdlib unittest only)."""

import io
import importlib.util
import json
import os
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch


HISTORY_PATH = Path(__file__).resolve().parents[1] / "history.py"
spec = importlib.util.spec_from_file_location("cdn_history", HISTORY_PATH)
history = importlib.util.module_from_spec(spec)
spec.loader.exec_module(history)


def write_full_backup(root: Path, version: str = "seed-1") -> None:
    (root / "assets").mkdir(parents=True, exist_ok=True)
    (root / "assets" / "app.hash.js").write_text("console.log('ok');", encoding="utf-8")
    (root / "index.html").write_text(
        "<html><body><script src=\"assets/app.hash.js\"></script></body></html>",
        encoding="utf-8",
    )
    (root / "version.json").write_text(
        json.dumps({"version": version, "killSwitch": False}) + "\n", encoding="utf-8"
    )


def make_archive_with_checksum(source: Path, out_dir: Path):
    archive = out_dir / history.ARCHIVE
    with tarfile.open(archive, "w:gz") as tf:
        tf.add(source, arcname=".")
    checksum = out_dir / history.CHECKSUM
    checksum.write_text(f"{history.sha256(archive)}  {history.ARCHIVE}\n", encoding="utf-8")
    return archive, checksum


class HistoryPackUnpackTests(unittest.TestCase):
    """Pack/unpack integrity and archive safety checks."""

    def test_pack_unpack_roundtrip_and_checksum(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            source = root / "full-cdn"
            source.mkdir()
            write_full_backup(source, version="v-roundtrip")

            out = root / "export"
            archive = history.pack(source, out)
            checksum = out / history.CHECKSUM
            self.assertTrue(archive.exists())
            self.assertTrue(checksum.exists())

            restored = root / "restored"
            history.unpack(archive, checksum, restored)
            self.assertEqual((restored / "index.html").read_text(encoding="utf-8"), (source / "index.html").read_text(encoding="utf-8"))
            self.assertEqual(json.loads((restored / "version.json").read_text(encoding="utf-8"))["version"], "v-roundtrip")

    def test_unpack_rejects_checksum_tampering(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            source = root / "full-cdn"
            source.mkdir()
            write_full_backup(source)
            archive, checksum = make_archive_with_checksum(source, root)
            checksum.write_text("0" * 64 + f"  {history.ARCHIVE}\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "checksum mismatch"):
                history.unpack(archive, checksum, root / "dest")

    def test_unpack_rejects_path_traversal_before_destination_mutation(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            archive = root / history.ARCHIVE
            with tarfile.open(archive, "w:gz") as tf:
                bad = tarfile.TarInfo(name="../escape.txt")
                payload = b"x"
                bad.size = len(payload)
                tf.addfile(bad, io.BytesIO(payload))

            checksum = root / history.CHECKSUM
            checksum.write_text(f"{history.sha256(archive)}  {history.ARCHIVE}\n", encoding="utf-8")

            dest = root / "cdn-dist"
            dest.mkdir()
            marker = dest / "marker.txt"
            marker.write_text("keep", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "Unsafe CDN archive member"):
                history.unpack(archive, checksum, dest)
            self.assertTrue(marker.exists())
            self.assertEqual(marker.read_text(encoding="utf-8"), "keep")

    def test_unpack_rejects_absolute_path_member(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            archive = root / history.ARCHIVE
            with tarfile.open(archive, "w:gz") as tf:
                bad = tarfile.TarInfo(name="/abs.txt")
                payload = b"x"
                bad.size = len(payload)
                tf.addfile(bad, io.BytesIO(payload))
            checksum = root / history.CHECKSUM
            checksum.write_text(f"{history.sha256(archive)}  {history.ARCHIVE}\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "Unsafe CDN archive member"):
                history.unpack(archive, checksum, root / "dest")

    def test_unpack_rejects_symlink_and_hardlink_members(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            for name, member_type in (("symlink", tarfile.SYMTYPE), ("hardlink", tarfile.LNKTYPE)):
                archive = root / f"{name}-{history.ARCHIVE}"
                with tarfile.open(archive, "w:gz") as tf:
                    link = tarfile.TarInfo(name=f"{name}.txt")
                    link.type = member_type
                    link.linkname = "target.txt"
                    tf.addfile(link)
                checksum = root / f"{name}-{history.CHECKSUM}"
                checksum.write_text(f"{history.sha256(archive)}  {history.ARCHIVE}\n", encoding="utf-8")
                with self.assertRaisesRegex(ValueError, "Unsafe CDN archive member"):
                    history.unpack(archive, checksum, root / f"dest-{name}")

    def test_unpack_rejects_duplicate_member(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            archive = root / history.ARCHIVE
            with tarfile.open(archive, "w:gz") as tf:
                for payload in (b"one", b"two"):
                    member = tarfile.TarInfo(name="assets/app.hash.js")
                    member.size = len(payload)
                    tf.addfile(member, io.BytesIO(payload))
            checksum = root / history.CHECKSUM
            checksum.write_text(f"{history.sha256(archive)}  {history.ARCHIVE}\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "Duplicate CDN archive path"):
                history.unpack(archive, checksum, root / "dest")

    def test_unpack_rejects_oversize_before_destination_mutation(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            source = root / "full-cdn"
            source.mkdir()
            write_full_backup(source)
            archive, checksum = make_archive_with_checksum(source, root)

            dest = root / "cdn-dist"
            dest.mkdir()
            marker = dest / "marker.txt"
            marker.write_text("keep", encoding="utf-8")

            with patch.object(history, "MAX_BYTES", 1):
                with self.assertRaisesRegex(ValueError, "safety limits"):
                    history.unpack(archive, checksum, dest)

            self.assertEqual(marker.read_text(encoding="utf-8"), "keep")


class HistoryReleaseSelectionAndGhTests(unittest.TestCase):
    """Checkpoint selection and GitHub CLI orchestration tests."""

    def test_choose_checkpoint_filters_and_uses_max_release_id(self):
        pages = [[
            {
                "id": 90,
                "tag_name": "desktop-v1",
                "draft": False,
                "assets": [{"name": history.ARCHIVE}, {"name": history.CHECKSUM}],
            },
            {
                "id": 101,
                "tag_name": "tv-cdn-old",
                "draft": False,
                "assets": [{"name": history.ARCHIVE}],
            },
            {
                "id": 103,
                "tag_name": "tv-cdn-draft",
                "draft": True,
                "assets": [{"name": history.ARCHIVE}, {"name": history.CHECKSUM}],
            },
            {
                "id": 105,
                "tag_name": "tv-cdn-valid-a",
                "draft": False,
                "assets": [{"name": history.ARCHIVE}, {"name": history.CHECKSUM}],
                "created_at": "2099-01-01T00:00:00Z",
            },
            {
                "id": 204,
                "tag_name": "tv-cdn-valid-b",
                "draft": False,
                "assets": [{"name": history.CHECKSUM}, {"name": history.ARCHIVE}],
                "created_at": "2001-01-01T00:00:00Z",
            },
        ]]
        picked = history.choose_checkpoint(pages)
        self.assertEqual(picked["tag_name"], "tv-cdn-valid-b")

    def test_choose_checkpoint_fail_closed_on_empty(self):
        with self.assertRaisesRegex(ValueError, "import tv-cdn-seed"):
            history.choose_checkpoint([[]])

    def test_restore_uses_latest_candidate_and_does_not_fallback_on_corruption(self):
        pages = [[
            {
                "id": 1,
                "tag_name": "tv-cdn-seed",
                "draft": False,
                "assets": [{"name": history.ARCHIVE}, {"name": history.CHECKSUM}],
            },
            {
                "id": 2,
                "tag_name": "tv-cdn-new",
                "draft": False,
                "assets": [{"name": history.ARCHIVE}, {"name": history.CHECKSUM}],
            },
        ]]
        calls = []

        def fake_gh(*args):
            calls.append(args)
            if args[:2] == ("api", "repos/acme/repo/releases?per_page=100"):
                return json.dumps(pages)
            if args[:2] == ("release", "download"):
                temp = Path(args[args.index("--dir") + 1])
                bad_archive = temp / history.ARCHIVE
                bad_archive.write_bytes(b"not-a-tar")
                (temp / history.CHECKSUM).write_text("0" * 64 + f"  {history.ARCHIVE}\n", encoding="utf-8")
                return ""
            raise AssertionError(f"Unexpected gh args: {args}")

        with tempfile.TemporaryDirectory() as td, patch.object(history, "gh", side_effect=fake_gh), patch.dict(
            os.environ, {"GITHUB_REPOSITORY": "acme/repo"}, clear=False
        ):
            with self.assertRaisesRegex(ValueError, "checksum mismatch"):
                history.restore(Path(td) / "cdn-dist")

        download_calls = [c for c in calls if c[:2] == ("release", "download")]
        self.assertEqual(len(download_calls), 1)
        self.assertIn("tv-cdn-new", download_calls[0])

    def test_checkpoint_calls_create_then_publish_with_archive_and_checksum(self):
        calls = []

        def fake_gh(*args):
            calls.append(args)
            return ""

        with tempfile.TemporaryDirectory() as td, patch.object(history, "gh", side_effect=fake_gh), patch.dict(
            os.environ,
            {
                "GITHUB_REPOSITORY": "acme/repo",
                "CDN_CHECKPOINT_TAG": "tv-cdn-123",
                "GITHUB_SHA": "a" * 40,
            },
            clear=False,
        ):
            source = Path(td) / "cdn-dist"
            source.mkdir()
            write_full_backup(source)
            history.checkpoint(source)

        self.assertEqual(calls[0][0:3], ("release", "create", "tv-cdn-123"))
        self.assertTrue(any(str(item).endswith(history.ARCHIVE) for item in calls[0]))
        self.assertTrue(any(str(item).endswith(history.CHECKSUM) for item in calls[0]))
        self.assertIn("--draft", calls[0])
        self.assertEqual(calls[1][0:3], ("release", "edit", "tv-cdn-123"))
        self.assertIn("--draft=false", calls[1])

    def test_checkpoint_stops_if_release_create_fails(self):
        calls = []

        def fake_gh(*args):
            calls.append(args)
            if args[:2] == ("release", "create"):
                raise RuntimeError("gh create failed")
            return ""

        with tempfile.TemporaryDirectory() as td, patch.object(history, "gh", side_effect=fake_gh), patch.dict(
            os.environ,
            {
                "GITHUB_REPOSITORY": "acme/repo",
                "CDN_CHECKPOINT_TAG": "tv-cdn-123",
                "GITHUB_SHA": "a" * 40,
            },
            clear=False,
        ):
            source = Path(td) / "cdn-dist"
            source.mkdir()
            write_full_backup(source)
            with self.assertRaisesRegex(RuntimeError, "gh create failed"):
                history.checkpoint(source)

        self.assertEqual([c[1] for c in calls], ["create"])

    def test_bootstrap_requires_successful_original_store_verification(self):
        with tempfile.TemporaryDirectory() as td, patch.object(history, "gh", return_value="[[]]"), patch.dict(
            os.environ, {"GITHUB_REPOSITORY": "acme/repo"}
        ), patch.object(history.subprocess, "run", side_effect=RuntimeError("original unavailable")):
            directory = Path(td) / "cdn-dist"
            directory.mkdir()
            marker = directory / "keep.txt"
            marker.write_text("keep")
            with self.assertRaisesRegex(RuntimeError, "original unavailable"):
                history.restore(directory, allow_legacy_bootstrap=True)
            self.assertTrue(marker.exists())

    def test_bootstrap_refuses_incomplete_existing_checkpoint(self):
        pages = [[{"tag_name": "tv-cdn-broken", "draft": False, "assets": []}]]
        with tempfile.TemporaryDirectory() as td, patch.object(history, "gh", return_value=json.dumps(pages)), patch.dict(
            os.environ, {"GITHUB_REPOSITORY": "acme/repo"}
        ), patch.object(history.subprocess, "run") as bootstrap:
            with self.assertRaises(ValueError):
                history.restore(Path(td) / "cdn-dist", allow_legacy_bootstrap=True)
            bootstrap.assert_not_called()

    def test_gh_wrapper_uses_exact_cli_shape(self):
        with patch.object(history.subprocess, "check_output", return_value="ok\n") as mocked:
            result = history.gh("api", "repos/acme/repo/releases")
        self.assertEqual(result, "ok")
        mocked.assert_called_once_with(["gh", "api", "repos/acme/repo/releases"], text=True)


if __name__ == "__main__":
    unittest.main()
