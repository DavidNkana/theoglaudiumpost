package com.laudiumbiz.Laudiumbiz.Services;

import com.laudiumbiz.Laudiumbiz.Models.CampaignDTO;
import com.laudiumbiz.Laudiumbiz.Models.DB.Campaigns;
import com.laudiumbiz.Laudiumbiz.Repositories.CampaignsRepository;
import com.laudiumbiz.Laudiumbiz.Utils.CustomRs;
import com.laudiumbiz.Laudiumbiz.Utils.LaudiumJdbcUtil;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service holding all data-access logic for campaign endpoints.
 *
 * All repository usage and raw-SQL (LaudiumJdbcUtil) access for the
 * CampaignController lives here so the controller performs no data access.
 */
@Service
public class CampaignService {

    private final CampaignsRepository campaignsRepository;

    public CampaignService(CampaignsRepository campaignsRepository) {
        this.campaignsRepository = campaignsRepository;
    }

    /**
     * Paginated, filtered campaign listing built via raw SQL.
     * Returns the response payload map (campaigns, total, page, size, totalPages)
     * with the SQL and parameters identical to the original controller logic.
     */
    public Map<String, Object> getAll(int page, int size, String search, Long category,
            String status, String payment_status, String type) throws Exception {
        int offset = page * size;
        StringBuilder q = new StringBuilder("SELECT * FROM campaigns WHERE is_deleted != 1");
        List<Object> params = new ArrayList<>();

        if (status != null && !status.isBlank()) {
            q.append(" AND status = ?");
            params.add(status);
        }

        if (payment_status != null && !payment_status.isBlank()) {
            q.append(" AND payment_status = ?");
            params.add(payment_status);
        }

        if (search != null && !search.isBlank()) {
            q.append(" AND name LIKE ?");
            params.add("%" + search + "%");
        }

        String countQ = q.toString().replace("SELECT *", "SELECT COUNT(*)");
        long total = 0;
        try (CustomRs countRs = LaudiumJdbcUtil.getSelectRawPrepared(countQ, params.toArray())) {
            if (countRs.next()) {
                total = countRs.getLong("COUNT(*)");
            }
        }

        q.append(" ORDER BY created_at DESC LIMIT ? OFFSET ?");
        params.add(size);
        params.add(offset);

        List<Campaigns> campaigns = new ArrayList<>();
        try (CustomRs rs = LaudiumJdbcUtil.getSelectRawPrepared(q.toString(), params.toArray())) {
            while (rs.next()) {
                Campaigns c = new Campaigns();
                c.setId(rs.getInt("id"));
                c.setName(rs.getString("name"));
                c.setBusiness_id(rs.getInt("business_id"));
                c.setStatus(rs.getString("status"));
                c.setPayment_status(rs.getString("payment_status"));
                c.setIs_recurring(rs.getBoolean("is_recurring"));
                c.setStart_date(rs.getLocalDateTime("start_date"));
                c.setEnd_date(rs.getLocalDateTime("end_date"));
                campaigns.add(c);
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("campaigns", campaigns);
        response.put("total", total);
        response.put("page", page);
        response.put("size", size);
        response.put("totalPages", (int) Math.ceil((double) total / size));

        return response;
    }

    /**
     * Fetch a single campaign by id, or null if not found.
     */
    public Campaigns getById(String id) {
        return campaignsRepository.findById(Integer.valueOf(id)).orElse(null);
    }

    /**
     * Create and persist a campaign from the supplied DTO.
     */
    public Campaigns create(CampaignDTO dto) {
        Campaigns campaign = new Campaigns();
        campaign.setName(dto.getName());
        campaign.setBusiness_id(dto.getBusinessId());
        campaign.setIs_recurring(dto.getIsRecurring());
        campaign.setPayment_status(dto.getPaymentStatus().name());
        campaign.setStatus(dto.getStatus().name());
        campaign.setTransaction_ref(dto.getTransactionRef());
        campaign.setStart_date(dto.getStartDate());
        campaign.setEnd_date(dto.getEndDate());
        return campaignsRepository.save(campaign);
    }

    /**
     * Update an existing campaign from the supplied DTO.
     * Throws if the campaign does not exist (behavior preserved from controller).
     */
    public Campaigns update(Integer id, CampaignDTO dto) throws Exception {
        Campaigns campaign = campaignsRepository.findById(id).orElseThrow(() -> new Exception("Campaign not found"));
        campaign.setName(dto.getName());
        campaign.setBusiness_id(dto.getBusinessId());
        campaign.setIs_recurring(dto.getIsRecurring());
        campaign.setPayment_status(dto.getPaymentStatus().name());
        campaign.setStatus(dto.getStatus().name());
        campaign.setTransaction_ref(dto.getTransactionRef());
        campaign.setStart_date(dto.getStartDate());
        campaign.setEnd_date(dto.getEndDate());
        campaign.setIs_deleted(dto.getIsDeleted());
        campaignsRepository.save(campaign);
        return campaign;
    }

    /**
     * Soft-delete a campaign by id.
     * Throws if the campaign does not exist (behavior preserved from controller).
     */
    public void delete(Integer id) throws Exception {
        Campaigns campaign = campaignsRepository.findById(id).orElseThrow(() -> new Exception("Campaign not found"));
        campaign.setIs_deleted(true);
        campaignsRepository.save(campaign);
    }
}
