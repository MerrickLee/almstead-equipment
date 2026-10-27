#!/bin/bash
# Almstead Repair Orders — commit everything and push to GitHub.
# Double-click in Finder, or run:  bash push.command
cd "$(dirname "$0")" || exit 1
echo "Repo: $(pwd)"
echo

git add -A
if git diff --cached --quiet; then
  echo "Nothing new to commit."
else
  git commit -q \
    -m "Almstead Equipment Repair Orders — initial build" \
    -m "Next.js 16 + Supabase app replacing the paper Equipment Repair Order form: mechanic PWA (PIN sign-in, offline-capable form with photos and signature), manager dashboard (review, PDF export, CSV, trucks, staff), schema migration." \
    -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" \
    -m "Claude-Session: https://claude.ai/code/session_01CoyzxfPdrNhW3QJghZG5VF" \
  && echo "Committed: $(git log --oneline -1)"
fi

branch="$(git symbolic-ref --short HEAD 2>/dev/null || echo main)"
echo
echo "Pushing branch '$branch' to origin..."
git push -u origin "$branch" && echo && echo "✓ Pushed to https://github.com/MerrickLee/almstead-equipment"
