/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.util.StreamUtils;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;

/**
 * Swagger configuration for API documentation
 * Uses the api.yml file in the root directory
 * 
 * @author Imran
 */
@Configuration
@OpenAPIDefinition
public class SwaggerConfig implements WebMvcConfigurer {

    @Bean
    public OpenAPI customOpenAPI() throws IOException {
        // Create a programmatic OpenAPI definition
        return new OpenAPI()
            .info(new Info()
                .title("Laudium Biz API")
                .description("API documentation for Laudium Biz application")
                .version("1.0.0"))
            .addServersItem(new Server().url("/laudium/api/v1").description("Base API path"));
    }
}
