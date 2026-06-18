#!/bin/bash

set -e

echo "🚀 Running post-create setup..."

# Install dependencies (pnpm also runs the 'prepare' lifecycle hook, which installs husky)
echo "📦 Installing dependencies..."
pnpm install

# Create .env files from examples (if they exist)
if [ -f ".env.example" ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env.development
fi

# Set git config
echo "⚙️  Configuring git..."
git config --global core.autocrlf input
git config --global init.defaultBranch main
# Mark the mounted workspace as safe for the non-root user (root set this in the
# Dockerfile but git config is per-user, so it must be repeated here for 'node').
git config --global --add safe.directory /workspace

# Configure commit identity when the container user has no global Git identity.
# The host ~/.ssh mount normally carries id_ed25519_signing.pub with an email
# comment, which is enough to make VS Code's Git extension stop prompting.
if ! git config --global user.email >/dev/null 2>&1 && [ -f "$HOME/.ssh/id_ed25519_signing.pub" ]; then
  signing_key_comment="$(awk '{print $3}' "$HOME/.ssh/id_ed25519_signing.pub")"
  if [ -n "$signing_key_comment" ]; then
    git config --global user.email "$signing_key_comment"
  fi
fi

if ! git config --global user.name >/dev/null 2>&1; then
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    git config --global user.name "$(gh api user --jq .login)"
  elif git config --global user.email >/dev/null 2>&1; then
    git config --global user.name "$(git config --global user.email | sed 's/@.*//')"
  fi
fi

# Configure SSH commit signing (public key is bind-mounted read-only from host ~/.ssh).
# Use Git's literal key:: form so Git signs through SSH_AUTH_SOCK when VS Code
# forwards the host ssh-agent, instead of trying to decrypt the private key file
# inside the container on every commit.
if [ -f "$HOME/.ssh/id_ed25519_signing.pub" ]; then
  echo "Configuring SSH commit signing..."
  signing_pub_key="$(awk '{print $1 " " $2}' "$HOME/.ssh/id_ed25519_signing.pub")"
  signing_principal="$(git config --global user.email || true)"
  if [ -z "$signing_principal" ]; then
    signing_principal="$(awk '{print $3}' "$HOME/.ssh/id_ed25519_signing.pub")"
  fi

  git config --global gpg.format ssh
  git config --global user.signingkey "key::$signing_pub_key"
  git config --global commit.gpgsign true
  if command -v ssh-keygen >/dev/null 2>&1; then
    git config --global gpg.ssh.program "$(command -v ssh-keygen)"
  fi

  # allowed_signers is writable since ~/.ssh is read-only from the mount.
  mkdir -p "$HOME/.ssh_signers"
  allowed_signers_file="$HOME/.ssh_signers/allowed"
  allowed_signer="$signing_principal $signing_pub_key"
  touch "$allowed_signers_file"
  grep -qxF "$allowed_signer" "$allowed_signers_file" || echo "$allowed_signer" >> "$allowed_signers_file"
  git config --global gpg.ssh.allowedSignersFile "$allowed_signers_file"

  if [ -z "${SSH_AUTH_SOCK:-}" ]; then
    echo "SSH_AUTH_SOCK is not set. Start/open the devcontainer from VS Code with SSH agent forwarding enabled, or run ssh-add for the signing key in this container."
  fi
fi

echo "✅ Post-create setup complete!"
echo ""
echo "📚 Next steps:"
echo "  1. Review .env.development and update with your configuration"
echo "  2. Run 'pnpm dev' to start development servers"
echo "  3. Check SETUP.md for detailed instructions"
