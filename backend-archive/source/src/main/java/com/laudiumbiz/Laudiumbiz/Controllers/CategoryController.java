/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Controllers;

import com.laudiumbiz.Laudiumbiz.Models.CategoryOrTagRequest;
import com.laudiumbiz.Laudiumbiz.Models.DB.Category;
import com.laudiumbiz.Laudiumbiz.Services.CategoryService;
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
@RequestMapping("/api/v1/categories")
@Validated
public class CategoryController {

    Gson gson = Utils.getGson();
    private final ErrorHandlig errorHandler;
    private final ExecutorService virtualThreadExecutor;
    private final CategoryService categoryService;

    public CategoryController(
            @Qualifier("virtualThreadExecutor") ExecutorService virtualThreadExecutor,
            ErrorHandlig errorHandler,
            CategoryService categoryService
    ) {
        this.virtualThreadExecutor = virtualThreadExecutor;
        this.errorHandler = errorHandler;
        this.categoryService = categoryService;
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> getAllCategories() {
        return CompletableFuture.supplyAsync(() -> {
            try {
                List<Category> categories = categoryService.getActiveCategories();
                return ResponseEntity.ok().body(categories);
            } catch (Exception ex) {
                Logger.getLogger(CategoryController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }

    @PostMapping(produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> createCategory(@Valid @RequestBody CategoryOrTagRequest payload) {
        try {
            Category category = categoryService.createCategory(payload);
            return ResponseEntity.status(201).body(gson.toJson(category));
        } catch (Exception ex) {
            Logger.getLogger(CategoryController.class.getName()).log(Level.SEVERE, null, ex);
            return errorHandler.getError(ex);
        }

    }

    @PutMapping(path = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> updateCategory(@Valid @PathVariable Integer id,
            @RequestBody CategoryOrTagRequest payload) {
        try {
            Category category = categoryService.updateCategory(id, payload);
            return ResponseEntity.status(201).body(gson.toJson(category));
        } catch (Exception ex) {
            Logger.getLogger(CategoryController.class.getName()).log(Level.SEVERE, null, ex);
            return errorHandler.getError(ex);
        }

    }

    @GetMapping(path = "/{slug}/articles", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> articles(@Valid @PathVariable String slug,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        try {
            Map<String, Object> response = categoryService.getCategoryArticles(slug, page, size);
            if (response == null) {
                return ResponseEntity.status(200).body(null);
            }
            return ResponseEntity.status(200).body(gson.toJson(response));
        } catch (Exception ex) {
            Logger.getLogger(CategoryController.class.getName()).log(Level.SEVERE, null, ex);
            return errorHandler.getError(ex);
        }

    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTag(@Valid @PathVariable Integer id) {
        try {
            Logger.getLogger(CategoryController.class.getName()).log(Level.SEVERE, "Id: " + id, id);
            categoryService.softDeleteCategory(id);
            return ResponseEntity.ok().body("Deleted Successfully");

        } catch (Exception ex) {
            Logger.getLogger(CategoryController.class.getName()).log(Level.SEVERE, null, ex);
            return errorHandler.getError(ex);
        }
    }
}
