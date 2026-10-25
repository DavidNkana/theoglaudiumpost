/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Services;

import com.laudiumbiz.Laudiumbiz.config.OneSignalConfiguration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

/**
 * PURPOSE: Manages push notifications to users through the OneSignal platform.
 * Handles sending notifications to all subscribed users with support for titles, messages, and URLs.
 *
 * KEY METHODS:
 * - sendNotificationToAllUsers(String title, String message, String url): Asynchronously sends push notifications to all subscribed users
 * - createNotificationPayload(String title, String message, String url): Creates the notification payload for OneSignal API
 *
 * INTEGRATIONS: OneSignal Push Notification API
 *
 * @author Imran Issa
 */
@Service
public class OneSignalService {
   
    private final OneSignalConfiguration config;
    private final RestTemplate restTemplate;

    public OneSignalService(OneSignalConfiguration config) {
        this.config = config;
        this.restTemplate = new RestTemplate();
    }

    @Async
    public CompletableFuture<Void> sendNotificationToAllUsers(String title, String message, String url) {
        try {
            String endpoint = config.getApiUrl() + "/notifications";
            
            // Create notification payload
            Map<String, Object> notification = createNotificationPayload(title, message, url);
            
            // Set headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(config.getApiKey());
            
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(notification, headers);
            
            // Send notification
            ResponseEntity<String> response = restTemplate.postForEntity(endpoint, request, String.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
//                log.info("Notification sent successfully: {}", response.getBody());
                System.out.println("Notification sent successfully: "+response.getBody());
            } else {
                System.out.println("Failed to send notification: "+response.getBody());
//                log.error("Failed to send notification. Status: {}, Body: {}", 
//                         response.getStatusCode(), response.getBody());
            }
            
        } catch (Exception e) {
            System.out.println("Error sending OneSignal notification "+ e);
//            log.error("Error sending OneSignal notification", e);
            throw new RuntimeException("Failed to send notification", e);
        }
        return CompletableFuture.completedFuture(null);
    }

//    public void sendNotificationToSpecificUsers(List<String> userIds, String title, String message, String url) {
//        try {
//            String endpoint = config.getApiUrl() + "/notifications";
//            
//            Map<String, Object> notification = createNotificationPayload(title, message, url);
//            notification.put("include_external_user_ids", userIds); // Remove "included_segments"
//            
//            HttpHeaders headers = new HttpHeaders();
//            headers.setContentType(MediaType.APPLICATION_JSON);
//            headers.setBearerAuth(config.getRestApiKey());
//            
//            HttpEntity<Map<String, Object>> request = new HttpEntity<>(notification, headers);
//            
//            ResponseEntity<String> response = restTemplate.postForEntity(endpoint, request, String.class);
//            
//            if (response.getStatusCode().is2xxSuccessful()) {
//                Log_$logger.info("Notification sent to {} users successfully", userIds.size());
//            } else {
//                log.error("Failed to send notification to specific users. Status: {}, Body: {}", 
//                         response.getStatusCode(), response.getBody());
//            }
//            
//        } catch (Exception e) {
//            log.error("Error sending targeted OneSignal notification", e);
//            throw new RuntimeException("Failed to send targeted notification", e);
//        }
//    }

    private Map<String, Object> createNotificationPayload(String title, String message, String url) {
        Map<String, Object> notification = new HashMap<>();
        
        // Basic notification data
        notification.put("app_id", config.getAppId());
//        notification.put("included_segments", List.of("Subscribed Users")); // Send to all subscribed users
        notification.put("included_segments", List.of("Total Subscriptions")); // Send to all subscribed users
        
        // Notification content
        Map<String, String> headings = new HashMap<>();
        headings.put("en", title);
        notification.put("headings", headings);
        
        Map<String, String> contents = new HashMap<>();
        contents.put("en", message);
        notification.put("contents", contents);
        
        // Optional: Add URL to open when notification is clicked
        if (url != null && !url.isEmpty()) {
            notification.put("url", url);
        }
        
        // Optional: Add custom data
        Map<String, String> data = new HashMap<>();
        data.put("type", "article");
        data.put("timestamp", String.valueOf(System.currentTimeMillis()));
        notification.put("data", data);
        
        // Optional: Add icon and image
        // notification.put("chrome_web_icon", "https://your-domain.com/icon.png");
        // notification.put("chrome_web_image", "https://your-domain.com/article-image.jpg");
        
        return notification;
    }
    
}
