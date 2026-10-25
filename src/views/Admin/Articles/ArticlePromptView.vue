<template>
  <div class="article-prompt-view">
    <!-- Article Prompt Modal -->
    <ArticlePromptModal 
      :show="showModal" 
      @close="handleModalClose" 
      @article-generated="handleArticleGenerated" 
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import ArticlePromptModal from '@/components/ArticlePromptModal.vue';
import Swal from 'sweetalert2';

const router = useRouter();
const showModal = ref(true);

// Handle modal close event
const handleModalClose = () => {
  // Navigate back to the articles list
  router.push('/admin/articles');
};

// Handle article generated event
const handleArticleGenerated = (articleData) => {
  console.log('Article data received in ArticlePromptView:', articleData);
  
  // Check if we're creating from a source article
  if (articleData.sourceId) {
    // Store the article data in localStorage
    const articleDataForStorage = {
      title: articleData.title || '',
      slug: articleData.slug || '', // Use the slug from the API if available
      content: articleData.article || '',
      summary: articleData.summary || '',
      sourceId: articleData.sourceId,
      sources: articleData.sources || [] // Include sources if available
    };
    
    console.log('Article data for storage (from source):', articleDataForStorage);
    localStorage.setItem('newArticleData', JSON.stringify(articleDataForStorage));
    
    // Navigate to the create article page with the generated article data
    router.push({
      path: '/admin/articles/create',
      query: { 
        newArticle: 'true',
        fromSource: 'true'
      },
      state: {
        articleData: articleDataForStorage
      }
    });
  } else {
    // Store the article data in localStorage
    const articleDataForStorage = {
      title: articleData.title,
      slug: articleData.slug,
      content: articleData.article,
      summary: articleData.summary,
      sources: articleData.sources || [] // Include sources if available
    };
    
    console.log('Article data for storage (from prompt):', articleDataForStorage);
    localStorage.setItem('newArticleData', JSON.stringify(articleDataForStorage));
    
    // Navigate to the create article page with the generated article data
    router.push({
      path: '/admin/articles/create',
      query: { 
        newArticle: 'true' 
      },
      state: {
        articleData: articleDataForStorage
      }
    });
  }
};

// Show the modal when the component is mounted
onMounted(() => {
  showModal.value = true;
});
</script>

<style scoped>
.article-prompt-view {
  /* This component doesn't need any visible UI as it just shows the modal */
  min-height: 100vh;
}
</style>