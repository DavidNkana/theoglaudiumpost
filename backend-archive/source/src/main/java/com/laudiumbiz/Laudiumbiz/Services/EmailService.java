package com.laudiumbiz.Laudiumbiz.Services;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * PURPOSE: Provides email notification services for the application.
 * Handles sending simple text emails and bulk operation summaries to users.
 *
 * KEY METHODS:
 * - sendSimpleMail(String to, String subject, String body): Sends a simple text email to a recipient
 * - sendBulkSummary(String to, String provider, int totalRequested, int totalSuccess, List<Integer> failedIds): Sends bulk article generation summary emails
 *
 * INTEGRATIONS: Spring JavaMailSender (SMTP email service)
 */
@Service
public class EmailService {

    private static final Logger logger = Logger.getLogger(EmailService.class.getName());

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendSimpleMail(String to, String subject, String body) {
        if (to == null || to.isBlank()) {
            logger.info("[EmailService] No recipient email provided; skipping send.");
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            logger.info("[EmailService] Email sent to: " + to);
        } catch (Exception ex) {
            logger.log(Level.WARNING, "[EmailService] Failed to send email: " + ex.getMessage(), ex);
        }
    }

    public void sendBulkSummary(String to, String provider, int totalRequested, int totalSuccess, List<Integer> failedIds) {
        String prov = (provider == null || provider.isBlank()) ? "provider" : provider;
        int failed = totalRequested - totalSuccess;
        String subject = "Bulk article generation completed (" + prov + ")";
        StringBuilder sb = new StringBuilder();
        sb.append("Your bulk article generation job has finished.\n\n");
        sb.append("Provider: ").append(prov).append("\n");
        sb.append("Total requested: ").append(totalRequested).append("\n");
        sb.append("Succeeded: ").append(totalSuccess).append("\n");
        sb.append("Failed: ").append(failed).append("\n");
        if (failed > 0 && failedIds != null && !failedIds.isEmpty()) {
            sb.append("Failed IDs: ").append(failedIds).append("\n");
        }
        sb.append("\nThank you,\nLaudium Biz");
        sendSimpleMail(to, subject, sb.toString());
    }
}
