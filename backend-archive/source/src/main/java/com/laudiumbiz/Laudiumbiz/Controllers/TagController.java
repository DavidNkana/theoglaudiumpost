/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Controllers;

import com.google.gson.Gson;
import com.laudiumbiz.Laudiumbiz.Models.CategoryOrTagRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.laudiumbiz.Laudiumbiz.Models.DB.Tag;
import com.laudiumbiz.Laudiumbiz.Services.TagService;
import com.laudiumbiz.Laudiumbiz.Utils.ErrorHandlig;
import com.laudiumbiz.Laudiumbiz.Utils.Utils;
import jakarta.validation.Valid;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;

/**
 * PURPOSE: Manages article tags for content organization and categorization
 *
 * ENDPOINTS:
 * - GET /api/v1/tags - Retrieve all tags
 * - POST /api/v1/tags - Create a new tag
 * - PUT /api/v1/tags/{id} - Update an existing tag
 * - DELETE /api/v1/tags/{id} - Soft delete a tag
 *
 * DEPENDENCIES:
 * - ErrorHandlig: Global error handling
 * - TagService: Data-access service for tag operations
 * - ExecutorService: Virtual thread executor for async operations
 * - Gson: JSON serialization
 *
 * @author Imran
 */
@RestController
@RequestMapping("/api/v1/tags")
@Validated
public class TagController {

    Gson gson = Utils.getGson();
    private final ErrorHandlig errorHandler;
    private final ExecutorService virtualThreadExecutor;
    private final TagService tagService;

    public TagController(
            @Qualifier("virtualThreadExecutor") ExecutorService virtualThreadExecutor,
            ErrorHandlig errorHandler,
            TagService tagService
    ) {
        this.virtualThreadExecutor = virtualThreadExecutor;
        this.errorHandler = errorHandler;
        this.tagService = tagService;
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> getAllTags() {
        return CompletableFuture.supplyAsync(() -> {
            try {
                var tags = tagService.getAllTags();
                return ResponseEntity.ok().body(gson.toJson(tags));
            } catch (Exception ex) {
                Logger.getLogger(TagController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }

    @PostMapping(produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> createTag(@Valid @RequestBody CategoryOrTagRequest payload
    ) {
            try {
                Tag tag = tagService.createTag(payload);
                return ResponseEntity.status(201).body(gson.toJson(tag));
            } catch (Exception ex) {
                Logger.getLogger(TagController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }

    }

    @PutMapping(path = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> updateTag(@Valid @PathVariable Integer id,
            @RequestBody CategoryOrTagRequest payload
    ) {
        System.out.println("Category: "+gson.toJson(payload));
            try {
                Tag tag = tagService.updateTag(id, payload);
                return ResponseEntity.status(201).body(gson.toJson(tag));
            } catch (Exception ex) {
                Logger.getLogger(TagController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }

    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTag(@Valid @PathVariable Integer id) {
            try {
                Logger.getLogger(TagController.class.getName()).log(Level.SEVERE, "Id: " + id, id);
                tagService.softDeleteTag(id);
                return ResponseEntity.ok().body("Deleted Successfully");

            } catch (Exception ex) {
                Logger.getLogger(TagController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
    }
}
