# Security Best Practices Report

**Project:** Splitty (GustavoBranch)  
**Date:** 2026-03-30  
**Reviewer:** Verdent AI Security Review

---

## Executive Summary

The Splitty application implements several good security practices (bcrypt password hashing, JWT authentication, UUID tokens for invitations, Decimal for financial amounts), but has **multiple security concerns** ranging from critical to medium severity that should be addressed.

---

## Critical Findings

### 1. CORS Wildcard Configuration
- **Location:** `src/api/routes.py:28`
- **Issue:** `CORS(api, resources={r"/api/*": {"origins": "*"}})` allows any domain to make API requests
- **Impact:** Enables Cross-Site Request Forgery (CSRF) attacks and unauthorized API access
- **Recommendation:** Restrict to specific frontend domain(s) via environment variable (e.g., `FRONTEND_URL`)

---

### 2. No Rate Limiting on Authentication Endpoints
- **Location:** `src/api/routes.py:40-95` (register, login)
- **Issue:** No rate limiting on `/register` and `/login` endpoints
- **Impact:** Enables brute force password attacks and credential stuffing
- **Recommendation:** Implement Flask-Limiter with ~5 attempts/minute per IP

---

### 3. SQL Injection Pattern in User Search
- **Location:** `src/api/routes.py:1121-1128`
- **Issue:** Direct string interpolation in SQL LIKE query: `User.email.ilike(f"%{query}%")`
- **Impact:** While SQLAlchemy escapes values, the pattern is risky
- **Recommendation:** Validate query length (max ~100 chars) and restrict character set

---

## High Findings

### 4. Internal Error Details Exposed
- **Location:** Multiple routes (e.g., `routes.py:72`, `432`, `604`)
- **Issue:** `"details": str(e)` exposes exception stack traces to clients
- **Impact:** Information disclosure revealing server internals, database structure
- **Recommendation:** Return generic error messages; log details server-side only

---

### 5. Invitation Tokens Never Expire
- **Location:** `src/api/models.py:250-251` (Invitation), `335-336` (FriendInvitation)
- **Issue:** UUID tokens have no `expires_at` field
- **Impact:** Stolen invitation links remain valid indefinitely
- **Recommendation:** Add `expires_at` datetime field and check expiration on acceptance

---

### 6. Users Auto-Added to Groups Without Consent
- **Location:** `src/api/routes.py:385-395`
- **Issue:** When creating an expense, non-members are automatically added to the group
- **Impact:** Users can be added to groups involuntarily
- **Recommendation:** Require explicit membership confirmation before adding to expenses

---

### 7. No Password Strength Validation
- **Location:** `src/api/routes.py:40-54`
- **Issue:** No password complexity requirements during registration
- **Impact:** Weak passwords can be easily cracked
- **Recommendation:** Require minimum 8 chars with mixed case, numbers, special chars

---

## Medium Findings

### 8. JWT Token Expiration Not Visible
- **Location:** `src/api/routes.py:89`
- **Issue:** `create_access_token(identity=str(user.id))` - unclear if tokens expire
- **Impact:** Tokens may be valid forever if not configured externally
- **Recommendation:** Explicitly set `expires_delta` (e.g., `timedelta(hours=24)`)

---

### 9. Email Enumeration via User Search
- **Location:** `src/api/routes.py:1111-1132`
- **Issue:** `/users/search` reveals whether an email exists in the system
- **Impact:** Attackers can enumerate valid emails for targeted attacks
- **Recommendation:** Return same generic response for found and not-found users

---

### 10. No File Type Validation on Receipt Upload
- **Location:** `src/api/routes.py:645-666`
- **Issue:** File type only checked via `accept` attribute client-side
- **Impact:** Malicious files could be uploaded
- **Recommendation:** Validate file magic bytes server-side, restrict to image/pdf MIME types

---

### 11. Friend Invite Accept Allows Self-Add (Logic Gap)
- **Location:** `src/api/routes.py:1068-1069`
- **Issue:** Checks for self-invitation but logic could theoretically be bypassed
- **Impact:** User could theoretically add themselves as friend
- **Recommendation:** Verify invitation genuinely from another user before processing

---

## Positives (Security Controls Already in Place)

| Control | Location |
|---------|----------|
| Passwords hashed with bcrypt | `routes.py:54` |
| JWT with `@jwt_required()` decorator | Throughout routes |
| BlockedToken for logout revocation | `routes.py:97-104` |
| UUID tokens for invitations | `models.py:250-251, 335-336` |
| Decimal type for financial amounts | `models.py:165, 226` |
| Group membership checks before data access | Throughout routes |
| Input validation on required fields | Throughout routes |

---

## Recommended Priority Order

1. **Immediate:** Fix CORS wildcard (Critical)
2. **Immediate:** Add rate limiting to auth endpoints (Critical)
3. **High:** Add password strength validation (High)
4. **High:** Add invitation expiration (High)
5. **High:** Remove internal error details exposure (High)
6. **Medium:** Add JWT expiration explicit (Medium)
7. **Medium:** Add server-side file validation (Medium)
8. **Medium:** Add email enumeration protection (Medium)
9. **Low:** Fix auto-add to groups issue (Low - requires design decision)

---

*Report generated by Verdent AI Security Review*
