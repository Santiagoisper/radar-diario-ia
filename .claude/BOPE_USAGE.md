# BOPE Usage

BOPE = Batallón de Operaciones Precisas de Ingeniería (Disciplined Engineering Battalion)

## Quick Start

### Single Specialist Review

Use when you need one lens only:

```
@bope-debugger diagnose this CI failure. Do not edit.
@bope-reviewer review the latest diff. Do not edit.
@bope-security audit env handling. Do not print secrets.
@bope-test propose targeted regression tests.
@bope-architect review the data pipeline architecture.
```

### BOPE Lead (Multi-Specialist Coordination)

Use when you need multiple perspectives:

```
@bope-lead use BOPE review mode on this diff. No edits.
@bope-lead use BOPE diagnosis mode. Return synthesis.
@bope-lead use BOPE implementation mode, but require plan approval before edits.
```

---

## Full Mode Descriptions

### BOPE Review
Santiago says: **"usar BOPE review"**

BOPE Lead spawns:
- `bope-reviewer` (correctness, regressions, tests, maintainability)
- `bope-security` (secrets, permissions, injection, data leakage)

Returns:
1. Critical issues
2. Moderate issues
3. False alarms
4. Recommended changes
5. Merge verdict (APPROVE / REQUEST CHANGES / BLOCK)

**Example:**
```
@bope-lead use BOPE review mode on the latest diff. No edits.
```

---

### BOPE Diagnosis
Santiago says: **"usar BOPE diagnosis"**

BOPE Lead asks: What's the symptom? (CI failure? runtime error? data issue?)

Then spawns only the specialists needed:
- **CI/test failure** → bope-debugger
- **Architecture/data issue** → bope-architect
- **Security concern** → bope-security
- **Performance/design** → bope-architect + bope-test

Returns:
1. Root cause (stated as fact)
2. Evidence (quote relevant code/logs)
3. 3 options (pros/cons)
4. Recommended next step
5. Files affected
6. Risk

**Example:**
```
@bope-lead use BOPE diagnosis mode. The build is failing on "Error: DATABASE_URL not found". Diagnose and return synthesis.
```

---

### BOPE Implementation
Santiago says: **"usar BOPE implementation"**

BOPE Lead:
1. Scopes the task tightly.
2. Designs the fix (no edit yet).
3. **Requires Santiago's plan approval before any edits.**
4. Spawns lead (usually yourself, Claude) + 1–2 specialists:
   - Always: bope-reviewer (before merge)
   - For data changes: bope-architect + bope-test
   - For secrets/config: bope-security

Returns:
1. Root cause
2. Proposed patch (code or description)
3. Files affected
4. Tests added/modified
5. Risk
6. Merge-ready? (yes/no)

**Example:**
```
@bope-lead use BOPE implementation mode. Fix the external_id format inconsistency causing deduplication failures. Require plan approval.
```

---

### BOPE Emergency
Santiago says: **"usar BOPE emergency"**

Assumes production/blocking issue. Minimal scope, fast.

BOPE Lead:
1. Diagnoses root cause immediately.
2. Returns minimal fix candidate.
3. **Still enforces**: no secrets, no external commands without approval.

Returns:
1. Root cause
2. Evidence
3. 1 minimal fix
4. Validation command
5. Remaining risk

**Example:**
```
@bope-lead use BOPE emergency mode. The daily radar workflow is failing. Diagnose and return the minimal fix.
```

---

## Agent Team Mode (Parallel Reviews)

⚠️ **Experimental.** Consumes significantly more tokens than single-agent reviews.

Use only for independent parallel work:
- Architecture + security + test reviews on the same diff
- Competing debugging hypotheses (is it A or B?)
- Frontend/backend/test split

To enable:
```
Enable experimental agent teams for this session.
```

Then:
```
Create an agent team with bope-architect, bope-debugger, bope-reviewer, and bope-test. Require plan approval before any edits.
```

**Not recommended for everyday work.** Use single specialists or BOPE Lead instead.

---

## Safety Rules (Always Enforced)

- **Never print secrets**: DATABASE_URL, API keys, tokens, connection strings, env values.
- **Never touch**: Vercel, Neon, GitHub secrets, Cloudflare, production env vars.
- **Never run**: `deploy`, `gh`, `vercel`, `neon`, `curl`, or external network commands without explicit approval.
- **Never commit** unless Santiago says `commit`.

---

## Examples

### Example 1: Quick Code Review
```
@bope-reviewer review this diff. Look for regressions, data continuity, and test coverage. Do not edit.
```

### Example 2: Diagnose a Failing Workflow
```
@bope-lead use BOPE diagnosis mode. The GitHub Actions daily-radar workflow is exiting with "Snapshot unavailable after 3 minutes". Root cause and recommended fix.
```

### Example 3: Review and Fix a Security Issue
```
@bope-lead use BOPE implementation mode.

Issue: External ID format changed from "2401.12345" to "arxiv:2401.12345", breaking deduplication.

Task: Fix the inconsistency, ensure old and new data coexist safely, add tests.

Require plan approval before edits.
```

### Example 4: Audit Env Handling
```
@bope-security audit the API endpoint for secret exposure, unsafe env vars, and permission risks. Do not print secrets.
```

---

## When to Use What

| Situation | Use |
|-----------|-----|
| Code review before merge | `@bope-reviewer` or `@bope-lead BOPE review` |
| Build/test failure | `@bope-debugger` or `@bope-lead BOPE diagnosis` |
| Data inconsistency | `@bope-architect` + `@bope-test` |
| Security audit | `@bope-security` |
| API endpoint review | `@bope-reviewer` + `@bope-security` |
| Fix a bug + verify | `@bope-lead BOPE implementation` |
| Parallel review | Agent team (experimental) |
| Production issue | `@bope-lead BOPE emergency` |

---

## Coordination

All BOPE work is coordinated through **bope-lead**. Bope-lead:

- Prevents scope creep.
- Spawns only specialists needed.
- Synthesizes findings into a decision.
- Enforces all safety rules.

You can invoke individual specialists for quick checks, but bope-lead is best for complex work.
