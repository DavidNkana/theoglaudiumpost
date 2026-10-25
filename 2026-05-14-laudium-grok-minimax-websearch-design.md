# Laudium Grok + Shared MiniMax Web Search Design

## Context

Laudium's active Azure DevOps source repos are under project `Laudium Biz`:

- Frontend: `Laudium Biz`, default branch `main`
- Backend: `lauduimbizAPI`, default branch `master`

Local working copies were aligned under `C:\Software\SafAi\LaudiumAPP` without deleting or overwriting existing local folders:

- Frontend: `C:\Software\SafAi\LaudiumAPP\Laudium Biz`
- Backend: `C:\Software\SafAi\LaudiumAPP\lauduimbizAPI`

Existing folders such as `Laudium Biz FrontEnd` and `Improved Search` are retained as reference/cache folders only. The backend zip and `VukaaFrontEND` are not implementation sources for this work.

## Approved Scope

Add two Laudium AI capabilities:

1. Add MiniMax web search as a backend tool available to all Laudium AI providers/agents.
2. Add Grok with X search enabled as a real AI provider/model everywhere Laudium exposes AI selectors.

MiniMax web search is a tool, not a frontend AI/model selector option.

## Selected Architecture

Use a shared backend web-search tool service.

The backend will expose one reusable MiniMax-backed web-search capability, for example `WebSearchToolService`. GPT, Gemini, Perplexity, and Grok provider flows can use that service when they need current web research. The frontend remains responsible only for selecting the AI provider/model.

This is preferred over provider-specific duplicate search logic because it keeps tool behavior consistent and avoids drift.

## Frontend Design

The frontend AI selector remains a model/provider selector only.

Expected providers:

- Magic Ai — GPT / ChatGPT
- Serah AI — Gemini
- Beatrice AI — Perplexity
- Nicolah — Grok with X search

MiniMax web search must not appear as a selector option.

Known frontend areas to update include:

- Source Articles page
- Create-from-source / article prompt modal
- Shared provider mapping in `src/services/articles.js`
- Any additional AI selector Anthony/Sacha finds in the frontend repo

Frontend behavior requirements:

- Remove the current Nicolah/X unavailable fallback.
- Route X/Grok selection to real backend Grok endpoints.
- Centralize provider definitions where practical so labels, endpoint prefixes, and availability do not drift across components.
- Show clear UI errors when the selected provider or its tools fail.
- Do not silently fall back to another model unless Chris explicitly approves fallback behavior.

## Backend Design

Add a shared MiniMax-backed web-search tool service:

- The service returns structured search results suitable for prompt enrichment and source-article generation.
- The service is available to all AI provider flows.
- It must fail clearly if MiniMax web search is unavailable.
- It must not fabricate empty or placeholder source articles.

Add/complete Grok/X provider support using the existing provider endpoint pattern.

Expected Grok endpoint coverage:

- `x/sourceArticles/all`
- `x/sourceArticles/{id}` if required by existing frontend mappings
- `x/sourceArticles/byIds`
- `x/generate-article`
- `x/generate-article/by-id`
- `x/generate-articles/bulk`
- `x/refine-article/{sourceId}` if existing provider flows support refine

Grok should use X search capability and can also receive MiniMax web-search results where the workflow needs broader web research.

Existing GPT, Gemini, and Perplexity flows should be able to use the shared MiniMax web-search tool as needed.

## Data Flow

1. Editor selects an AI provider/model in the Laudium frontend.
2. Frontend sends the request to the selected provider endpoint.
3. Backend provider service determines whether current web research is needed.
4. Backend calls the shared MiniMax web-search tool service when needed.
5. Backend passes search results into the selected provider prompt/tool context.
6. Backend returns the response shape already expected by the frontend.

Expected response shapes include source articles, generated article content, summary, slug, and sources.

## Error Handling

- Missing Grok API key: fail fast with a clear backend configuration error.
- MiniMax web search unavailable: return a clear web-search-unavailable error.
- Provider returns malformed output: backend validates and returns a clear error instead of allowing frontend breakage.
- Frontend displays visible failure messages.
- No silent fallback to another provider without Chris approval.

## Testing Requirements

Backend:

- Verify provider endpoints for GPT, Gemini, Perplexity, and Grok still work.
- Verify Grok endpoints exist and return the same shape expected by frontend consumers.
- Verify each AI provider flow can call the shared web-search tool where relevant.
- Verify MiniMax web-search failure produces a clear error.

Frontend:

- Build passes.
- AI selectors show Nicolah/Grok as an available provider.
- MiniMax web search does not appear as an AI provider option.
- Nicolah/Grok no longer triggers the old unavailable fallback popup.
- Source-article retrieval and article generation work through Grok.

End-to-end:

- Run an editor workflow: choose Grok/Nicolah, fetch source articles, generate an article from a selected source, and confirm web-sourced evidence appears in the result.

## Out of Scope

- MiniMax media/document generation tools.
- VukaaFrontEND.
- Backend zip extraction or implementation from zip.
- Production deployment without separate Chris approval.
