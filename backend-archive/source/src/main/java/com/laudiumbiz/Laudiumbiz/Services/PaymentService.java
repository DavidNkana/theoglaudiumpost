package com.laudiumbiz.Laudiumbiz.Services;

import com.google.gson.Gson;
import com.laudiumbiz.Laudiumbiz.Models.DB.Ad;
import com.laudiumbiz.Laudiumbiz.Models.DB.Media;
import com.laudiumbiz.Laudiumbiz.Models.DB.Payment;
import com.laudiumbiz.Laudiumbiz.Models.DTO.PaymentRequestDTO;
import com.laudiumbiz.Laudiumbiz.Models.DTO.PaymentResponseDTO;
import com.laudiumbiz.Laudiumbiz.Repositories.AdRepository;
import com.laudiumbiz.Laudiumbiz.Repositories.MediaRepository;
import com.laudiumbiz.Laudiumbiz.Repositories.PaymentRepository;
import com.laudiumbiz.Laudiumbiz.Utils.CustomRs;
import com.laudiumbiz.Laudiumbiz.Utils.LaudiumJdbcUtil;
import com.laudiumbiz.Laudiumbiz.Utils.Utils;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Data-access service for payments.
 *
 * Owns all repository usage and raw-SQL (LaudiumJdbcUtil) access for payments,
 * so PaymentController performs no data access. Also owns the payment-initiated
 * ad/media provisioning that previously lived in the PaymentLogic helper — that
 * helper was instantiated with {@code new PaymentLogic()} in the controller, so
 * its {@code @Autowired} repositories were never injected (always null) and the
 * create/update/delete paths silently failed. As a constructor-injected Spring
 * service the repositories are now real, so the logic actually executes.
 *
 * @author issai
 */
@Service
public class PaymentService {

    private final Gson gson = Utils.getGson();
    private static final Logger logger = LoggerFactory.getLogger(PaymentService.class);

    private final PaymentRepository paymentRepository;
    private final AdRepository adRepository;
    private final MediaRepository mediaRepository;

    public PaymentService(
            PaymentRepository paymentRepository,
            AdRepository adRepository,
            MediaRepository mediaRepository) {
        this.paymentRepository = paymentRepository;
        this.adRepository = adRepository;
        this.mediaRepository = mediaRepository;
    }

    /**
     * Typed result of a paginated payments lookup. Holds the rows for the
     * requested page plus the total row count matching the filters.
     */
    public static class PaymentPage {

        private final List<Payment> payments;
        private final long total;

        public PaymentPage(List<Payment> payments, long total) {
            this.payments = payments;
            this.total = total;
        }

        public List<Payment> getPayments() {
            return payments;
        }

        public long getTotal() {
            return total;
        }
    }

    /**
     * Fetch a page of payments, optionally filtered by status and a payment_id
     * search term. Behavior (SQL, bound parameters, ordering, paging) is
     * identical to the logic that previously lived in PaymentController.getAll.
     */
    public PaymentPage getPayments(int page, int size, String search, String status) throws Exception {
        int offset = page * size;

        // Parameterized query — user input is bound via placeholders, never
        // concatenated into SQL (prevents SQL injection on status/search).
        StringBuilder q = new StringBuilder("SELECT * FROM payments");
        java.util.List<Object> params = new java.util.ArrayList<>();
        java.util.List<String> conditions = new java.util.ArrayList<>();
        if (status != null && !status.isBlank()) {
            conditions.add("status = ?");
            params.add(status);
        }
        if (search != null && !search.isBlank()) {
            conditions.add("payment_id LIKE ?");
            params.add("%" + search + "%");
        }
        if (!conditions.isEmpty()) {
            q.append(" WHERE ").append(String.join(" AND ", conditions));
        }
        q.append(" ORDER BY created_at DESC LIMIT ? OFFSET ?");
        params.add(size);
        params.add(offset);
        Object[] args = params.toArray();

        long total = 0;
        try (CustomRs countRs = LaudiumJdbcUtil.getSelectRawPrepared(q.toString(), args)) {
            if (countRs.next()) {
                total = countRs.resultSize();
            }
        }

        // Re-run query to get actual data
        java.util.List<Payment> payments = new java.util.ArrayList<>();
        try (CustomRs rs = LaudiumJdbcUtil.getSelectRawPrepared(q.toString(), args)) {
            while (rs.next()) {
                Payment p = new Payment();
                p.setId(rs.getInt("id"));
                p.setPayment_id(rs.getString("payment_id"));
                p.setPf_payment_id(rs.getString("pf_payment_id"));
                p.setUser_id(rs.getInt("user_id"));
                p.setBusiness_id(rs.getInt("business_id"));
                p.setStatus(rs.getString("status"));
                p.setAmount_gross(rs.getDouble("amount_gross"));
                p.setAmount_fee(rs.getDouble("amount_fee"));
                p.setAmount_net(rs.getDouble("amount_net"));
                p.setCurrency(rs.getString("currency"));
                p.setItem_name(rs.getString("item_name"));
                p.setItem_description(rs.getString("item_description"));
                p.setCustomer_email(rs.getString("customer_email"));
                p.setCustomer_name(rs.getString("customer_name"));
                p.setPayment_method(rs.getString("payment_method"));
                p.setEft_reference(rs.getString("eft_reference"));
                p.setEft_amount(rs.getDouble("eft_amount"));
                p.setCreated_at(rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toLocalDateTime() : null);
                p.setUpdated_at(rs.getTimestamp("updated_at") != null ? rs.getTimestamp("updated_at").toLocalDateTime() : null);
                payments.add(p);
            }
        }

        return new PaymentPage(payments, total);
    }

