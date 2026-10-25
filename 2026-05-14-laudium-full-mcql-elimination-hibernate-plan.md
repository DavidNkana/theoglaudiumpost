# Laudium Backend — Full MCQL Elimination + Hibernate-JPA Migration Plan

> **Scope:** Backend only. Remove unresolvable MCQL Maven dependency, migrate all MCQL-dependent code to pure JDBC + JPA/Hibernate, implement Grok + MiniMax backend, verify compile.
>
> **Critical Change from Prior Plan:** SQL.java extends `CQL.Mapper.SQLMapper<SQL>` from MCQL. It is NOT plain JDBC. The prior plan's assumption that "SQL.java is plain JDBC" was incorrect. The entire SQL utility layer must be rewritten as pure JDBC before any model conversion.

**Source of Truth:**
- LCP parent task: `#676`
- Approved spec: `C:\Software\SafAi\LaudiumAPP\docs\superpowers\specs\2026-05-14-laudium-grok-minimax-websearch-design.md`
- Backend repo: `C:\Software\SafAi\LaudiumAPP\lauduimbizAPI`
- Sacha blocker report: `C:\Users\chris\.opencode\safetask\results\sacha-implement-laudium-backend-hibernate-grok-minimax-20260514.md`

---

## Critical Finding: Sacha Discovered MCQL Architectural Blocker

### What the Prior Plan Got Wrong

The prior implementation plan (2026-05-14) stated:
> "SQL.java and raw SQL queries via `sql.getSelectRaw()`, `sql.select()`, `sql.getInsertRawPrepared()` are **plain JDBC**. They do NOT depend on MCQL and do NOT need changes."

**This was incorrect.** Sacha discovered during implementation that:

1. `SQL.java` **extends `CQL.Mapper.SQLMapper<SQL>`** — THE core MCQL database connection/query layer
2. MCQL is NOT just an ORM for models — it is the **entire database connection and query execution layer**
3. When code calls `new SQL()` then `.getSelectRaw()`, `.select()`, or `.getInsertRawPrepared()`, those methods are MCQL's SQLMapper implementations, NOT plain JDBC

### Confirmed MCQL Dependency Surface

| File | MCQL Usage | Impact |
|------|-----------|--------|
| `Utils/SQL.java` | `extends SQLMapper<SQL>` | **CRITICAL** — Core DB connection layer. All DB ops flow through here. |
| `Utils/errorlogs.java` | `extends SQLMapper<errorlogs>` | MCQL ORM model |
| `Utils/Utils.java` | `import CQL.utils.UncheckedFunction` | Only used in `uncheck()` utility — replaceable |
| `Models/DB/*.java` (20 files) | `extends SQLMapper<T>` | All DB models depend on MCQL ORM |
| `ArticleService.java` | `import CQL.Mapper.CustomRs` + MCQL patterns | Uses both SQLMapper and CustomRs |
| 10 Controllers | `import CQL.Mapper.CustomRs` | All use MCQL's CustomRs result wrapper |
| `LaudiumbizApplication.java` | `import CQL.Mapper.SQLMapper` | Spring Boot main class |
| `ServletInitializer.java` | `import CQL.Mapper.SQLMapper` | WAR packaging initializer |

### MCQL Dependency Evidence

**pom.xml lines 113-117:**
```xml
<dependency>
    <groupId>MCQL</groupId>
    <artifactId>MQCL.chrilantech</artifactId>
    <version>1</version>
</dependency>
```

**Grep results confirming 68 CQL.* imports across ~32 Java files.**

---

## Revised Migration Architecture

The migration must be done in **five sequential phases**. Each phase must compile and verify before proceeding to the next.

### Phase 1: SQL.java Replacement (Pure JDBC Foundation)
**Objective:** Replace `SQL.java` (which extends MCQL SQLMapper) with a pure JDBC utility class.

**New file:** `Utils/JdbcSql.java` — pure JDBC, no MCQL dependencies.

Key methods to replicate:
- `getSelectRaw(String sql)` → returns `java.sql.ResultSet` (wrapped in local `CustomRs`)
- `getSelectRawPrepared(String sql, Object[] params)` → prepared statement
- `getInsertRawPrepared(String sql, Object[] params)` → returns `CustomRs`
- `select(String sql, RowMapper<T>)` → returns mapped entity list
- `selectAndConsume(String sql, Consumer<CustomRs>)` → streaming consumption

**Critical:** The `setDB(String db)` pattern used by models must be replaced with a connection-source approach compatible with Spring's `DataSource`.

**Verification:** `mvn clean compile -DskipTests` succeeds with SQL.java replaced by JdbcSql.java.

---

### Phase 2: CustomRs Replacement
**Objective:** Ensure all `CQL.Mapper.CustomRs` imports resolve to the local `Utils/CustomRs.java` wrapper (which already exists and wraps `java.sql.ResultSet`).

