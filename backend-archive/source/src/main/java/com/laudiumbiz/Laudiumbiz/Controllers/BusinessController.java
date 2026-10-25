/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Controllers;

import com.laudiumbiz.Laudiumbiz.Models.DB.Ad;
import com.laudiumbiz.Laudiumbiz.Models.DB.Businesses;
import com.laudiumbiz.Laudiumbiz.Models.DB.Campaigns;
import com.laudiumbiz.Laudiumbiz.Models.BusinessDTO;
import com.laudiumbiz.Laudiumbiz.Services.BusinessService;
import com.laudiumbiz.Laudiumbiz.Utils.ErrorHandlig;
import com.laudiumbiz.Laudiumbiz.Utils.Utils;
import com.google.gson.Gson;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.laudiumbiz.Laudiumbiz.security.LauduimUserDetails;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.logging.Level;
import java.util.logging.Logger;

@RestController
@RequestMapping("/api/v1/businesses")
@Validated
public class BusinessController {

  Gson gson = Utils.getGson();
  private final ErrorHandlig errorHandler;
  private final ExecutorService virtualThreadExecutor;
  private final BusinessService businessService;

  public BusinessController(
      @Qualifier("virtualThreadExecutor") ExecutorService virtualThreadExecutor,
      ErrorHandlig errorHandler,
      BusinessService businessService
  ) {
    this.virtualThreadExecutor = virtualThreadExecutor;
    this.errorHandler = errorHandler;
    this.businessService = businessService;
  }

  @GetMapping
  public CompletableFuture<ResponseEntity<?>> getAll(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(required = false) Integer size,
      @RequestParam(required = false) String search,
      @RequestParam(required = false) Long category,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String type) {
    return CompletableFuture.supplyAsync(
        () -> {
          try {
            Map<String, Object> response = businessService.listBusinesses(page, size, search, category, status, type);
            return ResponseEntity.ok().body(gson.toJson(response));
          } catch (Exception ex) {
            Logger.getLogger(BusinessController.class.getName()).log(Level.SEVERE, null, ex);
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
            Businesses business = businessService.getBusinessById(id);
            if (business == null) {
              return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok().body(gson.toJson(business));
          } catch (Exception ex) {
            Logger.getLogger(BusinessController.class.getName()).log(Level.SEVERE, ex.getMessage(), ex);
            return errorHandler.getError(ex);
          }
        }, virtualThreadExecutor
    );
  }

  @PostMapping(path = "create", produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
  public CompletableFuture<ResponseEntity<?>> create(@Valid @RequestBody BusinessDTO dto) {
    return CompletableFuture.supplyAsync(
        () -> {
          try {
            Businesses business = businessService.createBusiness(dto);
            return ResponseEntity.status(201).body(gson.toJson(business));

          } catch (Exception ex) {
            Logger.getLogger(BusinessController.class.getName()).log(Level.SEVERE, null, ex);
            return errorHandler.getError(ex);
          }
        }, virtualThreadExecutor
    );
  }

  @PutMapping(path = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
  public CompletableFuture<ResponseEntity<?>> update(@Valid @PathVariable Integer id, @RequestBody BusinessDTO dto) {
    return CompletableFuture.supplyAsync(
        () -> {
          try {
            Businesses business = businessService.updateBusiness(id, dto);
            return ResponseEntity.ok(gson.toJson(business));
          } catch (Exception ex) {
            Logger.getLogger(BusinessController.class.getName()).log(Level.SEVERE, null, ex);
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
            businessService.deleteBusiness(id);
            return ResponseEntity.ok().body("Deleted Successfully");

          } catch (Exception ex) {
            Logger.getLogger(BusinessController.class.getName()).log(Level.SEVERE, null, ex);
            return errorHandler.getError(ex);
          }
        }, virtualThreadExecutor
    );
  }

  @GetMapping(path = "/ads", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<?> getAds(@AuthenticationPrincipal LauduimUserDetails userDetails) {
    try {
      String userEmail = userDetails.getUsername();
      List<Ad> ads = businessService.getAdsForUserEmail(userEmail);

      return ResponseEntity.ok().body(gson.toJson(ads));
    } catch (Exception ex) {
      Logger.getLogger(BusinessController.class.getName()).log(Level.SEVERE, ex.getMessage(), ex);
      return errorHandler.getError(ex);
    }
  }

  @GetMapping(path = "/campaigns", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<?> getCampaigns(@AuthenticationPrincipal LauduimUserDetails userDetails) {
    try {
      String userEmail = userDetails.getUsername();
      List<Campaigns> campaigns = businessService.getCampaignsForUserEmail(userEmail);

      return ResponseEntity.ok().body(gson.toJson(campaigns));
    } catch (Exception ex) {
      Logger.getLogger(BusinessController.class.getName()).log(Level.SEVERE, ex.getMessage(), ex);
      return errorHandler.getError(ex);
    }
  }

  @GetMapping(path = "/payments", produces = MediaType.APPLICATION_JSON_VALUE)
  public CompletableFuture<ResponseEntity<?>> getPayments(
      @RequestParam(required = true) Integer businessId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int size,
      @RequestParam(required = false) String search,
      @RequestParam(required = false) String status) {
    return CompletableFuture.supplyAsync(
        () -> {
          try {
            Map<String, Object> response = businessService.listPayments(businessId, page, size, search, status);
            return ResponseEntity.ok().body(gson.toJson(response));
          } catch (Exception ex) {
            Logger.getLogger(BusinessController.class.getName()).log(Level.SEVERE, null, ex);
            return errorHandler.getError(ex);
          }
        }, virtualThreadExecutor
    );
  }
}
