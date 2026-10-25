package com.laudiumbiz.Laudiumbiz.Models.GeminiRest;

import java.util.List;

/**
 * Model class for the "contents" field in the GeminiRequest class
 */
public class Content {
    private String role;
    private List<Part> parts;

    public Content() {
    }

    public Content(String role, List<Part> parts) {
        this.role = role;
        this.parts = parts;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public List<Part> getParts() {
        return parts;
    }

    public void setParts(List<Part> parts) {
        this.parts = parts;
    }
}