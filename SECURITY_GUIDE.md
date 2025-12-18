# 🔐 Security Guide - Protecting Secrets

## ⚠️ CRITICAL: Secrets Were Exposed in Git History

GitGuardian has detected that secrets were committed to this repository. Even though they've been removed from the current codebase, **they remain in git history** and are publicly accessible.

## 🚨 Immediate Actions Required

### 1. Rotate All Exposed Secrets

**You MUST rotate these secrets immediately:**

#### Supabase
- [ ] **SUPABASE_SERVICE_ROLE_KEY** - Generate new service role key in Supabase Dashboard
- [ ] **DATABASE_URL** - Update database password in Supabase Dashboard
- [ ] **SUPABASE_ANON_KEY** - Generate new anon key if needed

#### Stripe
- [ ] **STRIPE_SECRET_KEY** - Regenerate in Stripe Dashboard → Developers → API Keys
- [ ] **STRIPE_WEBHOOK_SECRET** - Create new webhook endpoint and get new secret
- [ ] **STRIPE_PUBLISHABLE_KEY** - Regenerate if needed

#### Other Services
- [ ] **RESEND_API_KEY** - Regenerate in Resend Dashboard
- [ ] **JWT_SECRET** - Generate a new random secret
- [ ] **GOOGLE_MAPS_API_KEY** - Regenerate in Google Cloud Console
- [ ] **MAPBOX_TOKEN** - Regenerate in Mapbox Dashboard

### 2. Update Environment Variables

After rotating secrets, update them in:
- Railway (backend environment variables)
- Vercel (frontend environment variables)
- Local `.env` files (never commit these!)

### 3. Remove Secrets from Git History

**Option A: Using BFG Repo-Cleaner (Recommended)**

```bash
# Install BFG
brew install bfg  # macOS
# or download from https://rtyley.github.io/bfg-repo-cleaner/

# Clone a fresh copy
cd /tmp
git clone --mirror https://github.com/make-tuned-unit/plek.git

# Remove secrets (replace with actual patterns)
bfg --replace-text secrets.txt plek.git

# Push cleaned history (WARNING: This rewrites history!)
cd plek.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

Create `secrets.txt` with patterns like:
```
SUPABASE_SERVICE_ROLE_KEY==>REMOVED
STRIPE_SECRET_KEY==>REMOVED
whsec_==>REMOVED
postgresql://==>REMOVED
```

**Option B: Using git-filter-repo (Alternative)**

```bash
# Install git-filter-repo
pip install git-filter-repo

# Remove secrets from history
git filter-repo --replace-text secrets.txt --force
```

**Option C: Nuclear Option - Start Fresh (If repository is small)**

If the repository is new and doesn't have important history:
```bash
# Create a new orphan branch
git checkout --orphan clean-main
git add .
git commit -m "Initial commit - secrets removed"
git branch -D master
git branch -m master
git push -f origin master
```

### 4. Enable GitGuardian Pre-commit Hook

Install GitGuardian CLI to prevent future commits:

```bash
# Install GitGuardian CLI
pip install ggshield

# Set up pre-commit hook
ggshield install

# Scan before committing
ggshield scan pre-commit
```

### 5. Add Pre-commit Hooks

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Prevent committing secrets

# Check for common secret patterns
if git diff --cached | grep -E "(sk_live_|sk_test_|whsec_|eyJ|postgresql://[^/]+:[^@]+@)" ; then
    echo "❌ ERROR: Potential secrets detected in commit!"
    echo "Please remove secrets before committing."
    exit 1
fi

# Run GitGuardian scan if available
if command -v ggshield &> /dev/null; then
    ggshield scan pre-commit
fi
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

## 🛡️ Best Practices Going Forward

### 1. Never Commit Secrets

- ✅ **DO**: Use `.env.example` with placeholder values
- ✅ **DO**: Store real secrets in environment variables (Railway, Vercel)
- ❌ **DON'T**: Commit `.env` files
- ❌ **DON'T**: Hardcode secrets in source code
- ❌ **DON'T**: Commit backup files (`.env.bak`, `.env.backup`)

### 2. Use Environment Variables

All secrets should be loaded from environment variables:

```typescript
// ✅ GOOD
const stripeKey = process.env.STRIPE_SECRET_KEY;

// ❌ BAD
const stripeKey = "sk_live_abc123...";
```

### 3. Validate Environment Variables

Add validation on app startup:

```typescript
// backend/src/index.ts
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'DATABASE_URL'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});
```

### 4. Use Secret Management Tools

For production, consider:
- **HashiCorp Vault**
- **AWS Secrets Manager**
- **Azure Key Vault**
- **Google Secret Manager**

### 5. Regular Security Audits

- Run `ggshield scan` regularly
- Review GitGuardian alerts immediately
- Rotate secrets periodically (every 90 days)
- Use different secrets for staging and production

## 📋 Checklist

- [ ] Rotate all exposed secrets
- [ ] Update environment variables in Railway/Vercel
- [ ] Remove secrets from git history (BFG or git-filter-repo)
- [ ] Install GitGuardian CLI
- [ ] Set up pre-commit hooks
- [ ] Review and update `.gitignore`
- [ ] Add environment variable validation
- [ ] Document secret rotation process
- [ ] Set up secret rotation reminders (calendar)

## 🔗 Resources

- [GitGuardian Documentation](https://docs.gitguardian.com/)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [GitHub: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)

## ⚠️ Important Notes

1. **Rewriting git history is destructive** - Make sure all team members are aware
2. **After rewriting history**, everyone needs to re-clone the repository
3. **Backup your repository** before rewriting history
4. **Secrets in git history are permanent** until history is rewritten
5. **Consider the repository compromised** until secrets are rotated

---

**Last Updated**: December 9, 2025
**Status**: ⚠️ Secrets exposed - Action required



