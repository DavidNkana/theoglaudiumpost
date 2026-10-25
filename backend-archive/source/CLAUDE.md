# CLAUDE.md - Backend

This file provides guidance to Claude Code when working with the Spring Boot backend.

## Core Principles

### Fail Fast
- Validate inputs at the entry point (controller level)
- Throw exceptions immediately when something is wrong
- Don't silently swallow errors or return nulls when an error occurred
- Use specific exception types (ItemNotFoundException, ApiException, etc.)

### Single Method Implementation
- ONE way to do each thing - never create 2 or 3 methods that do the same thing
- If functionality exists, find and use it - don't duplicate
- Remove redundant/duplicate methods when found
- Keep the codebase DRY (Don't Repeat Yourself)

## Before Modifying Any File

**ALWAYS read the PURPOSE comment at the top of the class first.** Every class has a documentation block explaining:
- What the class does
- Key methods/endpoints
- Dependencies and relationships

If you make structural changes to a class, **UPDATE the PURPOSE comment** to reflect the new structure.

## Commands

```bash
./mvnw spring-boot:run      # Start server on port 9011
./mvnw clean compile        # Compile only
./mvnw clean package        # Build WAR file
```

## Architecture

```
Controllers/     → REST endpoints (thin layer, delegates to Services)
Services/        → Business logic, external integrations
Models/DB/       → JPA @Entity classes (map to MySQL tables via Hibernate)
Repositories/    → Spring Data JPA repositories
Models/DTO/      → Request/Response objects for API
config/          → Spring configuration beans
Utils/           → Helper classes, adapters (incl. LaudiumJdbcUtil for raw JDBC)
Exceptions/      → Custom exception types
Logic/           → Complex business logic
```

## Key Rules

### Persistence — JPA / Hibernate
- `Models/DB/` are JPA `@Entity` classes; access data through Spring Data
  repositories in `Repositories/`. The custom MCQL ORM has been **removed**.
- Entity fields must match the MySQL schema; Hibernate runs in validate mode.
- Any remaining raw SQL goes through `Utils/LaudiumJdbcUtil` (pure JDBC,
  parameterized) — never string-concatenated user input.

### DTOs
- Use explicit Java classes - never `Map<String, Object>`
- DTO structure must match OpenAPI spec
- Request DTOs go in `Models/DTO/`

### Gson
- Use centralized `Util.getGson()` method
- Must include LocalDateTime adapter

### Code Changes
- Add `@ModifiedByJunie YYYY-MM-DD` above modified methods
- Update the PURPOSE comment if structure changes
- Add JavaDoc to new methods

## API Base Path

All endpoints are under: `/laudium/api/v1/`

## External Services

| Service | Config Location |
|---------|-----------------|
| MySQL | application.properties |
| Gemini AI | gemini.api.key |
| Cloudinary | cloudinary.* |
| PayFast | payfast.* |
| OneSignal | onesignal.* |
| SMTP | spring.mail.* |
