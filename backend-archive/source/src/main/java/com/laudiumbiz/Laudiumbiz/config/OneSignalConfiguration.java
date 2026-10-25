/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.config;

import lombok.Data;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 *
 * @author Imran
 */

@Configuration
@ConfigurationProperties(prefix = "onesignal")
@Data
public class OneSignalConfiguration {
     @Value("${onesignal.app-id}")
    private String appId;

    @Value("${onesignal.api-key}")
    private String apiKey;
    
    @Value("${onesignal.api.url:https://onesignal.com/api/v1}")
    private String apiUrl;
}
