package com.laudiumbiz.Laudiumbiz.Services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.laudiumbiz.Laudiumbiz.Models.ArticleGenerated;
import com.laudiumbiz.Laudiumbiz.Models.SourceArticle;
import com.laudiumbiz.Laudiumbiz.Utils.ArticleResearchEnricher;
import com.laudiumbiz.Laudiumbiz.Utils.Utils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.logging.Logger;

/**
 * PURPOSE: Generates grounded news articles with xAI Grok 4.3 using live X and web search tools,
 * and harvests recent Laudium source links from X / the web via the same Responses API.
 *
 * KEY METHODS:
 * - generateArticle(String prompt): Calls xAI Responses API with x_search + web_search, returns structured JSON
 * - sourceAll(): Calls xAI Responses API with x_search (from_date = 30 days ago) + web_search, maps
 *   URL citations from output[].content[].annotations into SourceArticle objects with platform="x"
 *   and type="x_search"
 * - extractResponsesText(String body): Pulls assistant text from a Responses payload
 * - extractCitationUrls(String body): Pulls nested Responses API url_citation annotations
 * - mergeCitationUrls(ArticleGenerated, String body): Folds citation URLs into a generated article's sources
 *
 * INTEGRATIONS: xAI Responses API (https://api.x.ai/v1/responses) with built-in x_search and web_search tools.
 * x_search tool accepts from_date (ISO8601, used to bound the harvest to the last 30 days) and returns
 * an automatic citations array of URLs actually used in the response.
 */
@Service("grokService")
public class GrokService implements NewsAIService {

    private static final Logger logger = Logger.getLogger(GrokService.class.getName());

    @Value("${xai.api.key}")
    private String xaiApiKey;

    @Value("${xai.model:grok-4.3}")
    private String grokModel;

    @Value("${xai.api.url.responses:https://api.x.ai/v1/responses}")
    private String xaiResponsesApiUrl;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();
    private final ArticleResearchEnricher articleResearchEnricher;

    public GrokService(ArticleResearchEnricher articleResearchEnricher) {
        this.articleResearchEnricher = articleResearchEnricher;
    }

    private String generateSlug(String title) {
        if (title == null || title.isEmpty()) {
            return "generated-article";
        }
        String slug = title.toLowerCase();
        slug = slug.replaceAll("\\s+", "-");
        slug = slug.replaceAll("[^a-z0-9-]", "");
        slug = slug.replaceAll("-+", "-");
        slug = slug.replaceAll("^-|-$", "");
        return slug;
    }

    @Override
    public ArticleGenerated generateArticle(String prompt) throws IOException {
        logger.info("Generating article with Grok Responses API, model: " + grokModel);

        String enrichedPrompt = articleResearchEnricher.enrichWhenSupplementEnabled(prompt);

        String systemPrompt = "You are a professional local journalist for the Laudium Biz App. "
                + "Use x_search to find relevant posts on X (Twitter) and web_search for corroborating news. "
                + "Write a comprehensive article (300-700 words) grounded in what you find. "
                + "Output strict JSON ONLY with keys: title, article, summary, slug, sources. "
                + "sources must contain 2-5 HTTPS URLs you actually used. "
                + com.laudiumbiz.Laudiumbiz.Utils.ArticleContentFormatter.HTML_PARAGRAPH_RULES + " "
                + "Your lens: where natural, add Laudium / Centurion Muslim community context; "
                + "write for the Muslim community without forcing local angles on international stories.";

        ObjectNode rootJson = objectMapper.createObjectNode();
        rootJson.put("model", grokModel);

        ArrayNode inputArr = objectMapper.createArrayNode();
        ObjectNode system = objectMapper.createObjectNode();
        system.put("role", "system");
        system.put("content", systemPrompt);
        inputArr.add(system);

        ObjectNode user = objectMapper.createObjectNode();
        user.put("role", "user");
        user.put("content", enrichedPrompt);
        inputArr.add(user);
        rootJson.set("input", inputArr);

        ArrayNode tools = objectMapper.createArrayNode();
        tools.add(objectMapper.createObjectNode().put("type", "x_search"));
        tools.add(objectMapper.createObjectNode().put("type", "web_search"));
        rootJson.set("tools", tools);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(xaiApiKey);

        String requestBody = objectMapper.writeValueAsString(rootJson);
        HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);

        logger.info("Grok API call - URL: " + xaiResponsesApiUrl + ", Model: " + grokModel);

