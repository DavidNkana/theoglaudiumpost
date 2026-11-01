# Backend archive

The application backend was replaced by **Supabase** (PostgreSQL, Auth,
Storage, Row Level Security). The Vue frontend talks to Supabase directly —
there is no separate application server and no Spring Boot service to deploy.

The original Spring Boot/MariaDB backend is retained here for provenance only:

- The supplied archives remain locally (untracked) for reference.
- The committed source snapshot was removed when the backend was retired. It is
  still available in the Git history of this repository.

The current data model lives in `supabase/migrations/`.