**Affected files (11 total):**
- `Services/ArticleService.java`
- `Controllers/NoticeController.java`
- `Controllers/PaymentController.java`
- `Controllers/DashboardController.java`
- `Controllers/CampaignController.java`
- `Controllers/CategoryController.java`
- `Controllers/BusinessDashboardController.java`
- `Controllers/BusinessController.java`
- `Controllers/AdController.java`
- `Controllers/AdPlacementController.java`
- `Models/DB/Articles.java`

**Change:** Replace `import CQL.Mapper.CustomRs` with `import com.laudiumbiz.Laudiumbiz.Utils.CustomRs`.

**Verification:** `mvn clean compile -DskipTests` — no `CQL.Mapper.CustomRs` references remain.

---

### Phase 3: Model/Entity Conversion (JPA)
**Objective:** Convert all 20 `Models/DB/*.java` files from MCQL ORM to standard JPA/Hibernate entities.

**Pattern change:**

```java
// BEFORE (MCQL):
@Data
@Table(name = "source_articles")
public class SourceArticles extends SQLMapper<SourceArticles> {
    @SQLMapperAnnotation(PrimaryKey = true, AutoGenPrimaryKey = true)
    Integer id;

// AFTER (JPA):
@Entity
@Table(name = "source_articles")
public class SourceArticles {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
```

**Files to convert:**
1. `SourceArticles.java` — critical for AI work
2. `Articles.java`
3. `User.java`, `Media.java`, `Category.java`, `Tag.java`, `Role.java`
4. `Ad.java`, `AdImage.java`, `AdPlacement.java`, `AdTags.java`
5. `Announcement.java`, `AnnouncementCategory.java`
6. `ArticleTags.java`, `Businesses.java`, `Campaigns.java`
7. `AuthRequest.java`, `AuthResponse.java`
8. `Payment.java`, `Placement.java`, `Prompt.java`

**New repository interfaces needed:**
- `Repositories/SourceArticlesRepository.java`
- `Repositories/ArticlesRepository.java`
- `Repositories/UserRepository.java`
- `Repositories/MediaRepository.java`
- `Repositories/CategoryRepository.java`
- `Repositories/TagRepository.java`
- `Repositories/RoleRepository.java`
- `Repositories/BusinessesRepository.java`
- `Repositories/AdRepository.java`
- `Repositories/AnnouncementRepository.java`
- `Repositories/PaymentRepository.java`
- `Repositories/CampaignsRepository.java`

**Verification:** `mvn clean compile -DskipTests` — all models compile as JPA entities.

---

### Phase 4: Service/Controller Migration
**Objective:** Replace MCQL ORM patterns (`.setDB(SQL.DB).find()`, `.where().first()`, etc.) with JPA repository injections.

**Key changes in `ArticleService.java`:**

```java
// BEFORE (MCQL ORM):
Articles article = new Articles().setDB(SQL.DB);
article = article.find(id);

// AFTER (JPA):
@Autowired
private ArticlesRepository articlesRepository;
// ...
Articles article = articlesRepository.findById(id).orElseThrow(() -> new ItemNotFoundException(...));
```

**Raw SQL queries** (`sql.getSelectRaw()`, `sql.select()`) should be replaced with JdbcSql or JPA native queries.

**Verification:** `mvn clean compile -DskipTests` — ArticleService and all controllers compile.

---

### Phase 5: Grok + MiniMax Implementation
**Objective:** Add Grok endpoints and MiniMax web-search backend tool.

**Files to create:**
- `Services/MiniMaxWebSearchService.java` — shared web-search tool
- `Services/GrokService.java` — Grok/X AI provider service
- `Controllers/ai/GrokController.java` — Grok endpoints

**Files to modify:**
- `application.properties` — add Grok/MiniMax config (env-backed)

**Endpoints to implement** (following PerplexityController pattern):
- `POST /api/v1/x/sourceArticles/all` — fetch source articles using Grok
- `POST /api/v1/x/generate-article` — generate article using Grok
- `POST /api/v1/x/generate-article/by-id` — generate from specific source
- `POST /api/v1/x/generate-articles/bulk` — bulk generation
- `POST /api/v1/x/refine-article/{sourceId}` — refine existing article

**Verification:** `mvn clean package -DskipTests` succeeds. New endpoints respond with proper JSON.

---

## Revised Task Breakdown

### Azure Work Items (NEW — Full MCQL Elimination)

