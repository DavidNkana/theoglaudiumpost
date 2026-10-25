/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Controllers;

import com.laudiumbiz.Laudiumbiz.Models.CampaignDTO;
import com.laudiumbiz.Laudiumbiz.Models.DB.Campaigns;
import com.laudiumbiz.Laudiumbiz.Services.CampaignService;
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
@RequestMapping("/api/v1/campaigns")
@Validated
public class CampaignController {

    Gson gson = Utils.getGson();
    private final ErrorHandlig errorHandler;
    private final ExecutorService virtualThreadExecutor;
    private final CampaignService campaignService;

    public CampaignController(
            @Qualifier("virtualThreadExecutor") ExecutorService virtualThreadExecutor,
            ErrorHandlig errorHandler,
            CampaignService campaignService) {
        this.virtualThreadExecutor = virtualThreadExecutor;
        this.errorHandler = errorHandler;
        this.campaignService = campaignService;
    }

    @GetMapping(path = "", produces = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long category,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String payment_status,
            @RequestParam(required = false) String type) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Map<String, Object> response = campaignService.getAll(page, size, search, category, status, payment_status, type);
                return ResponseEntity.ok().body(gson.toJson(response));
            } catch (Exception ex) {
                Logger.getLogger(CampaignController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }

    @GetMapping(path = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> getById(@PathVariable String id) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Campaigns campaign = campaignService.getById(id);
                if (campaign == null) {
                    return ResponseEntity.notFound().build();
                }
                return ResponseEntity.ok().body(gson.toJson(campaign));
            } catch (Exception ex) {
                Logger.getLogger(CampaignController.class.getName()).log(Level.SEVERE, ex.getMessage(), ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }

    @PostMapping(path = "create", produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> create(@Valid @RequestBody CampaignDTO dto) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Campaigns campaign = campaignService.create(dto);
                return ResponseEntity.status(201).body(gson.toJson(campaign));

            } catch (Exception ex) {
                Logger.getLogger(CampaignController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }

    @PutMapping(path = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> update(@Valid @PathVariable Integer id, @RequestBody CampaignDTO dto) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Campaigns campaign = campaignService.update(id, dto);
                return ResponseEntity.ok().body(gson.toJson(campaign));
            } catch (Exception ex) {
                Logger.getLogger(CampaignController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }

    @DeleteMapping("/{id}")
    public CompletableFuture<ResponseEntity<?>> delete(@Valid @PathVariable Integer id) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Logger.getLogger(CampaignController.class.getName()).log(Level.SEVERE, "Id: " + id, id);
                campaignService.delete(id);
                return ResponseEntity.ok().body("Deleted Successfully");

            } catch (Exception ex) {
                Logger.getLogger(CampaignController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }
}
