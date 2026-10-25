package com.laudiumbiz.Laudiumbiz.Utils;

import com.laudiumbiz.Laudiumbiz.Models.DB.Articles;
import com.laudiumbiz.Laudiumbiz.Models.DB.SourceArticles;

/**
 * Utility to build a consistent article-generation prompt from a SourceArticles DB row.
 */
public class PromptBuilderFromSource {

    public static String build(SourceArticles sa) {
        if (sa == null) return "";
        StringBuilder sb = new StringBuilder();
        sb.append("Write an article based on the Following info.\n\n");
        sb.append("Source:\n");
        sb.append("- Title: ").append(nz(sa.getTitle())).append("\n");
        sb.append("- Summary: ").append(nz(sa.getSummary())).append("\n");
        sb.append("- URL: ").append(nz(sa.getUrl())).append("\n");
        sb.append("Return JSON with: title, summary, article, and slug (slugify title).\n");
        return sb.toString();
    }

    public static String refine(SourceArticles source, Articles article, String refinePrompt){
      if(article == null) return "";

        StringBuilder sb = new StringBuilder(1400);
        sb.append("Refine the previously generated article according to the user's refinement request.\n")
          .append("Preserve all verified facts from the current article unless they contradict the source.\n")
          .append("If the refinement conflicts with facts, prefer facts and note 'Not confirmed' where needed.\n")
          .append("\nREFINEMENT REQUEST\n")
          .append(safe(refinePrompt)).append("\n")
          .append("\nCURRENT ARTICLE\n")
          .append("- title: ").append(safe(article.getTitle())).append("\n")
          .append("- summary: ").append(safe(article.getSummary())).append("\n")
          .append("- content: ").append(stripHtml(safe(article.getContent()))).append("\n");

            sb.append("- source_url: ").append(safe(source.getUrl())).append("\n");


        sb.append("\nEDIT POLICY\n")
          .append("- Make only the minimal changes necessary to fulfill the refinement.\n")
          .append("- Do not introduce facts not supported by the source; mark unknowns as 'Not confirmed'.\n")
          .append("- Keep neutral tone; avoid promotional language unless explicitly requested.\n")
          .append("- Maintain or improve clarity, structure, and flow.\n")
          .append("- Slug must reflect the *new* title using the same rules: lowercase, ASCII-only, hyphen-separated, <=60 chars.\n")
          .append("- If asked to shorten, prefer removing redundancy; if asked to lengthen, expand context safely.\n")
          .append("- If asked to change tone/reading level, adjust wording but do not change facts.\n")
          .append("\nOUTPUT\n")
          .append("Return strict JSON with keys: title, summary, article, slug, citations, entities, topics, meta.\n");

      sb.append("Return JSON with: title, summary, article, and slug (slugify title).\n");
      return sb.toString();
    }
    private static String safe(String s) {
        if (s == null) return "";
        // collapse whitespace, strip control chars, avoid model confusion with backticks
        String cleaned = s.replaceAll("[\\p{Cntrl}&&[^\n\t]]", " ").replaceAll("\\s+", " ").trim();
        // soft escape quotes to play nice with LLM JSON emitters
        return cleaned.replace("\"", "“").replace("'", "’");
    }

    private static String stripHtml(String s) {
        if (s == null) return "";
        return s.replaceAll("(?s)<[^>]*>", " "); // coarse; your global sanitizer may be stronger
    }

    private static String trunc(String s, int limit) {
        if (s == null || s.length() <= limit) return s;
        return s.substring(0, Math.max(0, limit - 3)) + "...";
    }

    private static String nz(String s) { return s == null ? "" : s; }
}
