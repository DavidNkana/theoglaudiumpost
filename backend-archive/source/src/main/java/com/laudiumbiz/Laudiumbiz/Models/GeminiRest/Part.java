package com.laudiumbiz.Laudiumbiz.Models.GeminiRest;

/**
 * Model class for the "parts" field in the Content class
 */
public class Part {
    private String text;

    public Part() {
    }

    public Part(String text) {
        this.text = text;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }
}