/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Controllers;

import com.laudiumbiz.Laudiumbiz.Models.DB.*;
import com.laudiumbiz.Laudiumbiz.Models.DTO.AdRequestDTO;
import com.laudiumbiz.Laudiumbiz.Models.DTO.AdResponseDTO;
import com.laudiumbiz.Laudiumbiz.Services.AdService;
import com.laudiumbiz.Laudiumbiz.security.LauduimUserDetails;
import com.laudiumbiz.Laudiumbiz.Utils.ErrorHandlig;
import com.laudiumbiz.Laudiumbiz.Utils.Utils;
import com.google.gson.Gson;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.*;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.logging.Level;
import java.util.logging.Logger;

@RestController
@RequestMapping("/api/v1/ads")
@Validated
@Slf4j
public class AdController {

  Gson gson = Utils.getGson();
  private final ErrorHandlig errorHandler;
  private final ExecutorService virtualThreadExecutor;
  private final AdService adService;

  public AdController(
      @Qualifier("virtualThreadExecutor") ExecutorService virtualThreadExecutor,
      ErrorHandlig errorHandler,
      AdService adService) {
    this.virtualThreadExecutor = virtualThreadExecutor;
    this.errorHandler = errorHandler;
    this.adService = adService;
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
    return CompletableFuture.supplyAsync(
        () -> {
          try {
            Map<String, Object> response = adService.getAll(page, size, search, category, status, type);
            return ResponseEntity.ok().body(gson.toJson(response));
          } catch (Exception ex) {
            Logger.getLogger(AdController.class.getName()).log(Level.SEVERE, null, ex);
            return errorHandler.getError(ex);
          }
        }, virtualThreadExecutor
    );
  }