        ResponseEntity<String> response = restTemplate.postForEntity(xaiResponsesApiUrl, entity, String.class);
        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new IOException("Grok API error: HTTP " + response.getStatusCode());
        }

        String content = extractResponsesText(response.getBody());
        if (content.isBlank()) {
            throw new IOException("Grok returned no article content");
        }

        content = content.replace("```json", "").replace("```", "").trim();
        ArticleGenerated generated = Utils.getGson().fromJson(content, ArticleGenerated.class);
        if (generated.getTitle() == null || generated.getTitle().isBlank()) {
            throw new IOException("Grok returned no usable article JSON");
        }

        mergeCitationUrls(generated, response.getBody());

        if (generated.getTitle() != null && !generated.getTitle().isEmpty()) {
            generated.setSlug(generateSlug(generated.getTitle()));
        }
        generated.setArticle(generated.getArticle());
        return generated;
    }

    /**
     * Pull assistant text from an xAI Responses payload (same shape as OpenAI Responses).
     */
    private String extractResponsesText(String body) throws IOException {
        JsonNode root = objectMapper.readTree(body);
        if (root.hasNonNull("output_text")) {
            return root.path("output_text").asText("").trim();
        }
        JsonNode output = root.path("output");
        if (output.isArray()) {
            for (JsonNode node : output) {
                if (!"message".equals(node.path("type").asText(""))) {
                    continue;
                }
                JsonNode contentNode = node.path("content");
                if (contentNode.isArray()) {
                    for (JsonNode part : contentNode) {
                        String text = part.path("text").asText("");
                        if (text.isBlank()) {
                            text = part.path("output_text").asText("");
                        }
                        if (!text.isBlank()) {
                            return text.trim();
                        }
                    }
                }
                String flat = node.path("content").asText("");
                if (!flat.isBlank()) {
                    return flat.trim();
                }
            }
        }
        return root.path("choices").path(0).path("message").path("content").asText("").trim();
    }

    /**
     * When Grok returns citation URLs, fold any missing ones into sources so the article stays verifiable.
     */
    private void mergeCitationUrls(ArticleGenerated generated, String rawBody) throws IOException {
        List<String> citations = extractCitationUrls(rawBody);
        if (citations.isEmpty()) {
            return;
        }
        List<String> merged = new ArrayList<>();
        if (generated.getSources() != null) {
            Collections.addAll(merged, generated.getSources());
        }
        for (String url : citations) {
            if (!url.isBlank() && url.startsWith("https://") && !merged.contains(url)) {
                merged.add(url);
            }
        }
        if (!merged.isEmpty()) {
            generated.setSources(merged.toArray(new String[0]));
        }
    }

    /**
     * Extracts citation URLs from the xAI Responses API. Current responses store
     * structured citations under {@code output[].content[].annotations[]} as
     * {@code type="url_citation"}; the former root-level citations array remains
     * supported for backward compatibility.
     */
    // @ModifiedByJunie 2026-07-10
    List<String> extractCitationUrls(String rawBody) throws IOException {
        JsonNode root = objectMapper.readTree(rawBody);
        Set<String> urls = new LinkedHashSet<>();

        JsonNode legacyCitations = root.path("citations");
        if (legacyCitations.isArray()) {
            for (JsonNode citation : legacyCitations) {
                String url = citation.isTextual() ? citation.asText("") : citation.path("url").asText("");
                if (url.startsWith("https://")) {
                    urls.add(url);
                }
            }
        }

        JsonNode output = root.path("output");
        if (output.isArray()) {
            for (JsonNode item : output) {
                JsonNode content = item.path("content");
                if (!content.isArray()) {
                    continue;
                }
                for (JsonNode contentBlock : content) {
                    JsonNode annotations = contentBlock.path("annotations");
                    if (!annotations.isArray()) {
                        continue;
                    }
                    for (JsonNode annotation : annotations) {
                        if (!"url_citation".equals(annotation.path("type").asText(""))) {
                            continue;
                        }
                        String url = annotation.path("url").asText("");
                        if (url.startsWith("https://")) {
                            urls.add(url);
                        }
                    }
                }
            }
        }

        return new ArrayList<>(urls);
    }

    /**
     * Harvest recent Laudium source links via xAI Responses API.
     *
     * <p>Builds a POST /v1/responses request with two built-in tools:
     * <ul>
     *   <li><code>x_search</code> with <code>from_date</code> set to 30 days before today (ISO8601 date),
     *       so we never surface stale posts from earlier months.</li>
     *   <li><code>web_search</code> for broader web coverage of Laudium news and events.</li>
     * </ul>
     *
     * <p>The response carries URL-citation annotations nested under output text blocks and an
     * <code>output_text</code> summary. Each citation becomes a {@link SourceArticle} with
     * <code>platform="x"</code> and <code>type="x_search"</code>, carrying the Grok summary as the
     * article snippet so the admin UI has something to show in the list.
     *
     * @return non-empty list of SourceArticle objects harvested from Grok's response
     * @throws IOException if the API call fails, returns no usable citations, or the body cannot be parsed
     */
    // @ModifiedByJunie 2026-07-10
    @Override
    public List<SourceArticle> sourceAll() throws IOException {
        logger.info("Sourcing articles with Grok Responses API, model: " + grokModel);

        String fromDate = LocalDate.now().minusDays(30).toString();

        String systemPrompt = "You are a community news editor for Laudium, South Africa. "
                + "Use x_search to find recent X (Twitter) posts about Laudium and web_search for "
                + "corroborating web articles. Always cite the actual URLs you used. "
                + "Focus on the Laudium / Centurion Muslim community, local events, civic news, "
                + "and small-business updates from the last 30 days.";

        String userPrompt = "Find recent Laudium South Africa community news, events, and social media posts.";

        ObjectNode rootJson = objectMapper.createObjectNode();
        rootJson.put("model", grokModel);

        ArrayNode inputArr = objectMapper.createArrayNode();
        ObjectNode system = objectMapper.createObjectNode();
        system.put("role", "system");
        system.put("content", systemPrompt);
        inputArr.add(system);

        ObjectNode user = objectMapper.createObjectNode();
        user.put("role", "user");
        user.put("content", userPrompt);
        inputArr.add(user);
        rootJson.set("input", inputArr);

        ArrayNode tools = objectMapper.createArrayNode();
        ObjectNode xSearch = objectMapper.createObjectNode();
        xSearch.put("type", "x_search");
        xSearch.put("from_date", fromDate);
        tools.add(xSearch);
        tools.add(objectMapper.createObjectNode().put("type", "web_search"));
        rootJson.set("tools", tools);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(xaiApiKey);

        String requestBody = objectMapper.writeValueAsString(rootJson);
        HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);

        logger.info("Grok sourceAll API call - URL: " + xaiResponsesApiUrl + ", from_date: " + fromDate);

        ResponseEntity<String> response = restTemplate.postForEntity(xaiResponsesApiUrl, entity, String.class);
        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new IOException("Grok API error: HTTP " + response.getStatusCode());
        }

        String summary = extractResponsesText(response.getBody());
        if (summary.isBlank()) {
            throw new IOException("Grok returned no source summary");
        }

        List<String> citations = extractCitationUrls(response.getBody());
        if (citations.isEmpty()) {
            throw new IOException("Grok returned no citations");
        }

        String now = LocalDateTime.now().toString();
        List<SourceArticle> articles = new ArrayList<>();
        for (String url : citations) {
            if (url.isBlank() || !url.startsWith("https://")) {
                continue;
            }
            SourceArticle article = new SourceArticle();
            article.setTitle(extractTitleFromUrl(url));
            article.setUrl(url);
            article.setPlatform("x");
            article.setType("x_search");
            article.setTimestamp(now);
            article.setAuthor("Grok x_search");
            article.setSummary(summary.length() > 500 ? summary.substring(0, 500) : summary);
            articles.add(article);
        }

        if (articles.isEmpty()) {
            throw new IOException("Grok returned no usable citation URLs");
        }

        logger.info("Grok sourceAll harvested " + articles.size() + " source articles");
        return articles;
    }

    /**
     * Derive a short human-readable title from a citation URL by taking the last non-empty path
     * segment and tidying it. Falls back to a generic label when the URL carries no useful path.
     */
    private String extractTitleFromUrl(String url) {
        try {
            String path = url;
            int qIdx = path.indexOf('?');
            if (qIdx > 0) {
                path = path.substring(0, qIdx);
            }
            int lastSlash = path.lastIndexOf('/');
            if (lastSlash >= 0 && lastSlash < path.length() - 1) {
                String last = path.substring(lastSlash + 1);
                if (!last.isBlank()) {
                    return last.replace('-', ' ').replace('_', ' ').trim();
                }
            }
        } catch (Exception ignored) {
            // fall through to generic title
        }
        return "Source from x_search";
    }
}
