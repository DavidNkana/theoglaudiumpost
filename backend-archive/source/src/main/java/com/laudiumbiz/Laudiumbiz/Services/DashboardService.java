package com.laudiumbiz.Laudiumbiz.Services;

import com.laudiumbiz.Laudiumbiz.Utils.CustomRs;
import com.laudiumbiz.Laudiumbiz.Utils.LaudiumJdbcUtil;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * PURPOSE: Owns all data-access logic for the dashboard endpoints.
 * Executes the raw analytics SQL (via LaudiumJdbcUtil) and returns plain
 * data structures so the controller performs NO data access itself.
 *
 * The SQL strings, query parameters, and assembled response shapes are
 * identical to the previous inline controller logic; only the location moved.
 */
@Service
public class DashboardService {

    /**
     * Articles + active ads stats. Returns a map shaped as
     * { "articles": {...}, "ads": {...} } matching the prior controller output.
     */
    public Map<String, Object> getStats() throws Exception {
        String q = """
            SELECT
                COUNT(*) AS total_articles,
                COUNT(CASE WHEN a.status = 'published' THEN 1 ELSE NULL END) AS published_count,
                COUNT(CASE WHEN a.status = 'draft' THEN 1 ELSE NULL END) AS draft_count
            FROM articles as a
        """;

        String q1 = """
            SELECT
                COUNT(*) as total_active_ads
            FROM ads
            WHERE ads.status != 'expired'
            AND placement_date <= NOW()
            AND expiry_date >= NOW()
        """;

        Map<String, Long> articlesStats = new HashMap<>();
        try (CustomRs rs = LaudiumJdbcUtil.getSelectRaw(q)) {
            if (rs.next()) {
                articlesStats.put("total_articles", rs.getLong("total_articles"));
                articlesStats.put("total_published", rs.getLong("published_count"));
                articlesStats.put("total_draft", rs.getLong("draft_count"));
            }
        }

        Map<String, Long> adsStats = new HashMap<>();
        try (CustomRs rs2 = LaudiumJdbcUtil.getSelectRaw(q1)) {
            if (rs2.next()) {
                adsStats.put("total_ads", rs2.getLong("total_active_ads"));
            }
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("articles", articlesStats);
        stats.put("ads", adsStats);
        return stats;
    }

    /**
     * Article counts grouped by article_type.
     */
    public List<Map<String, Object>> getArticlesByType() throws Exception {
        String q = """
            SELECT
                a.article_type,
                COUNT(*) AS article_count,
                COUNT(CASE WHEN a.status = 'published' AND a.scheduled_for <= NOW() THEN 1 ELSE NULL END) AS published_count
            FROM articles a
            -- WHERE a.created_at >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')
            GROUP BY a.article_type
            ORDER BY article_count DESC;
        """;

        List<Map<String, Object>> summaries = new ArrayList<>();
        try (CustomRs rs = LaudiumJdbcUtil.getSelectRaw(q)) {
            while (rs.next()) {
                Map<String, Object> summary = new HashMap<>();
                summary.put("type", rs.getString("article_type"));
                summary.put("article_count", rs.getLong("article_count"));
                summary.put("published_count", rs.getLong("published_count"));
                summaries.add(summary);
            }
        }
        return summaries;
    }

    /**
     * Top categories by article count (limit 4).
     */
    public List<Map<String, Object>> getArticlesByCategory() throws Exception {
        String q = """
            SELECT c.name AS category_name, COUNT(*) AS article_count
            FROM articles a
            JOIN categories c ON a.category_id = c.id
            GROUP BY c.name
            ORDER BY article_count DESC
            LIMIT 4;
        """;

        List<Map<String, Object>> summaries = new ArrayList<>();
        try (CustomRs rs = LaudiumJdbcUtil.getSelectRaw(q)) {
            while (rs.next()) {
                Map<String, Object> summary = new HashMap<>();
                summary.put("category_name", rs.getString("category_name"));
                summary.put("article_count", rs.getLong("article_count"));
                summaries.add(summary);
            }
        }
        return summaries;
    }

    /**
     * Articles timeline, weekly (default) or monthly.
     */
    public List<Map<String, Object>> getArticlesByTimeline(String type) throws Exception {
        String q;

        if (!type.isBlank() && type.equals("monthly")) {
            q = """
                SELECT
                    DATE_FORMAT(scheduled_for, '%Y-%m') AS period,
                    DATE_FORMAT(scheduled_for, '%b %Y') AS label,
                    COUNT(*) as count
                FROM articles
                GROUP BY period, label
                ORDER BY period;
            """;
        } else {
            q = """
                SELECT
                    DATE_FORMAT(scheduled_for, '%Y-%u') AS period,
                    CONCAT(DATE_FORMAT(MIN(scheduled_for), '%b %e'), '–', DATE_FORMAT(MAX(scheduled_for), '%e')) AS label,
                    COUNT(*) as count
                FROM articles
                GROUP BY period
                ORDER BY period;
            """;
        }

        List<Map<String, Object>> summaries = new ArrayList<>();
        try (CustomRs rs = LaudiumJdbcUtil.getSelectRaw(q)) {
            while (rs.next()) {
                Map<String, Object> summary = new HashMap<>();
                summary.put("period", rs.getString("period"));
                summary.put("label", rs.getString("label"));
                summary.put("count", rs.getLong("count"));
                summaries.add(summary);
            }
        }
        return summaries;
    }

    /**
     * Ad placement analytics: article stats + active ads joined to active campaigns.
     */
    public Map<String, Object> getAdPlacementAnalytics() throws Exception {
        String q = """
            SELECT
                COUNT(*) AS total_articles,
                COUNT(CASE WHEN a.status = 'published' THEN 1 ELSE NULL END) AS published_count,
                COUNT(CASE WHEN a.status = 'draft' THEN 1 ELSE NULL END) AS draft_count
            FROM articles as a
        """;

        String q1 = """
            SELECT
                COUNT(*) as total_active_ads
            FROM ads
            JOIN campaigns AS c ON ads.campaign_id = c.id
            WHERE ads.status != 'expired'
            AND placement_date <= NOW()
            AND expiry_date >= NOW()
            AND c.status = 'active'


        """;

        Map<String, Long> articlesStats = new HashMap<>();
        try (CustomRs rs = LaudiumJdbcUtil.getSelectRaw(q)) {
            if (rs.next()) {
                articlesStats.put("total_articles", rs.getLong("total_articles"));
                articlesStats.put("total_published", rs.getLong("published_count"));
                articlesStats.put("total_draft", rs.getLong("draft_count"));
            }
        }

        Map<String, Long> adsStats = new HashMap<>();
        try (CustomRs rs2 = LaudiumJdbcUtil.getSelectRaw(q1)) {
            if (rs2.next()) {
                adsStats.put("total_ads", rs2.getLong("total_active_ads"));
            }
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("articles", articlesStats);
        stats.put("ads", adsStats);
        return stats;
    }

    /**
     * Per-ad summary with CTR.
     */
    public List<Map<String, Object>> getAdSummary() throws Exception {
        String q = """
            SELECT
              name,
              impressions,
              clicks,
              (clicks / impressions) * 100 AS ctr
            FROM ads;
        """;

        List<Map<String, Object>> stats = new ArrayList<>();
        try (CustomRs rs = LaudiumJdbcUtil.getSelectRaw(q)) {
            while (rs.next()) {
                Map<String, Object> summary = new HashMap<>();
                summary.put("ad_name", rs.getString("name"));
                summary.put("impressions", rs.getLong("impressions"));
                summary.put("clicks", rs.getLong("clicks"));
                summary.put("ctr", rs.getLong("ctr"));
                stats.add(summary);
            }
        }
        return stats;
    }

    /**
     * Top businesses by total ad spend (limit 10).
     */
    public List<Map<String, Object>> getBusinessAdSummary() throws Exception {
        String q = """
           SELECT
                b.id AS business_id,
                b.name AS business_name,
                count(a.id) as ads_count,
                SUM(p.amount_gross) AS total_spent
            FROM businesses b
            JOIN ads a ON a.business_id = b.id
            JOIN payments p ON p.id = a.payment_id
            GROUP BY b.id, b.name
            ORDER BY total_spent DESC
            LIMIT 10;
        """;

        List<Map<String, Object>> stats = new ArrayList<>();
        try (CustomRs rs = LaudiumJdbcUtil.getSelectRaw(q)) {
            while (rs.next()) {
                Map<String, Object> summary = new HashMap<>();
                summary.put("business_id", rs.getInt("business_id"));
                summary.put("business_name", rs.getString("business_name"));
                summary.put("ads_count", rs.getLong("ads_count"));
                summary.put("total_spent", rs.getDouble("total_spent"));
                stats.add(summary);
            }
        }
        return stats;
    }

    /**
     * Click-through rate aggregated by ad placement location.
     */
    public List<Map<String, Object>> getAdClickThroughRate() throws Exception {
        String q = """
            SELECT
              adp.location,
              SUM(impressions) as total_impressions,
              SUM(clicks) as total_clicks,
              (SUM(clicks) / NULLIF(SUM(impressions), 0)) * 100 as ctr
            FROM ads
            JOIN ad_placements adp ON ads.placement_id = adp.id
            GROUP BY ads.placement_id;
        """;

        List<Map<String, Object>> stats = new ArrayList<>();
        try (CustomRs rs = LaudiumJdbcUtil.getSelectRaw(q)) {
            while (rs.next()) {
                Map<String, Object> summary = new HashMap<>();
                summary.put("placement", rs.getString("location"));
                summary.put("impressions", rs.getLong("total_impressions"));
                summary.put("clicks", rs.getLong("total_clicks"));
                summary.put("ctr", rs.getLong("ctr"));
                stats.add(summary);
            }
        }
        return stats;
    }
}
