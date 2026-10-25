/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Controllers;

import com.laudiumbiz.Laudiumbiz.Models.DTO.AdPlacementRequestDTO;
import com.laudiumbiz.Laudiumbiz.Models.DTO.AdPlacementResponseDTO;
import com.laudiumbiz.Laudiumbiz.Services.AdPlacementService;
import com.laudiumbiz.Laudiumbiz.Utils.ErrorHandlig;
import com.laudiumbiz.Laudiumbiz.Utils.Utils;
import com.google.gson.Gson;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * PURPOSE: Manages advertisement placement configurations, including location, pricing, dimensions, and availability
 *
 * ENDPOINTS:
 * - GET /api/v1/ad-placements - Retrieve paginated list of ad placements with filtering
 * - GET /api/v1/ad-placements/{id} - Get ad placement details by ID
 * - POST /api/v1/ad-placements/create - Create a new ad placement with optional image
 * - PUT /api/v1/ad-placements/{id} - Update an existing ad placement
 * - DELETE /api/v1/ad-placements/{id} - Delete an ad placement and associated media
 *
 * DEPENDENCIES:
 * - AdPlacementService: Data access for ad placements and associated media
 * - ErrorHandlig: Global error handling
 * - ExecutorService: Virtual thread executor for async operations
 * - Gson: JSON serialization
 *
 * @author Imran
 */
@RestController
@RequestMapping("/api/v1/ad-placements")
@Validated
public class AdPlacementController {

    Gson gson = Utils.getGson();
    private final ErrorHandlig errorHandler;
    private final ExecutorService virtualThreadExecutor;
    private final AdPlacementService adPlacementService;

    public AdPlacementController(
            @Qualifier("virtualThreadExecutor") ExecutorService virtualThreadExecutor,
            ErrorHandlig errorHandler,
            AdPlacementService adPlacementService) {
        this.virtualThreadExecutor = virtualThreadExecutor;
        this.errorHandler = errorHandler;
        this.adPlacementService = adPlacementService;
    }

    // Get all
    @GetMapping(path = "", produces = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long category,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                AdPlacementService.AdPlacementPageResult result =
                        adPlacementService.getAll(page, size, search, category, status, type);

                long total = result.getTotal();
                List<AdPlacementResponseDTO> placements = result.getPlacements();
                Map<String, Object> response = new HashMap<>();

                response.put("placements", placements);
                response.put("total", total);
                response.put("page", page);
                response.put("size", size);
                response.put("totalPages", (int) Math.ceil((double) total / size));

                return ResponseEntity.ok().body(gson.toJson(response));
            } catch (Exception ex) {
                Logger.getLogger(AdPlacementController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }

    @GetMapping(path = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> getById(@PathVariable String id) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                AdPlacementResponseDTO placement = adPlacementService.getById(id);
                return ResponseEntity.ok().body(gson.toJson(placement));
            } catch (Exception ex) {
                Logger.getLogger(AdPlacementController.class.getName()).log(Level.SEVERE, ex.getMessage(), ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }

    @PostMapping(path = "create", produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> create(@RequestBody AdPlacementRequestDTO payload) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                AdPlacementResponseDTO placement = adPlacementService.create(payload);
                return ResponseEntity.status(201).body(gson.toJson(placement));
            } catch (Exception ex) {
                Logger.getLogger(AdPlacementController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }

    @PutMapping(path = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> update(@Valid @PathVariable Integer id,
            @RequestBody AdPlacementRequestDTO payload) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                AdPlacementResponseDTO placement = adPlacementService.update(id, payload);
                return ResponseEntity.status(201).body(gson.toJson(placement));
            } catch (Exception ex) {
                Logger.getLogger(AdPlacementController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }

    @DeleteMapping("/{id}")
    public CompletableFuture<ResponseEntity<?>> delete(@Valid @PathVariable Integer id) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Logger.getLogger(AdPlacementController.class.getName()).log(Level.SEVERE, "Id: " + id, id);
                adPlacementService.delete(id);
                return ResponseEntity.ok().body("Deleted Successfully");
            } catch (Exception ex) {
                Logger.getLogger(AdPlacementController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }
}
