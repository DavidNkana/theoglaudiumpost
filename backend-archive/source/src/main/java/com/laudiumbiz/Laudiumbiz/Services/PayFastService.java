package com.laudiumbiz.Laudiumbiz.Services;

/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
import com.laudiumbiz.Laudiumbiz.Models.DB.Ad;
import com.laudiumbiz.Laudiumbiz.Models.DB.Businesses;
import com.laudiumbiz.Laudiumbiz.Models.DB.Campaigns;
import com.laudiumbiz.Laudiumbiz.Models.DB.Media;
import com.laudiumbiz.Laudiumbiz.Models.DB.Payment;
import com.laudiumbiz.Laudiumbiz.Models.DTO.PaymentRequestDTO;
import com.laudiumbiz.Laudiumbiz.Models.DTO.PaymentResponseDTO;
import com.laudiumbiz.Laudiumbiz.Repositories.AdRepository;
import com.laudiumbiz.Laudiumbiz.Repositories.MediaRepository;
import com.laudiumbiz.Laudiumbiz.Repositories.PaymentRepository;
import com.laudiumbiz.Laudiumbiz.Utils.LaudiumJdbcUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;

import java.util.Map;
import java.util.logging.Level;
import org.springframework.beans.factory.annotation.Value;

/**
 * PURPOSE: Handles payment processing and ad creation through the PayFast payment gateway.
 * Manages the complete payment lifecycle including request creation, validation, notification processing, and ad placement.
 *
 * KEY METHODS:
 * - createPaymentRequest(PaymentRequestDTO request): Creates a PayFast payment request with signature and initializes ad placement
 * - validateNotification(HttpServletRequest request): Validates PayFast ITN (Instant Transaction Notification) callbacks
 * - processPaymentNotification(Map<String, String[]> parameterMap): Processes payment status updates and updates ad records
 * - getPaymentStatus(String paymentId): Retrieves current payment status for a given payment ID
 * - cancelPayment(String paymentId): Handles payment cancellation and updates ad status
 *
 * INTEGRATIONS: PayFast Payment Gateway API (South African payment processor)
 *
 * @author issai
 */
@Service
public class PayFastService {

    private static final Logger logger = LoggerFactory.getLogger(PayFastService.class);

    private final PaymentRepository paymentRepository;
    private final AdRepository adRepository;
    private final MediaRepository mediaRepository;

    @Value("${payfast.merchant.id}")
    private String merchantId;

    @Value("${payfast.merchant.key}")
    private String merchantKey;

    @Value("${payfast.passphrase:}")
    private String passphrase;

    @Value("${payfast.sandbox:true}")
    private boolean sandbox;

    @Value("${payfast.sandbox-url}")
    private String sandboxUrl;

    @Value("${payfast.return-url}")
    private String returnURL;

    @Value("${payfast.cancel-url}")
    private String cancelURL;

    @Value("${payfast.notify-url}")
    private String notifyURL;

    public PayFastService(PaymentRepository paymentRepository, AdRepository adRepository, MediaRepository mediaRepository) {
        this.paymentRepository = paymentRepository;
        this.adRepository = adRepository;
        this.mediaRepository = mediaRepository;
    }

    /**
     * Create PayFast payment request with signature
     */
    public Map<String, String> createPaymentRequest(PaymentRequestDTO request) {
        try {
            String paymentId = generatePaymentId();

            Map<String, String> data = new LinkedHashMap<>();
            data.put("merchant_id", merchantId);
            data.put("merchant_key", merchantKey);
            data.put("return_url", returnURL + "/" + paymentId);
            data.put("cancel_url", cancelURL + "/" + paymentId);
            data.put("notify_url", notifyURL);

            // Customer details
            if (request.getCustomer_name() != null && !request.getCustomer_name().isEmpty()) {
                String[] nameParts = request.getCustomer_name().split(" ", 2);
                data.put("name_first", nameParts[0]);
                if (nameParts.length > 1) {
                    data.put("name_last", nameParts[1]);
                }
            }

            if (request.getCustomer_email() != null && !request.getCustomer_email().isEmpty()) {
                data.put("email_address", request.getCustomer_email());
            }

            // Payment details
            data.put("m_payment_id", paymentId);
            data.put("amount", String.format("%.2f", request.getAmount_gross()));
            data.put("item_name", truncateString(request.getItem_name(), 100));
            data.put("item_description", truncateString(request.getItem_description(), 255));

            // Generate signature
            String signature = generateSignature(data);
            data.put("signature", signature);

            logger.info("Created PayFast payment request for payment ID: {}", paymentId);

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
                Integer id = ad.getId();

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

            return data;
        } catch (Exception ex) {
            java.util.logging.Logger.getLogger(PayFastService.class.getName()).log(Level.SEVERE, null, ex);
            return null;
        }
    }

