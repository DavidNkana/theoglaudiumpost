package com.laudiumbiz.Laudiumbiz.Services;

import com.laudiumbiz.Laudiumbiz.Models.DB.Payment;
import com.laudiumbiz.Laudiumbiz.Repositories.PaymentRepository;
import com.laudiumbiz.Laudiumbiz.Utils.CustomRs;
import com.laudiumbiz.Laudiumbiz.Utils.LaudiumJdbcUtil;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * PURPOSE: Encapsulates all data access for the Business Dashboard endpoints so
 * that BusinessDashboardController performs no repository or raw-SQL access.
 *
 * KEY METHODS:
 * - getStats(Integer id): Aggregated spend/ads/clicks/CTR stats for a business.
 * - getRecentPayments(Integer id): Up to 5 most recent payments for a business.
 * - getClicksAndImpressionsOverTime(Integer id): Daily clicks/impressions series.
 * - getSpendOverTime(Integer id): Monthly spend series.
 * - getSpendPerPlacement(Integer id): Spend grouped by ad placement.
 */
@Service
public class BusinessDashboardService {

    private final PaymentRepository paymentRepository;

    public BusinessDashboardService(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    public Map<String, Object> getStats(Integer id) throws Exception {
        String q = """
           SELECT
              (SELECT COALESCE(SUM(p.amount_gross), 0)
               FROM ads a
               JOIN payments p ON p.id= a.payment_id
               WHERE a.business_id = ?) AS total_spent,
              (SELECT COUNT(*) FROM ads WHERE business_id = ?) AS total_ads,
              (SELECT COALESCE(SUM(a.clicks), 0)
               FROM ads a WHERE a.business_id = ?) AS total_clicks,
              (SELECT
                  CASE WHEN SUM(a.impressions) > 0 THEN
                    ROUND(SUM(a.clicks) / SUM(a.impressions) * 100, 2)
                  ELSE 0 END
               FROM ads a WHERE a.business_id = ?) AS ctr
        """;

        Map<String, Object> stats = new HashMap<>();
        try (CustomRs rs = LaudiumJdbcUtil.getSelectRawPrepared(q, id.intValue(), id.intValue(), id.intValue(), id.intValue())) {
            if (rs.next()) {
                stats.put("total_spent", rs.getDouble("total_spent"));
                stats.put("total_ads", rs.getLong("total_ads"));
                stats.put("total_clicks", rs.getLong("total_clicks"));
                stats.put("ctr", rs.getDouble("ctr"));
            }
        }
        return stats;
    }

    public List<Payment> getRecentPayments(Integer id) {
        List<Payment> payments = paymentRepository.findByBusiness_id(id);
        // Return only 5 most recent
        if (payments.size() > 5) {
            payments = payments.subList(0, 5);
        }
        return payments;
    }

    public List<Map<String, Object>> getClicksAndImpressionsOverTime(Integer id) throws Exception {
        String q = """
            SELECT
                DATE(created_at) AS date,
                SUM(clicks) AS total_clicks,
                SUM(impressions) AS total_impressions
            FROM ads
            WHERE business_id = ?
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at)
        """;

        List<Map<String, Object>> results = new ArrayList<>();
        try (CustomRs rs = LaudiumJdbcUtil.getSelectRawPrepared(q, id.intValue())) {
            while (rs.next()) {
                Map<String, Object> row = new HashMap<>();
                row.put("date", rs.getString("date"));
                row.put("total_clicks", rs.getLong("total_clicks"));
                row.put("total_impressions", rs.getLong("total_impressions"));
                results.add(row);
            }
        }
        return results;
    }

    public List<Map<String, Object>> getSpendOverTime(Integer id) throws Exception {
        String q = """
            SELECT
                DATE_FORMAT(p.created_at, '%Y-%m') AS label,
                SUM(p.amount_gross) AS total_spent
            FROM ads a
            JOIN payments p ON p.id = a.payment_id
            WHERE a.business_id = ?
            GROUP BY label
            ORDER BY label
        """;

        List<Map<String, Object>> results = new ArrayList<>();
        try (CustomRs rs = LaudiumJdbcUtil.getSelectRawPrepared(q, id.intValue())) {
            while (rs.next()) {
                Map<String, Object> row = new HashMap<>();
                row.put("label", rs.getString("label"));
                row.put("total_spent", rs.getDouble("total_spent"));
                results.add(row);
            }
        }
        return results;
    }

    public List<Map<String, Object>> getSpendPerPlacement(Integer id) throws Exception {
        String q = """
            SELECT
                adp.location,
                SUM(p.amount_gross) AS total_spent
            FROM ads a
            JOIN payments p ON p.id = a.payment_id
            JOIN ad_placements adp ON adp.id = a.placement_id
            WHERE a.business_id = ?
            GROUP BY a.placement_id
            ORDER BY total_spent DESC
        """;

        List<Map<String, Object>> results = new ArrayList<>();
        try (CustomRs rs = LaudiumJdbcUtil.getSelectRawPrepared(q, id.intValue())) {
            while (rs.next()) {
                Map<String, Object> row = new HashMap<>();
                row.put("placement", rs.getString("location"));
                row.put("total_spent", rs.getDouble("total_spent"));
                results.add(row);
            }
        }
        return results;
    }
}
