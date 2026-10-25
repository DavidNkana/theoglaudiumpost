package com.laudiumbiz.Laudiumbiz.Models.GeminiRest;

/**
 * Model class for the "tools" field in the GeminiRequest class
 */
public class Tool {
    private GoogleSearch googleSearch;

    public Tool() {
    }

    public Tool(GoogleSearch googleSearch) {
        this.googleSearch = googleSearch;
    }

    public GoogleSearch getGoogleSearch() {
        return googleSearch;
    }

    public void setGoogleSearch(GoogleSearch googleSearch) {
        this.googleSearch = googleSearch;
    }
}