# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| Latest  | Yes       |
| < 1.0.0 | No        |

## Reporting a Vulnerability

If you discover a security vulnerability in EyeOnChess, please report it responsibly.

**Do NOT open a public issue for security vulnerabilities.**

### Preferred Method

Use GitHub's private security advisory feature:

1. Go to the **Security** tab of this repository
2. Click **Advisories** → **New draft security advisory**
3. Fill in the details and submit

### Alternative

If the above is not available, email the repository owner directly. You can find contact information on the owner's GitHub profile.

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Affected versions
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Acknowledgment:** Within 48 hours
- **Initial assessment:** Within 1 week
- **Fix or mitigation:** Depends on severity, typically within 2 weeks for critical issues

### Scope

The following are in scope:

- Authentication and authorization bypass
- SQL injection, XSS, CSRF
- Secrets exposure
- Remote code execution
- Privilege escalation
- Data leakage

The following are out of scope:

- Denial of service (this is a self-hosted app)
- Issues in third-party dependencies (report upstream)
- Social engineering
- Physical attacks
