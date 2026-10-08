#!/usr/bin/env bash
set -euo pipefail

# Find repository root
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

clean_appledouble() {
  echo "Removing AppleDouble (._*) files in $REPO_ROOT..."
  find "$REPO_ROOT" -name "._*" -type f -delete 2>/dev/null || true
  # Also remove any AppleDouble files inside .git
  find "$REPO_ROOT/.git" -name "._*" -type f -delete 2>/dev/null || true
  echo "AppleDouble files removed."
}

install_git_hook() {
  local hook_path="$REPO_ROOT/.git/hooks/pre-commit"
  echo "Installing auto-clean pre-commit hook into $hook_path..."
  cat <<'EOF' > "$hook_path"
#!/usr/bin/env bash
# Auto-remove AppleDouble files before commit
REPO_ROOT="$(git rev-parse --show-toplevel)"
if [ -n "$REPO_ROOT" ]; then
  find "$REPO_ROOT" -name "._*" -type f -delete 2>/dev/null || true
fi
EOF
  chmod +x "$hook_path"
  echo "Pre-commit hook installed successfully."
}

if [[ "${1:-}" == "--install-hook" ]]; then
  install_git_hook
fi

clean_appledouble