    /**
     * Validate PayFast notification
     */
    public boolean validateNotification(HttpServletRequest request) {
        try {
            Map<String, String> data = new LinkedHashMap<>();
            Enumeration<String> paramNames = request.getParameterNames();

            while (paramNames.hasMoreElements()) {
                String paramName = paramNames.nextElement();
                if (!"signature".equals(paramName)) {
                    data.put(paramName, request.getParameter(paramName));
                }
            }

            String receivedSignature = request.getParameter("signature");
            String calculatedSignature = generateSignature(data);

            boolean isValid = receivedSignature != null && receivedSignature.equals(calculatedSignature);

            logger.info("PayFast notification validation result: {}", isValid);
            return isValid;

        } catch (Exception e) {
            logger.error("Error validating PayFast notification", e);
            return false;
        }
    }

    /**
     * Process PayFast ITN notification
     */
    public void processPaymentNotification(Map<String, String[]> parameterMap) {
        try {
            String paymentId = getParameterValue(parameterMap, "m_payment_id");
            String pfPaymentId = getParameterValue(parameterMap, "pf_payment_id");
            String paymentStatus = getParameterValue(parameterMap, "payment_status");
            String amountGross = getParameterValue(parameterMap, "amount_gross");
            String amountFee = getParameterValue(parameterMap, "amount_fee");
            String amountNet = getParameterValue(parameterMap, "amount_net");
            String email = getParameterValue(parameterMap, "email_address");

            logger.info("Processing payment notification for payment ID: {}, status: {}", paymentId, paymentStatus);

            // Find payment by payment_id
            Payment payment = paymentRepository.findAll().stream()
                .filter(p -> paymentId.equals(p.getPayment_id()))
                .findFirst()
                .orElseThrow(() -> new Error("Payment with ID " + paymentId + " Not Found"));

            // Update payment details
            payment.setPf_payment_id(pfPaymentId);
            payment.setStatus(paymentStatus);
            payment.setAmount_gross(parseDouble(amountGross));
            payment.setAmount_fee(parseDouble(amountFee));
            payment.setAmount_net(parseDouble(amountNet));

            // Handle different payment statuses
            switch (paymentStatus.toUpperCase()) {
                case "COMPLETE":
                    handlePaymentComplete(payment);
                    break;
                case "FAILED":
                    handlePaymentFailed(payment);
                    break;
                case "CANCELLED":
                    handlePaymentCancelled(payment);
                    break;
                default:
                    logger.warn("Unknown payment status: {}", paymentStatus);
            }

            paymentRepository.save(payment);
            logger.info("Payment notification processed successfully for payment ID: {}", paymentId);

        } catch (Exception e) {
            logger.error("Error processing payment notification", e);
            throw new RuntimeException("Failed to process payment notification", e);
        }
    }

    public void cancelPayment(String paymentId) throws Exception {

        try {
            Payment payment = paymentRepository.findAll().stream()
                .filter(p -> paymentId.equals(p.getPayment_id()))
                .findFirst()
                .orElseThrow(() -> new Error("Payment with ID: " + paymentId + " Not Found"));
            handlePaymentCancelled(payment);
            paymentRepository.save(payment);
        } catch (Exception ex) {
            java.util.logging.Logger.getLogger(PayFastService.class.getName()).log(Level.SEVERE, null, ex);
            throw ex;
        }
    }

