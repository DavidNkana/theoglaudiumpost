package com.laudiumbiz.Laudiumbiz.Services;

import com.laudiumbiz.Laudiumbiz.Utils.ArticleResearchEnricher;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/** PURPOSE: Verifies MiniMax M3 thinking-mode validation and legacy compatibility. */
class MiniMaxWebSearchServiceTest {

    private final MiniMaxWebSearchService service = new MiniMaxWebSearchService(
            new ArticleResearchEnricher(new TavilySearchService())
    );

    @Test
    void acceptsCurrentThinkingModes() throws Exception {
        ReflectionTestUtils.setField(service, "minimaxThinking", "adaptive");
        assertEquals("adaptive", service.resolveThinkingType());

        ReflectionTestUtils.setField(service, "minimaxThinking", "disabled");
        assertEquals("disabled", service.resolveThinkingType());
    }

    @Test
    void mapsLegacyEnabledModeToAdaptive() throws Exception {
        ReflectionTestUtils.setField(service, "minimaxThinking", "enabled");
        assertEquals("adaptive", service.resolveThinkingType());
    }

    @Test
    void rejectsUnsupportedThinkingModeBeforeCallingVendor() {
        ReflectionTestUtils.setField(service, "minimaxThinking", "invalid");
        assertThrows(IOException.class, service::resolveThinkingType);
    }
}
