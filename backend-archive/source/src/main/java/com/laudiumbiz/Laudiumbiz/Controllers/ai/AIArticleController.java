package com.laudiumbiz.Laudiumbiz.Controllers.ai;

import com.google.gson.Gson;
import com.laudiumbiz.Laudiumbiz.Models.DB.Category;
import com.laudiumbiz.Laudiumbiz.Models.DB.Prompt;
import com.laudiumbiz.Laudiumbiz.Models.DB.PromptDTO;
import com.laudiumbiz.Laudiumbiz.Services.GPTService;
import com.laudiumbiz.Laudiumbiz.Services.PromptService;
import com.laudiumbiz.Laudiumbiz.Utils.ErrorHandlig;
import com.laudiumbiz.Laudiumbiz.Utils.Utils;
import com.laudiumbiz.Laudiumbiz.Controllers.ArticleController;
import org.springframework.web.bind.annotation.*;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;

/**
 *
 * @author Imran
 */
@RestController
@RequestMapping("/api/v1/ai")
@Validated
public class AIArticleController {

    Gson gson = Utils.getGson();
    private final GPTService gptService;
    private final ErrorHandlig errorHandler;
    private final ExecutorService virtualThreadExecutor;
    private final PromptService promptService;

    public AIArticleController(
            @Qualifier("virtualThreadExecutor") ExecutorService virtualThreadExecutor,
            GPTService gptService,
            ErrorHandlig errorHandler,
            PromptService promptService) {
        this.virtualThreadExecutor = virtualThreadExecutor;
        this.gptService = gptService;
        this.errorHandler = errorHandler;
        this.promptService = promptService;
    }

    // @ModifiedByJunie 2025-11-04: Keep controller thin; GPTService.generateArticle now returns cleaned JSON directly
    @PostMapping("/generate-article")
    public ResponseEntity<?> generate(@RequestBody Map<String, String> body) throws IOException {
        String prompt = body.get("prompt");
        try {
            String cleaned = gptService.generateArticle(prompt);
            return ResponseEntity.ok(cleaned);
        } catch (IOException ex) {
            // Return 400 for validation/parse errors from service
            return ResponseEntity.badRequest().body(ex.getMessage());
        } catch (Exception ex) {
            Logger.getLogger(AIArticleController.class.getName()).log(Level.SEVERE, null, ex);
            return errorHandler.getError(ex);
        }
    }

    @GetMapping(path = "/prompts", produces = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> getAllPrompts() {
        return CompletableFuture.supplyAsync(() -> {
            try {
                var prompts = promptService.getAllPrompts();
                return ResponseEntity.ok().body(gson.toJson(prompts));
            } catch (Exception ex) {
                Logger.getLogger(ArticleController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }

    @GetMapping(path = "/prompts/{name}", produces = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> getPrompt(@PathVariable String name) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Prompt prompt = promptService.getPromptByName(name);

                return ResponseEntity.ok().body(gson.toJson(prompt));
            } catch (Exception ex) {
                Logger.getLogger(ArticleController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }

    // Create
    @PostMapping(path = "/prompts")
    public CompletableFuture<ResponseEntity<?>> createPrompt(@RequestBody PromptDTO payload) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                promptService.createPrompt(payload);

                return ResponseEntity.status(201).body("Created Successfully");
            } catch (Exception ex) {
                Logger.getLogger(AIArticleController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }

    // Update
    @PutMapping(path = "/prompts/{id}")
    public CompletableFuture<ResponseEntity<?>> updatePrompt(@PathVariable String id, @RequestBody PromptDTO payload) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                promptService.updatePrompt(id, payload);
                return ResponseEntity.ok("Updated Successfully");
            } catch (Exception ex) {
                Logger.getLogger(AIArticleController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }

    // Delete
    @DeleteMapping(path = "/prompts/{id}")
    public CompletableFuture<ResponseEntity<?>> deletePrompt(@PathVariable String id) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                promptService.deactivatePrompt(id);
                return ResponseEntity.ok("Prompt deactivated Successfully");
            } catch (Exception ex) {
                Logger.getLogger(AIArticleController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }

    // @ModifiedByJunie 2025-11-03: Ensure this endpoint uses GPTService.generateImage with fixed 1024x1536, PNG, transparent background
    @PostMapping("/articles/generate-thumbnail")
    public String generateThumbnail(@RequestBody Map<String, Object> payload) throws IOException {
        String prompt = (String) payload.get("prompt");
        // Size parameter is no longer used as it's fixed at 1024x1536 in the service
        String model = (String) payload.get("model");
        Integer n = payload.get("n") != null ? ((Number) payload.get("n")).intValue() : null;

        return gptService.generateImage(prompt, null, model, n);

//    String base64 = (String) ((Map<?, ?>) ((List<?>) response.getBody().get("data")).get(0)).get("b64_json");
//    return ResponseEntity.ok(Map.of("base64", base64));
    }

}