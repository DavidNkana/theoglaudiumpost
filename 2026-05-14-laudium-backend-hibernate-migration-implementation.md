# Laudium Backend — Hibernate Migration + Grok/MiniMax Implementation Plan

> **Scope:** Backend only. Remove unresolvable Maven dependencies, migrate MCQL models to JPA/Hibernate, implement Grok + MiniMax backend, verify compile.

**Source of Truth:**
- LCP parent task: `#676`
- Approved spec: `C:\Software\SafAi\LaudiumAPP\docs\superpowers\specs\2026-05-14-laudium-grok-minimax-websearch-design.md`
- Frontend repo: `C:\Software\SafAi\LaudiumAPP\Laudium Biz`
- Backend repo: `C:\Software\SafAi\LaudiumAPP\lauduimbizAPI`
- Azure Project: `Laudium Biz`
- Existing backend tasks: `2838` (parent), `2842–2845` (backend AI), `2846–2847` (verification)
- Backend migration tasks: `2848–2855` (NEW — this plan)

---

## Critical Finding: Maven Dependency Blockers

### Unresolvable Dependencies (pom.xml lines 109-117)

```
models:models.abc.co.zm:jar:1     ← NOT imported anywhere in Java code. REMOVE.
MCQL:MQCL.chrilantech:jar:1     ← ACTIVELY used. CQL.Mapper.* imported in 38+ files.
```

