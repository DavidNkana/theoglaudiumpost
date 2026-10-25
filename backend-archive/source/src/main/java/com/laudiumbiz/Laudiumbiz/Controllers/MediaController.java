package com.laudiumbiz.Laudiumbiz.Controllers;

import com.google.gson.Gson;
import com.laudiumbiz.Laudiumbiz.Models.DB.Media;
import com.laudiumbiz.Laudiumbiz.Services.CloudinaryService;
import com.laudiumbiz.Laudiumbiz.Services.MediaPersistenceService;
import com.laudiumbiz.Laudiumbiz.Utils.ErrorHandlig;
import com.laudiumbiz.Laudiumbiz.Utils.Utils;
import org.jetbrains.annotations.NotNull;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.webjars.NotFoundException;
import java.io.IOException;
import java.net.URI;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.logging.Level;
import java.util.logging.Logger;

@RestController
@RequestMapping("/api/v1/media")
public class MediaController {

  Gson gson = Utils.getGson();
  private final ErrorHandlig errorHandler;
  private final CloudinaryService cloudinaryService;
  private final ExecutorService virtualThreadExecutor;
  private final MediaPersistenceService mediaPersistenceService;

  public MediaController(
      @Qualifier("virtualThreadExecutor") ExecutorService virtualThreadExecutor,
      ErrorHandlig errorHandler,
      CloudinaryService cloudinaryService,
      MediaPersistenceService mediaPersistenceService) {
    this.virtualThreadExecutor = virtualThreadExecutor;
    this.errorHandler = errorHandler;
    this.cloudinaryService = cloudinaryService;
    this.mediaPersistenceService = mediaPersistenceService;
  }

  @GetMapping(value = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
  public CompletableFuture<ResponseEntity<?>> getImage(
      @PathVariable String id,
      @RequestParam(defaultValue = "popular") String storyType) {
    return fetchAndGenerateImage(id, storyType)
        .handleAsync(
        (response, error) -> {
          if (response != null)
            return ResponseEntity.ok()
                                 .contentType(MediaType.APPLICATION_JSON)
                                 .body(gson.toJson(response));
          else
            return switch (error){
              case NotFoundException e -> ResponseEntity
                  .status(HttpStatus.NOT_FOUND)
                  .body(errorHandler.getError(e));
              default -> ResponseEntity.status(500)
                                       .body(error.getMessage());
            };
        }, virtualThreadExecutor
    );
  }

  @GetMapping(
      value = "/{id}",
      produces = {
          MediaType.IMAGE_JPEG_VALUE,
          MediaType.IMAGE_PNG_VALUE,
          MediaType.IMAGE_GIF_VALUE,
          "image/webp",
      }
  )
  public CompletableFuture<ResponseEntity<?>> getImageRedirect(
      @PathVariable String id,
      @RequestParam(defaultValue = "popular") String storyType) {
    return fetchAndGenerateImage(id, storyType)
        .handleAsync(
            (response, error) -> {
              if (response != null) {
                return ResponseEntity.status(HttpStatus.FOUND)
                                     .location(URI.create(response.get("url")))
                                     .build();
              } else {
                return switch (error){
                  case NotFoundException e -> ResponseEntity
                      .status(HttpStatus.NOT_FOUND)
                      .body(errorHandler.getError(e));
                  default -> ResponseEntity.status(500)
                                           .body(error.getMessage());
                };
              }
            }, virtualThreadExecutor
        );
  }

  @NotNull
  private CompletableFuture<Map<String, String>> fetchAndGenerateImage(String id, String storyType) {
    return CompletableFuture.supplyAsync(() -> {
      Media media = mediaPersistenceService.findById(id).orElse(null);
      if (media == null || media.getId() == null || media.getFile() == null) {
        System.out.println("ID: " + id + " Media: " + (media != null ? gson.toJson(media) : "null"));
        throw new NotFoundException("Media not found");
      }

      Integer finalWidth = 0;
      Integer finalHeight = 0;

      switch (storyType.toLowerCase()) {
        case "top":
          finalWidth = 170;
          finalHeight = 368;
          break;
        case "featured":
          finalWidth = 170;
          finalHeight = 272;
          break;
        case "square":
          finalWidth = 1080;
          finalHeight = 1080;
          break;
        case "banner":
          finalWidth = 1200;
          finalHeight = 628;
          break;
        case "wide":
          finalWidth = 1920;
          finalHeight = 1080;
          break;
        default:
          finalWidth = 512;
          finalHeight = 512;
          break;
      }

      String url = cloudinaryService.getUrl(media.getFile(), finalWidth, finalHeight);

      Map<String, String> result = new HashMap<>();
      result.put("url", url);
      result.put("public_id", media.getFile());
      return result;
    }, virtualThreadExecutor);
  }

  @GetMapping(value = "/url/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
  public CompletableFuture<ResponseEntity<?>> getMediaUrl(@PathVariable String id) {
    return CompletableFuture.supplyAsync(() -> {
      try {
        Media media = mediaPersistenceService.findById(id).orElse(null);
        if (media == null || media.getFile() == null) {
          throw new NotFoundException("Media not found");
        }
        Map<String, String> result = new HashMap<>();
        result.put("url", media.getFile());
        return ResponseEntity.ok().body(gson.toJson(result));
      } catch (Exception ex) {
        Logger.getLogger(MediaController.class.getName()).log(Level.SEVERE, ex.getMessage(), ex);
        return errorHandler.getError(ex);
      }
    }, virtualThreadExecutor);
  }
}
