/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Controllers;

import com.google.gson.Gson;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.laudiumbiz.Laudiumbiz.Utils.ErrorHandlig;
import com.laudiumbiz.Laudiumbiz.Utils.Utils;
import com.laudiumbiz.Laudiumbiz.Services.DashboardService;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RequestParam;

/**
 *
 * @author Imran
 */
@RestController
@RequestMapping("/api/v1/dashboard")
@Validated
public class DashboardController {

    Gson gson = Utils.getGson();
    private final ErrorHandlig errorHandler;
    private final DashboardService dashboardService;

    private final ExecutorService virtualThreadExecutor;

    public DashboardController(
            @Qualifier("virtualThreadExecutor") ExecutorService virtualThreadExecutor,
            ErrorHandlig errorHandler,
            DashboardService dashboardService) {
        this.virtualThreadExecutor = virtualThreadExecutor;
        this.errorHandler = errorHandler;
        this.dashboardService = dashboardService;
    }

    @GetMapping(path = "/stats", produces = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> getStats() {
        return CompletableFuture.supplyAsync(() -> {
            try {
                return ResponseEntity.ok().body(gson.toJson(dashboardService.getStats()));
            } catch (Exception ex) {
                Logger.getLogger(DashboardController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }

    @GetMapping(path = "/articles-by-type", produces = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> getArticlesByType() {
        return CompletableFuture.supplyAsync(() -> {
            try {
                return ResponseEntity.ok().body(gson.toJson(dashboardService.getArticlesByType()));
            } catch (Exception ex) {
                Logger.getLogger(DashboardController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }

    @GetMapping(path = "/articles-by-category", produces = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> getArticlesByCategory() {
        return CompletableFuture.supplyAsync(() -> {
            try {
                return ResponseEntity.ok().body(gson.toJson(dashboardService.getArticlesByCategory()));
            } catch (Exception ex) {
                Logger.getLogger(DashboardController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }

    @GetMapping(path = "/articles-timeline", produces = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> getArticlesByTimeline(
     @RequestParam(defaultValue = "weekly") String type
    ) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                return ResponseEntity.ok().body(gson.toJson(dashboardService.getArticlesByTimeline(type)));
            } catch (Exception ex) {
                Logger.getLogger(DashboardController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }


    @GetMapping(path = "/ad-placement-analytics", produces = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> getAdPlacementAnalytics() {
        return CompletableFuture.supplyAsync(() -> {
            try {
                return ResponseEntity.ok().body(gson.toJson(dashboardService.getAdPlacementAnalytics()));
            } catch (Exception ex) {
                Logger.getLogger(DashboardController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }

    @GetMapping(path = "/ads-summary", produces = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> getAdSummary() {
        return CompletableFuture.supplyAsync(() -> {
            try {
                return ResponseEntity.ok().body(gson.toJson(dashboardService.getAdSummary()));
            } catch (Exception ex) {
                Logger.getLogger(DashboardController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }


    @GetMapping(path = "/business-ad-summary", produces = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> getBusinessAdSummary() {
        return CompletableFuture.supplyAsync(() -> {
            try {
                return ResponseEntity.ok().body(gson.toJson(dashboardService.getBusinessAdSummary()));
            } catch (Exception ex) {
                Logger.getLogger(DashboardController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }


    @GetMapping(path = "/ads-placement-ctr", produces = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> getAdClickThroughRate() {
        return CompletableFuture.supplyAsync(() -> {
            try {
                return ResponseEntity.ok().body(gson.toJson(dashboardService.getAdClickThroughRate()));
            } catch (Exception ex) {
                Logger.getLogger(DashboardController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }
}
