package com.laudiumbiz.Laudiumbiz.Models.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

/**
 * DTO for requests that require a prompt parameter
 */
@Getter
public class PromptRequest {

  // Getters and setters
  @NotBlank(message = "Prompt cannot be empty")
    private String prompt;
    
    // Default constructor
    public PromptRequest() {
    }
    
    // Constructor with parameters
    public PromptRequest(String prompt) {
        this.prompt = prompt;
    }

  public void setPrompt(String prompt) {
        this.prompt = prompt;
    }
}