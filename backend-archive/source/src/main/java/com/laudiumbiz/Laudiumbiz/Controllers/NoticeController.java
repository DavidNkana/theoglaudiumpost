/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Controllers;

import com.laudiumbiz.Laudiumbiz.Models.DB.Announcement;
import com.laudiumbiz.Laudiumbiz.Models.DB.AnnouncementCategory;
import com.laudiumbiz.Laudiumbiz.Models.DTO.AnnouncementCategoryRequestDTO;
import com.laudiumbiz.Laudiumbiz.Models.DTO.AnnouncementRequestDTO;
import com.laudiumbiz.Laudiumbiz.Models.DTO.AnnouncementResponseDTO;
import com.laudiumbiz.Laudiumbiz.Services.NoticeService;
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
@RequestMapping("/api/v1/notices")
@Validated
public class NoticeController {

    Gson gson = Utils.getGson();
    private final ErrorHandlig errorHandler;
    private final ExecutorService virtualThreadExecutor;
    private final NoticeService noticeService;

    public NoticeController(
            @Qualifier("virtualThreadExecutor") ExecutorService virtualThreadExecutor,
            ErrorHandlig errorHandler,
            NoticeService noticeService) {
        this.virtualThreadExecutor = virtualThreadExecutor;
        this.errorHandler = errorHandler;
        this.noticeService = noticeService;
    }

    @GetMapping(path = "", produces = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long category,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(defaultValue = "true") Boolean exludeFunerals
    ) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Map<String, Object> response = noticeService.getAll(page, size, search, category, status, priority, exludeFunerals);
                return ResponseEntity.ok().body(gson.toJson(response));
            } catch (Exception ex) {
                Logger.getLogger(NoticeController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }

    @GetMapping(path = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> getById(@PathVariable String id) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                AnnouncementResponseDTO announcement = noticeService.getById(id);
                if (announcement == null) {
                    return ResponseEntity.notFound().build();
                }
                return ResponseEntity.ok().body(gson.toJson(announcement));
            } catch (Exception ex) {
                Logger.getLogger(NoticeController.class.getName()).log(Level.SEVERE, ex.getMessage(), ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }

    @GetMapping(path = "/slug/{slug}", produces = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> getBySlug(@PathVariable String slug) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                AnnouncementResponseDTO announcement = noticeService.getBySlug(slug);
                return ResponseEntity.ok().body(gson.toJson(announcement));
            } catch (Exception ex) {
                Logger.getLogger(NoticeController.class.getName()).log(Level.SEVERE, ex.getMessage(), ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }

    @PostMapping(path = "create", produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> create(@RequestBody AnnouncementRequestDTO payload) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Announcement announcement = noticeService.create(payload);
                return ResponseEntity.status(201).body(gson.toJson(announcement));
            } catch (Exception ex) {
                Logger.getLogger(NoticeController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }

    @PutMapping(path = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> update(@Valid @PathVariable Integer id,
            @RequestBody AnnouncementRequestDTO payload) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Announcement announcement = noticeService.update(id, payload);
                return ResponseEntity.ok().body(gson.toJson(announcement));
            } catch (Exception ex) {
                Logger.getLogger(NoticeController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }

    @PutMapping(path = "/{id}/change-status", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> updateStatus(@Valid @PathVariable Integer id,
            @RequestBody AnnouncementRequestDTO payload) {
        try {
            Announcement announcement = noticeService.updateStatus(id, payload);
            return ResponseEntity.ok().body(gson.toJson(announcement));
        } catch (Exception ex) {
            Logger.getLogger(NoticeController.class.getName()).log(Level.SEVERE, ex.getMessage(), ex);
            return errorHandler.getError(ex);
        }
    }

    @DeleteMapping("/{id}")
    public CompletableFuture<ResponseEntity<?>> delete(@Valid @PathVariable Integer id) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Logger.getLogger(NoticeController.class.getName()).log(Level.SEVERE, "Id: " + id, id);
                noticeService.delete(id);
                return ResponseEntity.ok().body("Deleted Successfully");
            } catch (Exception ex) {
                Logger.getLogger(NoticeController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }

    @GetMapping(path = "/categories", produces = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> getCategories(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean status
    ) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Map<String, Object> response = noticeService.getCategories(page, size, search, status);
                return ResponseEntity.ok().body(gson.toJson(response));
            } catch (Exception ex) {
                Logger.getLogger(NoticeController.class.getName()).log(Level.SEVERE, ex.getMessage(), ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }

    @PostMapping(path = "/categories", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> createCategory(@RequestBody AnnouncementCategoryRequestDTO payload) {
        try {
            AnnouncementCategory category = noticeService.createCategory(payload);
            return ResponseEntity.ok().body(gson.toJson(category));
        } catch (Exception ex) {
            Logger.getLogger(NoticeController.class.getName()).log(Level.SEVERE, ex.getMessage(), ex);
            return errorHandler.getError(ex);
        }
    }

    @PutMapping(path = "/categories/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> updateCategory(@Valid @PathVariable Integer id,
            @RequestBody AnnouncementCategoryRequestDTO payload) {
        try {
            AnnouncementCategory category = noticeService.updateCategory(id, payload);
            return ResponseEntity.ok().body(gson.toJson(category));
        } catch (Exception ex) {
            Logger.getLogger(NoticeController.class.getName()).log(Level.SEVERE, ex.getMessage(), ex);
            return errorHandler.getError(ex);
        }
    }

    @PutMapping(path = "/categories/{id}/change-status", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> updateCategoryStatus(@Valid @PathVariable Integer id,
            @RequestBody AnnouncementCategoryRequestDTO payload) {
        try {
            AnnouncementCategory category = noticeService.updateCategoryStatus(id, payload);
            return ResponseEntity.ok().body(gson.toJson(category));
        } catch (Exception ex) {
            Logger.getLogger(NoticeController.class.getName()).log(Level.SEVERE, ex.getMessage(), ex);
            return errorHandler.getError(ex);
        }
    }

    @DeleteMapping(path = "/categories/{id}")
    public ResponseEntity<?> deleteCategory(@Valid @PathVariable Integer id) {
        try {
            noticeService.deleteCategory(id);
            return ResponseEntity.ok().body("Category Deleted Successfully");
        } catch (Exception ex) {
            Logger.getLogger(NoticeController.class.getName()).log(Level.SEVERE, ex.getMessage(), ex);
            return errorHandler.getError(ex);
        }
    }
}
