package com.laudiumbiz.Laudiumbiz.Models.GeminiRest;

import java.util.List;
import java.util.Map;

/**
 * Model class for the "groundingMetadata" field in the Candidate class
 */
public class GroundingMetadata {
    private List<String> webSearchQueries;
    private Map<String, Object> searchEntryPoint;
    private List<Map<String, Object>> groundingChunks;
    private List<Map<String, Object>> groundingSupports;
    private Map<String, Object> retrievalMetadata;

    public GroundingMetadata() {
    }

    public GroundingMetadata(List<String> webSearchQueries, Map<String, Object> searchEntryPoint,
                             List<Map<String, Object>> groundingChunks, List<Map<String, Object>> groundingSupports,
                             Map<String, Object> retrievalMetadata) {
        this.webSearchQueries = webSearchQueries;
        this.searchEntryPoint = searchEntryPoint;
        this.groundingChunks = groundingChunks;
        this.groundingSupports = groundingSupports;
        this.retrievalMetadata = retrievalMetadata;
    }

    public List<String> getWebSearchQueries() {
        return webSearchQueries;
    }

    public void setWebSearchQueries(List<String> webSearchQueries) {
        this.webSearchQueries = webSearchQueries;
    }

    public Map<String, Object> getSearchEntryPoint() {
        return searchEntryPoint;
    }

    public void setSearchEntryPoint(Map<String, Object> searchEntryPoint) {
        this.searchEntryPoint = searchEntryPoint;
    }

    public List<Map<String, Object>> getGroundingChunks() {
        return groundingChunks;
    }

    public void setGroundingChunks(List<Map<String, Object>> groundingChunks) {
        this.groundingChunks = groundingChunks;
    }

    public List<Map<String, Object>> getGroundingSupports() {
        return groundingSupports;
    }

    public void setGroundingSupports(List<Map<String, Object>> groundingSupports) {
        this.groundingSupports = groundingSupports;
    }

    public Map<String, Object> getRetrievalMetadata() {
        return retrievalMetadata;
    }

    public void setRetrievalMetadata(Map<String, Object> retrievalMetadata) {
        this.retrievalMetadata = retrievalMetadata;
    }
}