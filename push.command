#!/bin/bash
# Almstead Repair Orders — commit everything and push to GitHub (Vercel auto-deploys main).
# Double-click in Finder, or:  bash push.command "your commit message"
cd "$(dirname "$0")" || exit 1
echo "Repo: $(pwd)"
echo

msg="${1:-Update $(date '+%Y-%m-%d %H:%M')}"

git add -A
if git diff --cached --quiet; then
  echo "Nothing new to commit."
else
  git commit -q -m "$msg" \
    -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" \
    -m "Claude-Session: https://claude.ai/code/session_01CoyzxfPdrNhW3QJghZG5VF" \
  && echo "Committed: $(git log --oneline -1)"
fi

branch="$(git symbolic-ref --short HEAD 2>/dev/null || echo main)"
echo
echo "Pushing branch '$branch' to origin..."
git push -u origin "$branch" && echo && echo "✓ Pushed — Vercel will deploy in ~2 minutes: https://almstead-repair-orders.vercel.app"
