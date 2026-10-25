/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.config;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.concurrent.DelegatingSecurityContextExecutor;
import org.springframework.security.concurrent.DelegatingSecurityContextExecutorService;

/**
 *
 * @author Imran
 */

@Configuration
public class ExecutorConfig {
  @Bean (name = "virtualThreadExecutor")
  public ExecutorService virtualThreadExecutor() {
    return new DelegatingSecurityContextExecutorService(
        Executors.newVirtualThreadPerTaskExecutor()
    );
  }
}
