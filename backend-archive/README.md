# Backend archive

This directory is intentionally outside the Vercel frontend build path. The
Spring Boot/MariaDB backend is retained separately and must be deployed on Java
and MariaDB-capable infrastructure.

`source/` is the committed source snapshot. Credential-like values from the
supplied pipeline properties were replaced with environment placeholders before
commit. The original supplied archives remain locally here for provenance but
are ignored by Git.