| ID | Title | Phase | Parent | Type |
|----|-------|-------|--------|------|
| **2856** | **FOUNDATION: Replace SQL.java with pure JDBC utility** | Phase 1 | LCP #676 | Task |
| **2857** | **FOUNDATION: Replace CQL.Mapper.CustomRs with local CustomRs** | Phase 2 | LCP #676 | Task |
| **2858** | **MODELS: Convert SourceArticles.java to JPA** | Phase 3 | LCP #676 | Task |
| **2859** | **MODELS: Create SourceArticlesRepository.java** | Phase 3 | LCP #676 | Task |
| **2860** | **MODELS: Convert remaining Models/DB to JPA** | Phase 3 | LCP #676 | Task |
| **2861** | **MODELS: Create remaining JPA repositories** | Phase 3 | LCP #676 | Task |
| **2862** | **SERVICES: Update ArticleService to use JPA repositories** | Phase 4 | LCP #676 | Task |
| **2863** | **SERVICES: Update all controllers using MCQL patterns** | Phase 4 | LCP #676 | Task |
| **2864** | **SERVICES: Update remaining services using MCQL** | Phase 4 | LCP #676 | Task |
| **2865** | **GROK-MINIMAX: Implement GrokService + GrokController** | Phase 5 | LCP #676 | Task |
| **2866** | **GROK-MINIMAX: Implement MiniMaxWebSearchService** | Phase 5 | LCP #676 | Task |
| **2867** | **GROK-MINIMAX: Add env-backed Grok/MiniMax configuration** | Phase 5 | LCP #676 | Task |
| **2868** | **VERIFY: Full backend compile and health check** | Phase 5 | LCP #676 | Task |

**All tasks link to LCP #676 and parent User Story 2838.**

**Actual Azure IDs created by Alex:** 2856-2868. Anthony's draft used projected IDs 2860-2872; the table above has been corrected to the real Azure work item IDs.

---

## Task Dependencies

```
PHASE 1 (Foundation)
  TASK 2860 (SQL.java rewrite) ─────────────────────┐
                                                     ├─ PHASE 2
  TASK 2861 (CustomRs replace) ──────────────────────┘
                                                     │
PHASE 3 (Models)                                     │
  TASK 2862 (SourceArticles JPA) ─┐                  │
  TASK 2863 (SourceArticles Repo) ─┼─ TASK 2864 ────┤
  TASK 2865 (Remaining repos) ────┘                  │
                                                     │
PHASE 4 (Services/Controllers)                      │
  TASK 2866 (ArticleService update) ─────────────────┤
  TASK 2867 (Controllers update) ────────────────────┤
  TASK 2868 (Remaining services) ────────────────────┤
                                                     │
PHASE 5 (Grok/MiniMax)                               │
  TASK 2869 (Grok endpoints) ─┐                     │
  TASK 2870 (MiniMax service) ─┤─ TASK 2871 ──────┤
  TASK 2872 (Full compile) ─────┴───────────────────┘
```

---

## pom.xml Changes

```xml
<!-- REMOVE these unresolvable dependencies (lines 109-117) -->
<dependency>
    <groupId>models</groupId>
    <artifactId>models.abc.co.zm</artifactId>
    <version>1</version>
</dependency>
<dependency>
    <groupId>MCQL</groupId>
    <artifactId>MQCL.chrilantech</artifactId>
    <version>1</version>
</dependency>

<!-- ADD Spring Data JPA -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
```

---

## Secrets Handling (Unchanged from Prior Plan)

**CRITICAL — NEVER LOG SECRETS:**

1. All API keys use `${ENV_VAR:default}` pattern in `application.properties`
2. Sacha's workflow: set env vars before running backend
3. PR/commit: never include real API key values
4. If credentials exposed: report immediately to Chris

---

## What This Plan Does NOT Cover

- Frontend changes (separate scope under tasks 2839-2841)
- Database schema migrations (existing MySQL schema; Hibernate auto-validation only)
- Production deployment (separate Chris approval required)
- MiniMax media/document generation (web-search tool only)
- VukaaFrontEND or backend zip extraction

---

## Verification Commands

### After Phase 1-2 (Foundation)
```powershell
cd C:\Software\SafAi\LaudiumAPP\lauduimbizAPI
mvn clean compile -DskipTests
```
**Expected:** Build succeeds. No `CQL.Mapper.*` imports remain.

### After Phase 3-4 (Models/Services)
```powershell
mvn clean compile -DskipTests
```
**Expected:** All models compile as JPA entities. ArticleService uses repositories.

### After Phase 5 (Grok/MiniMax)
```powershell
mvn clean package -DskipTests
```
**Expected:** Full build succeeds. New Grok endpoints compile.

### Backend Startup (with credentials)
```powershell
$env:XAI_API_KEY="<grok-key>"; $env:MINIMAX_API_KEY="<minimax-key>"; $env:MINIMAX_WEB_SEARCH_BASE_URL="<minimax-search-url>"; mvn spring-boot:run
```

### Endpoint Tests
```bash
# Verify new Grok endpoint responds (not 500 from dependency issues)
curl http://localhost:9011/laudium/api/v1/x/sourceArticles/all

# Verify existing AI endpoints still work
curl http://localhost:9011/laudium/api/v1/perplexity/sourceArticles/all
```

---

*Plan revised by Anthony (Project Manager) after Sacha's blocker discovery. Original plan incorrectly assumed SQL.java was plain JDBC.*
