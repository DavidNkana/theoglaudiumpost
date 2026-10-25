package com.laudiumbiz.Laudiumbiz.Models.DTO;

import jakarta.validation.constraints.NotBlank;

/**
 * DTO for requests that require a topic parameter
 */
public class TopicRequest {
    
    @NotBlank(message = "Topic cannot be empty")
    private String topic;
    
    // Default constructor
    public TopicRequest() {
    }
    
    // Constructor with parameters
    public TopicRequest(String topic) {
        this.topic = topic;
    }
    
    // Getters and setters
    public String getTopic() {
        return topic;
    }
    
    public void setTopic(String topic) {
        this.topic = topic;
    }
}