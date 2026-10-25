package com.laudiumbiz.Laudiumbiz.Models.GeminiRest;

/**
 * Model class for the "candidates" field in the GeminiResponse class
 */
public class Candidate {
    private Content content;
    private String finishReason;
    private GroundingMetadata groundingMetadata;

    public Candidate() {
    }

    public Candidate(Content content, String finishReason, GroundingMetadata groundingMetadata) {
        this.content = content;
        this.finishReason = finishReason;
        this.groundingMetadata = groundingMetadata;
    }

    public Content getContent() {
        return content;
    }

    public void setContent(Content content) {
        this.content = content;
    }

    public String getFinishReason() {
        return finishReason;
    }

    public void setFinishReason(String finishReason) {
        this.finishReason = finishReason;
    }

    public GroundingMetadata getGroundingMetadata() {
        return groundingMetadata;
    }

    public void setGroundingMetadata(GroundingMetadata groundingMetadata) {
        this.groundingMetadata = groundingMetadata;
    }
}