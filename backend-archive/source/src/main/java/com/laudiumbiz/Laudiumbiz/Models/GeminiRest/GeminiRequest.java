package com.laudiumbiz.Laudiumbiz.Models.GeminiRest;

import java.util.List;
import java.util.Map;

/**
 * Model class for Gemini REST API request
 */
public class GeminiRequest {
    private List<Content> contents;
    private List<Map<String, Object>> tools;
    private String model;

    public GeminiRequest() {
    }

    public GeminiRequest(List<Content> contents, List<Map<String, Object>> tools, String model) {
        this.contents = contents;
        this.tools = tools;
        this.model = model;
    }

    public List<Content> getContents() {
        return contents;
    }

    public void setContents(List<Content> contents) {
        this.contents = contents;
    }

    public List<Map<String, Object>> getTools() {
        return tools;
    }

    public void setTools(List<Map<String, Object>> tools) {
        this.tools = tools;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }
}