**Evidence:**
- `C:\Users\chris\.m2\repository\MCQL\MQCL.chrilantech\1\` contains only `.lastUpdated` files (download FAILED)
- `C:\Users\chris\.m2\repository\models\models.abc.co.zm\1\` contains only `.lastUpdated` files (download FAILED)
- Grep across entire backend: `models.abc.co.zm` imports: **0 files**
- Grep across entire backend: `CQL.Mapper` imports: **38+ Java files**

### Maven Local Repo Confirmation

Both artifacts failed to download. The build fails because Maven cannot resolve these dependencies.

---

## Hibernate/JPA Migration Scope

### What Must Change

The MCQL ORM uses custom annotations and a custom `SQLMapper<T>` base class. All 20+ model files in `Models/DB/` must be converted to standard JPA/Hibernate entities.

**Conversion Pattern:**

| MCQL Pattern | JPA Equivalent |
|---|---|
| `@Table(name = "...")` | `@Entity @Table(name = "...")` |
| `@SQLMapperAnnotation(PrimaryKey = true, AutoGenPrimaryKey = true)` | `@Id @GeneratedValue(strategy = GenerationType.IDENTITY)` |
| `@SQLMapperAnnotation(LocalKey = "...", ForeignKey = "...", ForeignTable = "...")` | `@ManyToOne @JoinColumn(name = "...")` |
| `extends SQLMapper<T>` | `extends JpaRepository<T, ID>` OR entity with `@Repository` |
| `new Model().setDB(SQL.DB).find(id)` | `modelRepository.findById(id)` |
| `model.where("field", "=", value).first()` | `modelRepository.findByField(value)` |
| `model.save()` | `modelRepository.save(model)` |
| `model.create()` | `modelRepository.save(model)` |

### Affected Files (Models/DB/)

All 20 files require conversion. Critical ones for AI work:
1. `SourceArticles.java` — stores AI-sourced articles
2. `Articles.java` — generated articles
3. `User.java`, `Media.java`, `Category.java` — referenced entities

### Services That Use MCQL Patterns

Services that need updating to use JPA repositories instead of MCQL:
- `ArticleService.java` — uses `new Articles().setDB(SQL.DB)` pattern
- `SourceArticlePersistenceService.java` — likely uses SourceArticles
- All controllers/services that call `SQL.getSelectRaw()`, `sql.select()`, etc. — **these use raw JDBC via `SQL.java` utility and do NOT need MCQL**. Raw SQL queries are fine.

### Raw SQL Queries — NO CHANGES NEEDED

The `SQL.java` utility class and all `sql.getSelectRaw()`, `sql.select()`, `sql.getInsertRawPrepared()` calls are **plain JDBC**. They do NOT depend on MCQL and do NOT need changes.

### Hibernate/JPA Dependencies Already Present

```xml
<!-- Already in pom.xml — NO ADDITIONAL DEPS NEEDED -->
jakarta.persistence-api 3.1.0
hibernate-validator (via spring-boot-starter-validation)
```

### Spring Data JPA Addition Required

```xml
<!-- Add to pom.xml -->
spring-boot-starter-data-jpa
```

---

## Migration Tasks (NEW Azure Tickets 2848–2855)

### TASK 2848: Add spring-boot-starter-data-jpa to pom.xml

**File:** `pom.xml`

**Change:** Remove `models:models.abc.co.zm` (unused) and add `spring-boot-starter-data-jpa`

**Steps:**
1. Remove the `models` and `MCQL` dependency blocks from `<dependencies>`
2. Add `<dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-data-jpa</artifactId></dependency>`
3. Verify `jakarta.persistence-api` version 3.1.0 remains (already present)
4. Run `mvn clean compile -DskipTests` to confirm backend compiles

**Verification:** `mvn clean compile -DskipTests` succeeds with no MCQL resolution errors.

---

### TASK 2849: Convert SourceArticles.java from MCQL to JPA

**File:** `src/main/java/com/laudiumbiz/Laudiumbiz/Models/DB/SourceArticles.java`

**Change:** Replace MCQL annotations with JPA annotations.

**Before:**
```java
@Data
@Table(name = "source_articles")
public class SourceArticles extends SQLMapper<SourceArticles> {
    @SQLMapperAnnotation(PrimaryKey = true, AutoGenPrimaryKey = true)
    Integer id;
    // ... fields with MCQL annotations
}
```

**After:**
```java
@Entity
@Table(name = "source_articles")
public class SourceArticles {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Integer id;
    // ... plain fields, no MCQL annotations
}
```

**Verification:** `mvn clean compile -DskipTests` — SourceArticles-related code compiles.

---

### TASK 2850: Create SourceArticlesRepository.java

**File:** `src/main/java/com/laudiumbiz/Laudiumbiz/Repositories/SourceArticlesRepository.java`

**New File — JPA Repository pattern:**

```java
@Repository
public interface SourceArticlesRepository extends JpaRepository<SourceArticles, Integer> {
    List<SourceArticles> findByProvider(String provider);
    List<SourceArticles> findByProcessingStatus(String status);
}
```

**Note:** Create new `Repositories/` package if it doesn't exist.

**Verification:** Project compiles with new repository interface.

---

### TASK 2851: Convert remaining Models/DB/*.java from MCQL to JPA

**Files:** All remaining 18 model files in `Models/DB/`:
- `Ad.java`, `AdImage.java`, `AdPlacement.java`, `AdTags.java`
- `Announcement.java`, `AnnouncementCategory.java`
- `ArticleTags.java`, `Articles.java`
- `AuthRequest.java`, `AuthResponse.java`
- `Businesses.java`, `Campaigns.java`, `Category.java`
- `LoginUserRequest.java`, `Media.java`
- `Payment.java`, `Placement.java`, `Prompt.java`, `PromptDTO.java`, `RegisterUserRequest.java`, `Role.java`, `Tag.java`, `User.java`

**Change:** For each model, replace MCQL annotations with JPA annotations.

**Note:** This is a repetitive, mechanical conversion. Each model follows the same pattern as SourceArticles.

**Verification:** `mvn clean compile -DskipTests` succeeds with all models converted.

---

### TASK 2852: Update ArticleService.java to use JPA Repositories

**File:** `src/main/java/com/laudiumbiz/Laudiumbiz/Services/ArticleService.java`

**Change:** Replace MCQL patterns with JPA repository injections.

**Before:**
```java
Articles article = new Articles().setDB(SQL.DB);
article = article.find(id);
```

**After:**
```java
@Autowired
private ArticlesRepository articlesRepository;
// ...
Articles article = articlesRepository.findById(id).orElseThrow(() -> new ItemNotFoundException("Article not found: " + id));
```

**Note:** Raw SQL queries via `sql.getSelectRaw()` and `sql.select()` do NOT need changes.

**Verification:** `mvn clean compile -DskipTests` succeeds. ArticleService compiles with JPA repositories.

---

### TASK 2853: Create remaining JPA Repositories

**Files:** New `Repositories/` package with:
- `ArticlesRepository.java`
- `UserRepository.java`
- `MediaRepository.java`
- `CategoryRepository.java`
- `TagRepository.java`
- `RoleRepository.java`
- `BusinessesRepository.java`
- (Any others needed by services)

**Pattern:** Each extends `JpaRepository<T, Integer>` with custom query methods as needed.

**Verification:** All repositories compile and are injectable.

---

### TASK 2854: Implement Grok + MiniMax Backend (formerly 2842–2845)

**Files:**
- `src/main/java/com/laudiumbiz/Laudiumbiz/Services/MiniMaxWebSearchService.java` — NEW
- `src/main/java/com/laudiumbiz/Laudiumbiz/Services/GrokService.java` — NEW
- `src/main/java/com/laudiumbiz/Laudiumbiz/Controllers/ai/GrokController.java` — NEW
- `src/main/resources/application.properties` — MODIFY (add keys)

**Changes:**

1. **application.properties — add Grok/MiniMax config (env-backed):**
```properties
xai.api.key=${XAI_API_KEY:}
xai.model=${XAI_MODEL:grok-4.3}
xai.base-url=${XAI_BASE_URL:https://api.x.ai/v1}
minimax.api.key=${MINIMAX_API_KEY:}
minimax.web-search.base-url=${MINIMAX_WEB_SEARCH_BASE_URL:}
```

2. **MiniMaxWebSearchService.java — create service:**
   - Inject `minimax.api.key` and `minimax.web-search.base-url`
   - Fail fast if key or base-url is blank
   - Returns structured search results
   - No fabricated/placeholder results

3. **GrokService.java — create service:**
   - Inject `xai.api.key`, `xai.model`, `xai.base-url`
   - Fail fast if key or model is blank
   - Use MiniMax web-search enrichment as backend tool (not frontend fallback)
   - Return same response shapes as GPT/Gemini/Perplexity

4. **GrokController.java — create controller:**
   - Base path: `/api/v1/x`
   - Endpoints: `sourceArticles/all`, `sourceArticles/{id}`, `sourceArticles/byIds`, `generate-article`, `generate-article/by-id`, `generate-articles/bulk`, `refine-article/{sourceId}`
   - Mirror PerplexityController patterns exactly

**Verification:** `mvn clean package -DskipTests` succeeds. All new endpoints compile.

---

### TASK 2855: Full Backend Compile and Health Check

**Verification Steps:**

1. `mvn clean package -DskipTests` — full build succeeds
2. Backend starts with `mvn spring-boot:run` — no MCQL resolution errors
3. Existing AI endpoints still work:
   - `GET /api/v1/perplexity/sourceArticles/all`
   - `GET /api/v1/gemini/sourceArticles/all`
4. New Grok endpoints respond (may return config errors until credentials provided):
   - `GET /api/v1/x/sourceArticles/all` → returns proper error JSON (not 500 from dependency resolution)

---

## Secrets Handling (Sacha Must Follow)

**CRITICAL — NEVER LOG SECRETS:**

1. **Env-backed config only:** All API keys use `${ENV_VAR:default}` pattern in `application.properties`
2. **Sacha's workflow:**
   - Before running any backend command, set env vars: `$env:XAI_API_KEY="<value>"; $env:MINIMAX_API_KEY="<value>"`
   - Env vars are injected at runtime, never written to logs
   - If a command output might contain env var values, use `2>&1 | Where-Object { $_ -notmatch "XAI_API_KEY" }` to filter
3. **PR/commit:** Never include real API key values. Placeholder values only.
4. **If credentials are exposed:** Report immediately to Chris, do not commit.

---

## Out of Scope

- Frontend changes (handled separately under tasks 2839-2841)
- Database schema migrations (existing MySQL schema is live; Hibernate auto-validation only)
- Production deployment (requires separate Chris approval)
- MiniMax media/document generation (web-search tool only)
- VukaaFrontEND or backend zip extraction

---

## Verification Commands

### Full Backend Build
```powershell
cd C:\Software\SafAi\LaudiumAPP\lauduimbizAPI
mvn clean package -DskipTests
```

### Backend Startup (with credentials)
```powershell
$env:XAI_API_KEY="<grok-key>"; $env:MINIMAX_API_KEY="<minimax-key>"; $env:MINIMAX_WEB_SEARCH_BASE_URL="<minimax-search-url>"; mvn spring-boot:run
```

### API Endpoint Tests
```bash
# Grok source articles (expect config error or real data depending on credentials)
curl http://localhost:9011/laudium/api/v1/x/sourceArticles/all

# Perplexity source articles (verify existing AI still works)
curl http://localhost:9011/laudium/api/v1/perplexity/sourceArticles/all
```

---

## Task Dependencies

```
TASK 2848 (pom.xml fix) ─┬─► TASK 2849 (SourceArticles JPA)
                         └─► TASK 2851 (other models JPA) ─► TASK 2852 (ArticleService update)
                                                              └─► TASK 2853 (repositories)
                                                                 └─► TASK 2854 (Grok+MiniMax)
                                                                    └─► TASK 2855 (compile verification)
```

Tasks 2849-2853 are sequential (models → repositories → services).
Tasks 2848 can run in parallel with initial planning.
Tasks 2854-2855 depend on all preceding tasks.

---

## Azure Work Items Summary

| ID | Title | Parent | Status |
|---|---|---|---|
| 2838 | Laudium: Add shared MiniMax web-search tool for all AI providers | LCP #676 | Active |
| 2842 | [TASK-B1] Create MiniMaxWebSearchService.java | 2838 | New (blocked on Maven) |
| 2843 | [TASK-B2] Create GrokService.java | 2838 | New (blocked on Maven) |
| 2844 | [TASK-B3] Create GrokController.java | 2838 | New (blocked on Maven) |
| 2845 | [TASK-B4] Add Grok and MiniMax API keys | 2838 | New (blocked on Maven) |
| **2848** | **[TASK-H1] Fix pom.xml — remove unresolvable deps, add spring-boot-starter-data-jpa** | **2838** | **NEW** |
| **2849** | **[TASK-H2] Convert SourceArticles.java to JPA** | **2838** | **NEW** |
| **2850** | **[TASK-H3] Create SourceArticlesRepository.java** | **2838** | **NEW** |
| **2851** | **[TASK-H4] Convert remaining Models/DB/*.java to JPA** | **2838** | **NEW** |
| **2852** | **[TASK-H5] Update ArticleService to use JPA repositories** | **2838** | **NEW** |
| **2853** | **[TASK-H6] Create remaining JPA repositories** | **2838** | **NEW** |
| **2854** | **[TASK-H7] Implement GrokService + GrokController + MiniMaxWebSearchService** | **2838** | **NEW** |
| **2855** | **[TASK-H8] Full backend compile and health check** | **2838** | **NEW** |

All new tasks link to LCP #676.

---

*Plan created by Anthony (Project Manager). Implementation by Sacha/HoD after Alex approves.*