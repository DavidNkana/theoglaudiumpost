// composables/useRefinementHistory.js
import { ref, computed } from 'vue';
import { refineArticleBySourceId } from '@/features/articles/ArticlesService';
import Swal from 'sweetalert2';

export function useRefinementHistory() {
    // State
    const refinementHistory = ref([]);
    const isRefining = ref(false);
    const currentArticleId = ref(null);

    // Load refinement history for a specific article
    const loadRefinementHistory = async (articleId) => {
        if (!articleId) return;

        currentArticleId.value = articleId;

        try {
            // This will be implemented when backend is ready
            // const response = await getRefinementHistory(articleId);
            // refinementHistory.value = response.data;

            // For now, return empty array or mock data
            refinementHistory.value = [];
        } catch (error) {
            console.error('Error loading refinement history:', error);
            refinementHistory.value = [];
        }
    };

    // Add a new refinement to history
    const addRefinement = (refinement) => {
        const newRefinement = {
            id: Date.now(), // Temporary ID, will be replaced by backend ID
            articleId: currentArticleId.value,
            prompt: refinement.prompt,
            contentBefore: refinement.contentBefore,
            contentAfter: refinement.contentAfter,
            createdAt: new Date().toISOString(),
            provider: refinement.provider
        };

        refinementHistory.value.push(newRefinement);

        // Save to backend when implemented
        // saveRefinementHistory(newRefinement);
    };

    // Submit refinement request
    const submitRefinement = async (params) => {
        const {
            sourceId,
            articleId,
            prompt,
            provider,
            currentContent
        } = params;

        isRefining.value = true;

        try {
            // Store content before refinement
            const contentBefore = currentContent;

            // Make refinement API call
            const response = await refineArticleBySourceId({
                sourceId,
                articleId,
                prompt,
                provider,
            });

            const refined = response.data;
            const contentAfter = refined.article;

            // Add to history
            addRefinement({
                prompt,
                contentBefore,
                contentAfter,
                provider
            });

            // Return the refined content
            return {
                success: true,
                content: contentAfter,
                refinement: {
                    prompt,
                    contentBefore,
                    contentAfter
                }
            };
        } catch (error) {
            console.error('Refinement failed:', error);

            Swal.fire({
                title: 'Error!',
                text: 'Failed to process refinement. Please try again.',
                icon: 'error',
                confirmButtonText: 'OK'
            });

            return {
                success: false,
                error: error.message
            };
        } finally {
            isRefining.value = false;
        }
    };

    // Clear history
    const clearHistory = () => {
        refinementHistory.value = [];
    };

    // Get the last refinement
    const lastRefinement = computed(() => {
        return refinementHistory.value[refinementHistory.value.length - 1] || null;
    });

    // Get refinement count
    const refinementCount = computed(() => {
        return refinementHistory.value.length;
    });

    return {
        refinementHistory,
        isRefining,
        currentArticleId,
        loadRefinementHistory,
        addRefinement,
        submitRefinement,
        clearHistory,
        lastRefinement,
        refinementCount
    };
}