/**
 * security-policy.ts — contenido de SECURITY.md como módulo estático.
 *
 * Este módulo existe por compatibilidad con Cloudflare Workers: el runtime
 * de Workers no soporta `fs.readFileSync` aunque `nodejs_compat` esté activo.
 * La página /security originalmente leía SECURITY.md en runtime con fs; ahora
 * lo importa como string en tiempo de build, sin dependencias de filesystem.
 *
 * Si actualizas SECURITY.md, actualiza también este archivo.
 */
export const securityPolicyContent = `# Security Policy & Audit Report

**Audit Date:** November 2025
**Status:** ✅ Audited & Hardened

## 🛡️ Security Posture

At Filmify, we take security seriously. This document outlines our security practices and the results of our recent Red Team engagement.

### Recent Audit Findings (Nov 2025)

We recently conducted a full-scope Red Team engagement simulating an advanced adversary. The following critical areas were identified and **fully remediated**:

1.  **Privilege Escalation Protection**: Implemented strict Role-Based Access Control (RBAC) and database triggers to prevent unauthorized role changes.
2.  **IP & Session Security**: Enhanced middleware with robust IP detection and banning capabilities to prevent abuse.
3.  **API Hardening**: Implemented server-side rate limiting to protect against Denial of Service (DoS) and spam attacks.
4.  **Data Integrity**: Secured sensitive user profile data against Mass Assignment and IDOR attacks.

### Reporting Vulnerabilities

If you discover a security vulnerability within Filmify, please report it to us immediately. We appreciate the efforts of the security community in helping us keep our platform safe.

**Contact:** security@filmify.com

---

[![Security Audited Nov 2025](https://img.shields.io/badge/Security-Audited%20Nov%202025-00ff00?style=flat-square)](SECURITY.md)
`;
