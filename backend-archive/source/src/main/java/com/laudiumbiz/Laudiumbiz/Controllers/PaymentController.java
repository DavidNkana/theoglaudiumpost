/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Controllers;

import com.google.gson.Gson;
import com.laudiumbiz.Laudiumbiz.Models.DB.Payment;
import com.laudiumbiz.Laudiumbiz.Models.DTO.PaymentRequestDTO;
import com.laudiumbiz.Laudiumbiz.Models.DTO.PaymentResponseDTO;
import com.laudiumbiz.Laudiumbiz.Services.PayFastService;
import com.laudiumbiz.Laudiumbiz.Services.PaymentService;
import com.laudiumbiz.Laudiumbiz.Utils.ErrorHandlig;
import com.laudiumbiz.Laudiumbiz.Utils.Utils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.logging.Level;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 *
 * @author issai
 */
@RestController
@RequestMapping("/api/v1/payments")
@Validated
public class PaymentController {

    Gson gson = Utils.getGson();
    private final ErrorHandlig errorHandler;
    private final PayFastService payFastService;
    private final PaymentService paymentService;
    private final ExecutorService virtualThreadExecutor;
    private static final Logger logger = LoggerFactory.getLogger(PaymentController.class);

    public PaymentController(
            @Qualifier("virtualThreadExecutor") ExecutorService virtualThreadExecutor,
            PayFastService payFastService,
            PaymentService paymentService,
            ErrorHandlig errorHandler) {
        this.virtualThreadExecutor = virtualThreadExecutor;
        this.payFastService = payFastService;
        this.paymentService = paymentService;
        this.errorHandler = errorHandler;
    }

    // Get all
    @GetMapping(path = "", produces = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String payment_status) {
        return CompletableFuture.supplyAsync(() -> {
            System.out.println("\n\nRunning in: " + Thread.currentThread() + "\n\n");
            try {
                PaymentService.PaymentPage paymentPage = paymentService.getPayments(page, size, search, status);
                java.util.List<Payment> payments = paymentPage.getPayments();
                long total = paymentPage.getTotal();

                Map<String, Object> response = new HashMap<>();
                response.put("payments", payments);
                response.put("total", total);
                response.put("page", page);
                response.put("size", size);
                response.put("totalPages", (int) Math.ceil((double) total / size));

                return ResponseEntity.ok().body(gson.toJson(response));
            } catch (Exception ex) {
                java.util.logging.Logger.getLogger(PaymentController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }

    /**
     * Create a PayFast payment request
     */
    @PostMapping("/create")
    public ResponseEntity<?> createPayment(@RequestBody PaymentRequestDTO request) {
        try {
            String paymentMethod = request.getPayment_method();
            logger.info("Creating {} payment for amount: {}", request.getPayment_method(), request.getAmount_gross());

            if (paymentMethod.equals("eft")) {
                PaymentResponseDTO paymentData = paymentService.createPaymentRequest(request);
                return ResponseEntity.ok(gson.toJson(paymentData));
            } else if (paymentMethod.equals("payfast")) {
                Map<String, String> payFastData = payFastService.createPaymentRequest(request);

                return ResponseEntity.ok(payFastData);
            } else {
                throw new Exception("Invalid Payment Method");
            }

        } catch (Exception e) {
            logger.error("Failed to create PayFast payment", e);
            return ResponseEntity.status(500)
                    .body(Map.of("message", "Failed to create payment: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updatePayment(@Valid @PathVariable Integer id, @RequestBody PaymentRequestDTO request
    ) {
        try {
            PaymentResponseDTO paymentData = paymentService.updatePaymentRequest(id, request);
            return ResponseEntity.ok(gson.toJson(paymentData));

        } catch (Exception e) {
            logger.error("Failed to create PayFast payment", e);
            return ResponseEntity.status(500)
                    .body(Map.of("message", "Failed to create payment: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePayment(@Valid @PathVariable Integer id) {
        try {
            PaymentResponseDTO paymentData = paymentService.deletePaymentRequest(id);
            return ResponseEntity.ok(gson.toJson(paymentData));
        } catch (Exception e) {
            logger.error("Failed to create PayFast payment", e);
            return ResponseEntity.status(500)
                    .body(Map.of("message", "Failed to create payment: " + e.getMessage()));
        }
    }

    /**
     * Handle PayFast ITN (Instant Transaction Notification)
     */
    @PostMapping("/notify")
    public ResponseEntity<String> handlePayFastNotification(HttpServletRequest request) {
        try {
            logger.info("Received PayFast ITN notification");

            boolean isValid = payFastService.validateNotification(request);

            if (isValid) {
                // Process the payment notification
                payFastService.processPaymentNotification(request.getParameterMap());
                logger.info("PayFast notification processed successfully");
                return ResponseEntity.ok("OK");
            } else {
                logger.warn("Invalid PayFast notification received");
                return ResponseEntity.status(403).body("INVALID");
            }
        } catch (Exception e) {
            logger.error("Failed to process PayFast notification", e);
            return ResponseEntity.status(500).body("ERROR");
        }
    }

    /**
     * Handle cancel URL
     */
    @PostMapping("/{paymentId}/cancel")
    public ResponseEntity<?> handleCancel(@PathVariable String paymentId) {
        try {
            logger.info("Processing cancel for payment ID: {}", paymentId);
            payFastService.cancelPayment(paymentId);
            return ResponseEntity.ok("Cancelled");
        } catch (Exception e) {
            logger.error("Failed to handle PayFast return", e);
            return ResponseEntity.status(500)
                    .body(Map.of("message", "Failed to process payment return: " + e.getMessage()));
        }
    }

    /**
     * Get payment status
     */
    @GetMapping("/{paymentId}/status")
    public ResponseEntity<?> getPaymentStatus(@PathVariable String paymentId) {
        try {
            PaymentResponseDTO response = payFastService.getPaymentStatus(paymentId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Failed to get payment status for ID: {}", paymentId, e);
            return ResponseEntity.status(500)
                    .body(Map.of("message", "Failed to get payment status: " + e.getMessage()));
        }
    }
}