---
name: git-push-recovery
description: "Diagnose and recover from Git push failures on GitHub, especially curl 56 connection resets, unexpected disconnects, HTTPS transport failures, and SSH fallback setup. Use when git push uploads objects but the remote drops the connection, when HTTPS pushes fail repeatedly, or when you need to switch a repo to SSH and register a GitHub SSH key."
argument-hint: "What push error are you seeing, and is the remote HTTPS or SSH?"
---

# Git Push Recovery

Use this skill when a push to GitHub fails after object upload, especially with messages like `curl 56 Recv failure: Connection was reset`, `unexpected disconnect while reading sideband packet`, or `the remote end hung up unexpectedly`.

## What This Skill Does

- Determines whether the failure is local repository state, remote configuration, HTTPS transport, or SSH authentication.
- Tries the cheapest checks first: branch status, remote URL, recent commits, and push size.
- Confirms whether the remote actually accepted the push before making changes.
- Falls back from HTTPS to SSH when the HTTPS path is unstable.
- Guides the user through the one manual step GitHub requires: adding the public SSH key to their account.

## Workflow

1. Check the local branch state with `git status --short --branch` and confirm the repo is only ahead of the remote.
2. Inspect the remote with `git remote -v` and `git remote show origin`.
3. Compare local and remote tips with `git rev-parse HEAD` and `git ls-remote origin refs/heads/main`.
4. Measure the push scope with `git diff --stat origin/main..HEAD` and `git count-objects -vH`.
5. If HTTPS is used, retry with trace enabled and check whether the upload finishes before the connection reset.
6. If HTTPS keeps failing, switch the remote to SSH and verify key-based auth with `ssh -i ~/.ssh/<key> -o IdentitiesOnly=yes -T git@github.com`.
7. If SSH succeeds only when the key is explicit, add `Host github.com` to `~/.ssh/config` with the right `IdentityFile` and `IdentitiesOnly yes`.
8. Push again with `git push origin main` and confirm the remote advanced to the local commit.

## Decision Points

- If the remote already points at the wrong repository, fix the URL before retrying.
- If the push reaches `git-receive-pack` and then resets, treat it as a transport problem rather than a repo-content problem.
- If GitHub SSH reports `Permission denied (publickey)`, the key is either not registered or not selected by SSH.
- If SSH works only with `-i`, add a local SSH config entry so Git uses the key automatically.

## Completion Checks

- `git push origin main` returns a clean success message.
- `git ls-remote origin refs/heads/main` matches the local commit.
- The remote URL is the intended GitHub repository.
- The SSH key is registered as an authentication key, not a signing key.

## User Must Do

- Add the public key from `~/.ssh/<key>.pub` to GitHub at Settings -> SSH and GPG keys -> New SSH key.
- Choose `Authentication Key` when GitHub asks for the key type.
- Do not upload the private key file.
- Retry the push after the key is saved.
