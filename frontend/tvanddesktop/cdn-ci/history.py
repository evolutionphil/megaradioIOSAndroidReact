#!/usr/bin/env python3
"""Durable cumulative CDN archives. No Cloudflare credentials used here."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import tarfile
import tempfile

ARCHIVE = "tv-cdn-history.tar.gz"
CHECKSUM = ARCHIVE + ".sha256"
MAX_BYTES = 1024 * 1024 * 1024
MAX_FILES = 20000


def sha256(file):
    with Path(file).open("rb") as handle:
        return hashlib.file_digest(handle, "sha256").hexdigest()


def validate_directory(directory):
    if not (directory / "index.html").is_file():
        raise ValueError("Missing index.html in full CDN backup")
    manifest = json.loads((directory / "version.json").read_text())
    if not manifest.get("version") or not isinstance(manifest.get("killSwitch"), bool):
        raise ValueError("Missing/invalid version.json in full CDN backup")
    if not (directory / "assets").is_dir():
        raise ValueError("Missing assets directory")


def pack(directory, output):
    directory, output = Path(directory).resolve(), Path(output).resolve()
    validate_directory(directory)
    if output == directory or directory in output.parents:
        raise ValueError("Archive output must be outside the CDN directory")
    output.mkdir(parents=True, exist_ok=True)
    files = list(directory.rglob("*"))
    if len(files) > MAX_FILES * 2:
        raise ValueError("Too many archive members")
    total = 0
    for file in files:
        if file.is_symlink() or not (file.is_file() or file.is_dir()):
            raise ValueError("Backup must contain only regular files and directories")
        total += file.stat().st_size if file.is_file() else 0
    if total > MAX_BYTES:
        raise ValueError("Backup exceeds the 1GiB safety limit; review history size")
    archive = output / ARCHIVE
    with tarfile.open(archive, "w:gz") as handle:
        for file in sorted(files):
            handle.add(file, arcname=file.relative_to(directory).as_posix(), recursive=False)
    (output / CHECKSUM).write_text(f"{sha256(archive)}  {ARCHIVE}\n")
    return archive


def unpack(archive, checksum, directory):
    expected = Path(checksum).read_text().split()[0]
    if not re.fullmatch(r"[a-f0-9]{64}", expected) or sha256(archive) != expected:
        raise ValueError("CDN history checksum mismatch")
    directory = Path(directory).resolve()
    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        with tarfile.open(archive, "r:gz") as handle:
            members = handle.getmembers()
            if len(members) > MAX_FILES * 2 or sum(member.size for member in members) > MAX_BYTES:
                raise ValueError("Archive exceeds safety limits")
            seen = set()
            for member in members:
                name = PurePosixPath(member.name)
                if name.is_absolute() or ".." in name.parts or "\\" in member.name or not (member.isfile() or member.isdir()):
                    raise ValueError(f"Unsafe CDN archive member: {member.name}")
                if name.as_posix() in seen:
                    raise ValueError("Duplicate CDN archive path")
                seen.add(name.as_posix())
            # All entries validated BEFORE any file is extracted; links are forbidden.
            for member in members:
                target = root / member.name
                if member.isdir():
                    target.mkdir(parents=True, exist_ok=True)
                else:
                    target.parent.mkdir(parents=True, exist_ok=True)
                    with handle.extractfile(member) as source, target.open("wb") as dest:
                        shutil.copyfileobj(source, dest)
        validate_directory(root)
        if directory.exists():
            shutil.rmtree(directory)  # Never mix in a stale checked-in build.
        shutil.copytree(root, directory)


def gh(*args):
    return subprocess.check_output(["gh", *args], text=True).strip()


def repository():
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repo):
        raise ValueError("GITHUB_REPOSITORY must identify the current repository")
    return repo


def choose_checkpoint(pages):
    candidates = [release for page in pages for release in page
                  if not release.get("draft") and release.get("tag_name", "").startswith("tv-cdn-")
                  and {ARCHIVE, CHECKSUM}.issubset({asset["name"] for asset in release.get("assets", [])})]
    if not candidates:
        raise ValueError("No durable CDN history. Follow CDN_GITHUB_ACTIONS.md: import tv-cdn-seed first. Publication stopped.")
    # Release ID tracks creation, unlike created_at which may reflect an old commit.
    return max(candidates, key=lambda release: release["id"])


def restore(directory):
    repo = repository()
    pages = json.loads(gh("api", f"repos/{repo}/releases?per_page=100", "--paginate", "--slurp"))
    release = choose_checkpoint(pages)
    with tempfile.TemporaryDirectory() as temp:
        gh("release", "download", release["tag_name"], "--repo", repo, "--pattern", ARCHIVE,
           "--pattern", CHECKSUM, "--dir", temp)
        unpack(Path(temp) / ARCHIVE, Path(temp) / CHECKSUM, directory)
    print(f"Restored cumulative checkpoint {release['tag_name']}")


def checkpoint(directory):
    repo = repository()
    tag = os.environ.get("CDN_CHECKPOINT_TAG", "")
    commit = os.environ.get("GITHUB_SHA", "")
    if not re.fullmatch(r"tv-cdn-[A-Za-z0-9._-]+", tag) or not re.fullmatch(r"[a-f0-9]{40,64}", commit):
        raise ValueError("Invalid checkpoint identity")
    with tempfile.TemporaryDirectory() as temp:
        archive = pack(directory, temp)
        gh("release", "create", tag, str(archive), str(Path(temp) / CHECKSUM), "--repo", repo,
           "--target", commit, "--draft", "--prerelease", "--latest=false", "--title", tag,
           "--notes", "Cumulative CDN recovery checkpoint, saved BEFORE publication. Not proof of a successful CDN release. Do not delete.")
        gh("release", "edit", tag, "--repo", repo, "--draft=false", "--latest=false")
    print(f"Durable checkpoint {tag} ready; deployment may now start.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["pack", "restore", "checkpoint"])
    parser.add_argument("--directory", default=str(Path(__file__).resolve().parents[1] / "cdn-dist"))
    parser.add_argument("--output", default="cdn-history-export")
    args = parser.parse_args()
    if args.mode == "pack":
        print(pack(args.directory, args.output))
    elif args.mode == "restore":
        restore(args.directory)
    else:
        checkpoint(args.directory)


if __name__ == "__main__":
    main()