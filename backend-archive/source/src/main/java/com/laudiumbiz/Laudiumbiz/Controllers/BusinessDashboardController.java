/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Controllers;

import com.laudiumbiz.Laudiumbiz.Models.DB.Payment;
import com.laudiumbiz.Laudiumbiz.Services.BusinessDashboardService;
import com.laudiumbiz.Laudiumbiz.Utils.ErrorHandlig;
import com.laudiumbiz.Laudiumbiz.Utils.Utils;
import com.google.gson.Gson;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.logging.Level;
import java.util.logging.Logger;

@RestController
@RequestMapping("/api/v1/business-dashboard")
@Validated
public class BusinessDashboardController {

    Gson gson = Utils.getGson();
    private final ErrorHandlig errorHandler;
    private final ExecutorService virtualThreadExecutor;
    private final BusinessDashboardService businessDashboardService;

    public BusinessDashboardController(
            @Qualifier("virtualThreadExecutor") ExecutorService virtualThreadExecutor,
            ErrorHandlig errorHandler,
            BusinessDashboardService businessDashboardService) {
        this.virtualThreadExecutor = virtualThreadExecutor;
        this.errorHandler = errorHandler;
        this.businessDashboardService = businessDashboardService;
    }

    @GetMapping(path = "/{id}/stats", produces = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> getStats(@Valid @PathVariable Integer id) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Map<String, Object> stats = businessDashboardService.getStats(id);
                return ResponseEntity.ok().body(gson.toJson(stats));
            } catch (Exception ex) {
                Logger.getLogger(BusinessDashboardController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }

    @GetMapping(path = "/{id}/recent-payments", produces = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> getRecentPayments(@Valid @PathVariable Integer id) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                List<Payment> payments = businessDashboardService.getRecentPayments(id);
                return ResponseEntity.ok().body(gson.toJson(payments));
            } catch (Exception ex) {
                Logger.getLogger(BusinessDashboardController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }

    @GetMapping(path = "/{id}/clicks-and-impressions", produces = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> getClicksAndImpressionsOverTime(@Valid @PathVariable Integer id) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                List<Map<String, Object>> results = businessDashboardService.getClicksAndImpressionsOverTime(id);
                return ResponseEntity.ok().body(gson.toJson(results));
            } catch (Exception ex) {
                Logger.getLogger(BusinessDashboardController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }

    @GetMapping(path = "/{id}/spend-over-time", produces = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> getSpendOverTime(@Valid @PathVariable Integer id) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                List<Map<String, Object>> results = businessDashboardService.getSpendOverTime(id);
                return ResponseEntity.ok().body(gson.toJson(results));
            } catch (Exception ex) {
                Logger.getLogger(BusinessDashboardController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }

    @GetMapping(path = "/{id}/spend-per-placement", produces = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> getSpendPerPlacement(@Valid @PathVariable Integer id) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                List<Map<String, Object>> results = businessDashboardService.getSpendPerPlacement(id);
                return ResponseEntity.ok().body(gson.toJson(results));
            } catch (Exception ex) {
                Logger.getLogger(BusinessDashboardController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }
}