    /**
     * Create a payment and provision its associated ad (and any image media).
     * Logic is preserved verbatim from the former PaymentLogic.createPaymentRequest;
     * the only change is that the repositories are now genuinely injected (so the
     * saves actually run) and the debug print uses the logger instead of System.out.
     */
    public PaymentResponseDTO createPaymentRequest(PaymentRequestDTO request) {
        try {
            String paymentId = generatePaymentId();

            Payment payment = new Payment();
            payment.setPayment_id(paymentId);
            payment.setUser_id(request.getUser_id());
            payment.setBusiness_id(request.getBusiness_id());
            payment.setStatus(request.getStatus());
            payment.setAmount_gross(request.getAmount_gross());
            payment.setAmount_fee(request.getAmount_fee());
            payment.setAmount_net(request.getAmount_net());
            payment.setStatus(request.getStatus());
            payment.setItem_name(request.getItem_name());
            payment.setItem_description(request.getItem_description());
            payment.setCustomer_email(request.getCustomer_email());
            payment.setCustomer_name(request.getCustomer_name());
            payment.setPayment_method(request.getPayment_method());
            payment.setEft_reference(request.getEft_reference());
            payment.setEft_amount(request.getEft_amount());
            payment = paymentRepository.save(payment);

            Ad ad = new Ad();
            ad.setTitle(payment.getItem_name());
            ad.setDescription(payment.getItem_description());
            ad.setPlacement_id(request.getPlacement_id());
            ad.setPayment_id(payment.getId());
            ad.setBusiness_id(request.getBusiness_id());
            ad.setPlacement_info(request.getPlacement_info());
            ad.setTotal_cost(payment.getAmount_gross());
            ad.setImage_url(null);
            ad.setVideo_url(null);
            ad.setClick_url(request.getClick_url());
            ad.setStatus("pending");
            ad.setPayment_status("pending");
            ad.setPlacement_date(request.getStart_date());
            ad.setExpiry_date(request.getEnd_date());
            ad.setDesign_ad(request.getDesign_help());

            logger.info("Ad: {}", gson.toJson(ad));

            List<String> images = request.getImages();

            if (images.isEmpty()) {
                String imageBase64 = request.getImage();

                Integer imageId = null;

                // Handle cover image
                if (imageBase64 != null && !imageBase64.isBlank()) {
                    Media media = new Media();
                    media.setFile(imageBase64);
                    media = mediaRepository.save(media);
                    imageId = media.getId();
                }
                if (imageId != null) {
                    ad.setImage_id(imageId);
                }
                ad = adRepository.save(ad);
            } else {
                ad = adRepository.save(ad);
                var id = ad.getId();

                if (id != null) {
                    List<Integer> imageIds = new ArrayList<>();

                    for (String imageBase64 : images) {
                        if (imageBase64 != null && !imageBase64.isBlank()) {
                            Media media = new Media();
                            media.setFile(imageBase64);
                            media = mediaRepository.save(media);
                            var imageId = media.getId();
                            logger.info("\n\nImage ID: {}, AD ID: {}", imageId, ad.getId());

                            if (imageId != null) {
                                imageIds.add(imageId);
                            }
                        }
                    }

                    // Save image IDs to ad_images table
                    LaudiumJdbcUtil.getInsertRawPrepared("DELETE FROM ad_images WHERE ad_id = ?", id);

                    for (Integer imageId : imageIds) {
                        String insertSql = "INSERT INTO ad_images (ad_id, image_id) VALUES (?, ?)";
                        LaudiumJdbcUtil.getInsertRawPrepared(insertSql, id, imageId);
                    }
                }

            }

            return new PaymentResponseDTO(payment);
        } catch (Exception ex) {
            logger.error(ex.getMessage());
            return null;
        }
    }

    /**
     * Update an existing payment. Preserved verbatim from
     * PaymentLogic.updatePaymentRequest (now with a real, injected repository).
     */
    public PaymentResponseDTO updatePaymentRequest(Integer id, PaymentRequestDTO request) {
        try {
            Payment payment = paymentRepository.findById(id).orElse(null);
            if (payment == null) {
                throw new Exception("Payment Not Found");
            }
            payment.setBusiness_id(request.getBusiness_id());
            payment.setStatus(request.getStatus());
            payment.setAmount_gross(request.getAmount_gross());
            payment.setAmount_fee(request.getAmount_fee());
            payment.setAmount_net(request.getAmount_net());
            payment.setStatus(request.getStatus());
            payment.setItem_name(request.getItem_name());
            payment.setItem_description(request.getItem_description());
            payment.setCustomer_email(request.getCustomer_email());
            payment.setCustomer_name(request.getCustomer_name());
            payment.setPayment_method(request.getPayment_method());
            payment.setEft_reference(request.getEft_reference());
            payment.setEft_amount(request.getEft_amount());
            payment.setPf_payment_id(request.getPf_payment_id());
            payment.setCreated_at(request.getDate());
            payment = paymentRepository.save(payment);

            return new PaymentResponseDTO(payment);
        } catch (Exception ex) {
            logger.error(ex.getMessage());
            return null;
        }
    }

    /**
     * Soft-delete a payment by setting its status to DELETED. Preserved verbatim
     * from PaymentLogic.deletePaymentRequest (now with a real, injected repository).
     */
    public PaymentResponseDTO deletePaymentRequest(Integer id) {
        try {
            Payment payment = paymentRepository.findById(id).orElse(null);
            if (payment == null) {
                throw new Exception("Payment Not Found");
            }
            payment.setStatus("DELETED");
            payment = paymentRepository.save(payment);

            return new PaymentResponseDTO(payment);
        } catch (Exception ex) {
            logger.error(ex.getMessage());
            return null;
        }
    }

    /**
     * Generate unique payment ID.
     */
    private String generatePaymentId() {
        return "AD_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8);
    }
}