  @GetMapping(path = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
  public CompletableFuture<ResponseEntity<?>> getById(@PathVariable String id) {
    return CompletableFuture.supplyAsync(
        () -> {
          try {
            Ad ad = adService.getById(id);
            if (ad == null) {
              return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok().body(gson.toJson(ad));
          } catch (Exception ex) {
            Logger.getLogger(AdController.class.getName()).log(Level.SEVERE, ex.getMessage(), ex);
            return errorHandler.getError(ex);
          }
        }, virtualThreadExecutor
    );
  }

  @PostMapping(
      path = "create",
      produces = MediaType.APPLICATION_JSON_VALUE,
      consumes = MediaType.APPLICATION_JSON_VALUE
  )
  public CompletableFuture<ResponseEntity<?>> create(
      @RequestBody AdRequestDTO payload,
      @AuthenticationPrincipal LauduimUserDetails userDetails
  ) {
    return CompletableFuture.supplyAsync(
        () -> {
          try {
            AdResponseDTO dto = adService.create(payload, userDetails.getUser().getId());
            return ResponseEntity.status(201).body(gson.toJson(dto));

          } catch (Exception ex) {
            Logger.getLogger(AdController.class.getName()).log(Level.SEVERE, null, ex);
            return errorHandler.getError(ex);
          }
        }, virtualThreadExecutor
    );
  }

  @PutMapping(path = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
  public CompletableFuture<ResponseEntity<?>> update(@Valid @PathVariable Integer id,
                                                     @RequestBody AdRequestDTO payload) {
    return CompletableFuture.supplyAsync(
        () -> {
          try {
            Ad ad = adService.update(id, payload);
            return ResponseEntity.ok().body(gson.toJson(ad));

          } catch (Exception ex) {
            Logger.getLogger(AdController.class.getName()).log(Level.SEVERE, null, ex);
            return errorHandler.getError(ex);
          }
        }, virtualThreadExecutor
    );
  }

  @DeleteMapping("/{id}")
  public CompletableFuture<ResponseEntity<?>> delete(@Valid @PathVariable Integer id) {
    return CompletableFuture.supplyAsync(
        () -> {
          try {
            Logger.getLogger(AdController.class.getName()).log(Level.SEVERE, "Id: " + id, id);
            adService.delete(id);
            return ResponseEntity.ok().body("Deleted Successfully");

          } catch (Exception ex) {
            Logger.getLogger(AdController.class.getName()).log(Level.SEVERE, null, ex);
            return errorHandler.getError(ex);
          }
        }, virtualThreadExecutor
    );
  }

  @GetMapping(path = "/placement/{placement}", produces = MediaType.APPLICATION_JSON_VALUE)
  public CompletableFuture<ResponseEntity<?>> getActiveByPlacement(@PathVariable String placement) {
    return CompletableFuture.supplyAsync(
        () -> {
          if (placement.equalsIgnoreCase("main_page_ad")) {
            log.debug("Main page ad");
          }
          try {
            HashMap<String, Object> ad = adService.getActiveByPlacement(placement);
            return ResponseEntity.ok().body(gson.toJson(ad));
          } catch (Exception ex) {
            Logger.getLogger(AdController.class.getName()).log(Level.SEVERE, ex.getMessage(), ex);
            return errorHandler.getError(ex);
          }
        }, virtualThreadExecutor
    );
  }

  @PostMapping(path = "/placement/{placement}", produces = MediaType.APPLICATION_JSON_VALUE)
  public CompletableFuture<ResponseEntity<?>> getActiveByPlacementAndTags(@PathVariable String placement,
                                                                          @RequestBody List<Integer> tags) {
    return CompletableFuture.supplyAsync(
        () -> {
          try {
            HashMap<String, Object> ad = adService.getActiveByPlacementAndTags(placement, tags);
            return ResponseEntity.ok().body(gson.toJson(ad));
          } catch (Exception ex) {
            Logger.getLogger(AdController.class.getName()).log(Level.SEVERE, ex.getMessage(), ex);
            return errorHandler.getError(ex);
          }
        }, virtualThreadExecutor
    );
  }

  @GetMapping(path = "/placement/{placement}/all", produces = MediaType.APPLICATION_JSON_VALUE)
  public CompletableFuture<ResponseEntity<?>> getAllActiveByPlacement(@PathVariable String placement) {
    return CompletableFuture.supplyAsync(
        () -> {
          try {
            List<HashMap<String, Object>> ads = adService.getAllActiveByPlacement(placement);
            return ResponseEntity.ok().body(gson.toJson(ads));
          } catch (Exception ex) {
            Logger.getLogger(AdController.class.getName()).log(Level.SEVERE, ex.getMessage(), ex);
            return errorHandler.getError(ex);
          }
        }, virtualThreadExecutor
    );
  }

  @PutMapping(path = "/{id}/impression", produces = MediaType.APPLICATION_JSON_VALUE)
  public CompletableFuture<ResponseEntity<?>> incrementImpression(@Valid @PathVariable Integer id) {
    return CompletableFuture.supplyAsync(
        () -> {
          try {
            Logger.getLogger(AdController.class.getName()).log(Level.SEVERE, "Id: " + id, id);
            adService.incrementImpression(id);
            return ResponseEntity.ok().body("Incremented Successfully");

          } catch (Exception ex) {
            Logger.getLogger(AdController.class.getName()).log(Level.SEVERE, null, ex);
            return errorHandler.getError(ex);
          }
        }, virtualThreadExecutor
    );
  }

  @PutMapping(path = "/{id}/click", produces = MediaType.APPLICATION_JSON_VALUE)
  public CompletableFuture<ResponseEntity<?>> incrementClicks(@Valid @PathVariable Integer id) {
    return CompletableFuture.supplyAsync(
        () -> {
          try {
            Logger.getLogger(AdController.class.getName()).log(Level.SEVERE, "Id: " + id, id);
            adService.incrementClicks(id);
            return ResponseEntity.ok().body("Incremented Clicks Successfully");

          } catch (Exception ex) {
            Logger.getLogger(AdController.class.getName()).log(Level.SEVERE, null, ex);
            return errorHandler.getError(ex);
          }
        }, virtualThreadExecutor
    );
  }

  @GetMapping(path = "/placements", produces = MediaType.APPLICATION_JSON_VALUE)
  public CompletableFuture<ResponseEntity<?>> getPlacements() {
    return CompletableFuture.supplyAsync(
        () -> {
          try {
            List<Map<String, Object>> placements = adService.getPlacements();
            return ResponseEntity.ok().body(gson.toJson(placements));
          } catch (Exception ex) {
            Logger.getLogger(AdController.class.getName()).log(Level.SEVERE, ex.getMessage(), ex);
            return errorHandler.getError(ex);
          }
        }, virtualThreadExecutor
    );
  }

  @GetMapping(path = "/by-category/{categoryId}", produces = MediaType.APPLICATION_JSON_VALUE)
  public CompletableFuture<ResponseEntity<?>> getByCategory(@PathVariable Long categoryId) {
    return CompletableFuture.supplyAsync(
        () -> {
          try {
            List<HashMap<String, Object>> ads = adService.getByCategory(categoryId);
            return ResponseEntity.ok().body(gson.toJson(ads));
          } catch (Exception ex) {
            Logger.getLogger(AdController.class.getName()).log(Level.SEVERE, ex.getMessage(), ex);
            return errorHandler.getError(ex);
          }
        }, virtualThreadExecutor
    );
  }

  @GetMapping(path = "/stats", produces = MediaType.APPLICATION_JSON_VALUE)
  public CompletableFuture<ResponseEntity<?>> getStats() {
    return CompletableFuture.supplyAsync(
        () -> {
          try {
            HashMap<String, Object> stats = adService.getStats();
            return ResponseEntity.ok().body(gson.toJson(stats));
          } catch (Exception ex) {
            Logger.getLogger(AdController.class.getName()).log(Level.SEVERE, ex.getMessage(), ex);
            return errorHandler.getError(ex);
          }
        }, virtualThreadExecutor
    );
  }

  @GetMapping(path = "/by-campaign/{campaignId}", produces = MediaType.APPLICATION_JSON_VALUE)
  public CompletableFuture<ResponseEntity<?>> getByCampaign(@PathVariable Integer campaignId) {
    return CompletableFuture.supplyAsync(
        () -> {
          try {
            List<HashMap<String, Object>> ads = adService.getByCampaign(campaignId);
            return ResponseEntity.ok().body(gson.toJson(ads));
          } catch (Exception ex) {
            Logger.getLogger(AdController.class.getName()).log(Level.SEVERE, ex.getMessage(), ex);
            return errorHandler.getError(ex);
          }
        }, virtualThreadExecutor
    );
  }
}