    /**
     * Handle successful payment
     */
    private void handlePaymentComplete(Payment payment) throws Exception {
        payment.setStatus("COMPLETE");

        List<Ad> ads = adRepository.findByPaymentId(payment.getId());
        if (!ads.isEmpty()) {
            Ad ad = ads.get(0);
            ad.setStatus("pending");
            ad.setPayment_status("succesful");
            adRepository.save(ad);
        }
    }

    /**
     * Handle failed payment
     */
    private void handlePaymentFailed(Payment payment) throws Exception {
        logger.info("Processing failed payment: {}", payment.getPayment_id());

        payment.setStatus("FAILED");

        List<Ad> ads = adRepository.findByPaymentId(payment.getId());
        if (!ads.isEmpty()) {
            Ad ad = ads.get(0);
            ad.setPayment_status("failed");
            ad.setStatus("pending");
            adRepository.save(ad);
        }
    }

    /**
     * Handle cancelled payment
     */
    private void handlePaymentCancelled(Payment payment) throws Exception {
        logger.info("Processing cancelled payment: {}", payment.getPayment_id());

        payment.setStatus("CANCELLED");

        List<Ad> ads = adRepository.findByPaymentId(payment.getId());
        if (!ads.isEmpty()) {
            Ad ad = ads.get(0);
            ad.setPayment_status("cancelled");
            ad.setStatus("pending");
            adRepository.save(ad);
        }
    }

    /**
     * Get payment status
     */
    public PaymentResponseDTO getPaymentStatus(String paymentId) {

        try {
            Payment payment = paymentRepository.findAll().stream()
                .filter(p -> paymentId.equals(p.getPayment_id()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Payment not found: " + paymentId));

            PaymentResponseDTO response = new PaymentResponseDTO(payment);
            return response;
        } catch (Exception ex) {
            java.util.logging.Logger.getLogger(PayFastService.class.getName()).log(Level.SEVERE, null, ex);
            return null;
        }

    }

    /**
     * Helper method to extract parameter value from map
     */
    private String getParameterValue(Map<String, String[]> parameterMap, String key) {
        String[] values = parameterMap.get(key);
        return (values != null && values.length > 0) ? values[0] : null;
    }

    /**
     * Helper method to parse double value
     */
    private Double parseDouble(String value) {
        try {
            return value != null ? Double.parseDouble(value) : null;
        } catch (NumberFormatException e) {
            logger.warn("Failed to parse double value: {}", value);
            return null;
        }
    }

    /**
     * Generate MD5 signature for PayFast
     */
    private String generateSignature(Map<String, String> data) {
        try {
            // Build parameter string
            StringBuilder paramString = new StringBuilder();

            for (Map.Entry<String, String> entry : data.entrySet()) {
                if (paramString.length() > 0) {
                    paramString.append("&");
                }
                paramString.append(entry.getKey()).append("=")
                        .append(URLEncoder.encode(entry.getValue(), StandardCharsets.UTF_8));
            }

            // Add passphrase if configured
            if (passphrase != null && !passphrase.isEmpty()) {
                paramString.append("&passphrase=").append(URLEncoder.encode(passphrase, StandardCharsets.UTF_8));
            }

            String signature = md5Hash(paramString.toString());
            return signature;

        } catch (Exception e) {

            throw new RuntimeException("Failed to generate signature", e);
        }
    }

    /**
     * Generate unique payment ID
     */
    private String generatePaymentId() {
        return "AD_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8);
    }

    /**
     * Truncate string to specified length
     */
    private String truncateString(String str, int maxLength) {
        if (str == null) {
            return "";
        }
        return str.length() > maxLength ? str.substring(0, maxLength) : str;
    }

    /**
     * Generate MD5 hash of input string
     *
     * @param input String to hash
     * @return MD5 hash as hexadecimal string
     */
    private String md5Hash(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] hashBytes = md.digest(input.getBytes(StandardCharsets.UTF_8));

            StringBuilder hexString = new StringBuilder();
            for (byte b : hashBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }

            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("MD5 algorithm not available", e);
        }
    }
}