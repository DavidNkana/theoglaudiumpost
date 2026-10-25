# Junie Backend Guidelines for LytSoft Platform

This file defines all backend coding, structure, and behavior rules that Junie must strictly follow. No assumptions are allowed beyond what is explicitly written here.

---

## 🔧 Tech Stack

- Java 24
- Spring Boot 3.5.4
- Custom ORM: MCQL (defined in `libs/mcql.yaml`)
- REST API using `@RestController`
- OpenAPI 3 (Swagger) specification in `docs/api.yaml`

---

## 📁 Project Structure
- `resources/api.yaml` → OpenAPI spec (single source of truth for API contracts and examples)
- `libs/mcql.yaml` → Database schema and model contract
- `CHANGES.md` → All Junie-generated changes must be logged here

---

## ✅ Mandatory Behavior

### 🧠 Comment Discipline

- ✅ **Always read and respect developer comments before modifying any code**
- ✅ Do not remove, override, or contradict existing comments
- ✅ Every new method or class must include meaningful JavaDoc

---

### 🛠️ MCQL Rule Set

- ✅ Always reference `libs/mcql.yaml` before generating or editing any model class
- ✅ Ensure all fields match the defined SQL schema (names, types, constraints)
- ❌ Do not introduce undocumented fields or types

---

### 🌐 REST API Rules

- ✅ If any `@RestController` route is changed:
    - Update `docs/api.yaml` immediately
    - Add the tag `@ModifiedByJunie YYYY-MM-DD` above the affected method

---

### 📦 JSON / DTO Rules

- ✅ Only use **explicit Java classes** for request and response objects
- ❌ Do **not** use `Map<String, Object>` unless absolutely required and explained
- ✅ Place all DTOs in a clearly named `dto` package
- ✅ DTO structure must exactly match what’s documented in OpenAPI

---

### 📄 Gson Usage Policy

- ✅ All Gson usage must be centralized in a utility method:
  - Create or use `*.util.Util.getGson()`
- ✅ The Gson instance **must** include a registered `LocalDateTime` adapter:
```java
Gson gson = new GsonBuilder()
    .registerTypeAdapter(LocalDateTime.class, new JsonDeserializer<LocalDateTime>() {
        public LocalDateTime deserialize(JsonElement json, Type typeOfT, JsonDeserializationContext context) {
            return LocalDateTime.parse(json.getAsString());
        }
    })
    .create();
```

## 🧪 API-Driven Testing Policy

**Traditional unit tests are forbidden.**

- ✅ All testing must be performed via **OpenAPI example payloads**
- ✅ For every endpoint Junie adds or modifies:
    - Add at least **one full request and one full response example** in `docs/api.yaml`
    - Include example values for all parameters and fields
    - Ensure the examples are runnable via Swagger UI or other OpenAPI clients
- ✅ These examples act as:
    - Your integration tests
    - Your documentation
    - Your QA validation basis

**Example OpenAPI snippet:**
```yaml
paths:
  /users:
    post:
      summary: Create a new user
      requestBody:
        content:
          application/json:
            example:
              name: "John Doe"
              email: "john@example.com"
      responses:
        '200':
          description: User created
          content:
            application/json:
              example:
                id: "usr_123"
                status: "created"
