package com.laudiumbiz.Laudiumbiz.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.AsyncSupportConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Configuration for asynchronous request processing
 * Sets the timeout for async requests to 3 minutes (180000 milliseconds)
 */
@Configuration
public class AsyncConfig implements WebMvcConfigurer {

    @Override
    public void configureAsyncSupport(AsyncSupportConfigurer configurer) {
        // Set timeout to 3 minutes (180000 milliseconds)
        configurer.setDefaultTimeout(180000);
    }
}