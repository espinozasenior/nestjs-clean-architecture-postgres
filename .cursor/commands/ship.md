---
model: haiku
---
Ship changes via branch → commit → push → PR → merge → cleanup.

Usage: /ship <commit message>
Example: /ship feat: add vault rebalancing logic

## Instructions

You are executing the `/ship` command. The commit message is: $ARGUMENTS

Follow these steps exactly. If any step fails, stop and report the error — do not continue.

### Step 1: Validate & Analyze Changes

1. Run `git status` to confirm there are uncommitted changes (staged or unstaged). If there are no changes at all, stop and tell the user "Nothing to ship — no changes detected."
2. Run `gh auth status` to confirm GitHub CLI is authenticated. If not authenticated, stop and tell the user to run `gh auth login`.
3. Analyze staged, unstaged, and untracked changes:
   - Run `git diff --cached --name-only | wc -l` to count staged files
   - Run `git diff --name-only | wc -l` to count unstaged changes
   - Run `git ls-files --others --exclude-standard | wc -l` to count untracked files
4. Apply auto-staging logic:
   - **If ONLY staged changes exist**: proceed with staged files only
   - **If unstaged or untracked changes exist** (with or without staged): run `git add -A` to stage all changes, then proceed
   - This ensures all current work is shipped together without user intervention

### Step 2: Branch

1. Generate a branch name from the commit message by:
   - Taking the commit message: `$ARGUMENTS`
   - Lowercasing it
   - Replacing spaces and special characters with hyphens
   - Removing consecutive hyphens
   - Trimming to max 50 characters
   - Example: `feat: add vault rebalancing logic` → `feat-add-vault-rebalancing-logic`
2. Run `git checkout -b <branch-name>`

### Step 3: Commit

1. Run `git commit -m "<commit message>"` using the original `$ARGUMENTS` as the commit message exactly as provided. Do NOT append any co-author trailers.
   - Note: staging was already handled in Step 1 based on what changes exist

### Step 4: Push

1. Run `git push -u origin <branch-name>`

### Step 5: Create PR

1. Get the authenticated user's GitHub login:
   - Run `GITHUB_USER=$(gh api user --jq '.login')`
2. Generate a meaningful PR description by analyzing the actual diff:
   - Run `git diff HEAD~1` to get the full diff of changes
   - Read and understand the diff carefully. Then write a PR body with this structure:
     ```
     ## Summary
     <1-3 concise bullet points explaining WHAT changed and WHY, written from the perspective of a developer reviewing the PR. Focus on the logical intent, not file names.>

     ## Changes
     <bullet list of the specific technical changes made, e.g. "Replaced hardcoded address with dynamic lookup", "Added error handling for X">

     ```
   - Guidelines for the description:
     - **Be specific**: "Fix validator address to use the one returned by registration" not "Updated file"
     - **Explain why**: Connect changes to the problem they solve
     - **Stay concise**: 2-5 bullet points total across both sections
     - **No fluff**: Skip obvious things like "modified X file" — reviewers can see that in the diff
3. Create the PR with explicit username:
   - Run: `gh pr create --base main --title "<commit message>" --body "$PR_BODY" --assignee "$GITHUB_USER"`
   - Capture the PR URL from the output
   - If the assignee flag fails due to permissions, continue (fallback in next substep)
4. Fallback assignment fix (best-effort):
   - Extract the PR number from PR_URL
   - Run `gh pr edit <pr-number> --add-assignee "$GITHUB_USER"` to ensure assignment succeeds
5. Capture and return the PR URL.

### Step 6: Merge

1. Run `gh pr merge --squash --delete-branch`
2. If the merge fails (e.g., branch protection, required reviews, CI checks), do NOT force-merge. Instead, report: "PR created but could not be auto-merged. Review it here: <PR URL>"

### Step 7: Cleanup

1. Run `git checkout main`
2. Run `git pull`
3. Run `git branch -d <branch-name>` (ignore errors if already deleted by --delete-branch)
4. Run `git status` to confirm a clean state.
5. Report success: "Shipped! <PR URL>"
