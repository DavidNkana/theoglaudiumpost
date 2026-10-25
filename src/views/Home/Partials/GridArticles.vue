<script setup>
/**
 * GridArticles.vue
 * 
 * Component that displays articles in a responsive grid layout organized by categories.
 * 
 * This component:
 * - Displays articles in a multi-column grid layout
 * - Organizes content by categories with headings
 * - Features a responsive design that adapts to different screen sizes
 * - Includes a sidebar area for additional content
 * - Currently uses static sample data (would typically fetch from API/store)
 */

import Article from "@/components/Article.vue";

/**
 * Sample article data for demonstration purposes
 * In a production environment, this would be fetched from an API or store
 */
const articles = [
  {
    id: "1",
    title: "This is my 2024 unwrapped",
    imageUrl: "https://fox.withemes.com/hague/wp-content/uploads/sites/98/2024/12/h_getty-images-YAgYy0U-v08-unsplash-150x150.jpg",
    date: "January 8, 2025",
  },
  {
    id: "2",
    title: "Rebel Wilson weds Ramona Agruma in Sydney – and this time it’s for real",
    imageUrl: "https://fox.withemes.com/hague/wp-content/uploads/sites/98/2024/12/getty-images-i_mQObqIYBE-unsplash-150x150.jpg",
    date: "January 8, 2025",
  },
  {
    id: "3",
    title: "When you tell them the truth",
    imageUrl: "https://fox.withemes.com/hague/wp-content/uploads/sites/98/2024/12/curated-lifestyle-_kenPBza4QI-unsplash-150x150.jpg",
    date: "January 8, 2025",
  },
  {
    id: "4",
    title: "Hero-Half Post Example",
    imageUrl: "https://fox.withemes.com/hague/wp-content/uploads/sites/98/2024/12/roberta-sant-anna-14OyP9QZ6SY-unsplash-150x150.jpg",
    date: "January 8, 2025",
  },
  {
    id: "5",
    title: "Welcome To The Finest WordPress Theme For Writers",
    imageUrl: "https://fox.withemes.com/hague/wp-content/uploads/sites/98/2024/12/johannes-kopf-M9ALr14JcU0-unsplash-150x150.jpg",
    date: "January 8, 2025",
  },
]

</script>

<template>
  <!-- 
    Grid Articles component that displays articles in a responsive grid layout
    organized by categories with headings and "See All" links
  -->
  <div>
    <!-- Category 1 Section -->
    <div class="p-2 p-md-4">
      <!-- Category heading with "See All" link -->
      <div class="heading56__wrapper widget56--id--4">
        <h3 class="heading56 section56__heading heading56--border-bottom heading56--stretch-content heading56--left" data-id="widget56--id--4">
          <span class="heading56__text">Category 1<span class="heading56__line heading56__line--left"></span>	See All</span>
        </h3>
      </div>

      <!-- Main content row with articles grid and sidebar -->
      <div class="row">
        <!-- Main article column: takes full width on small screens, and 9/12 on medium+ screens -->
        <div class="col-12 col-md-9">
          <div class="row">
            <!-- Each article is displayed in a responsive column -->
            <div class="col-6 col-md-4" v-for="article in articles" :key="article.id">
              <Article :article="article" layout="verticle" />
            </div>
          </div>
        </div>

        <!-- Sidebar column: takes full width on small, 3/12 on medium+ screens -->
        <div class="col-12 col-md-3">
          <!-- Sidebar content goes here -->
        </div>
      </div>
    </div>

    <!-- Category 2 Section (identical structure to Category 1) -->
    <div class="p-2 md:p-4">
      <!-- Category heading with "See All" link -->
      <div class="heading56__wrapper widget56--id--4">
        <h3 class="heading56 section56__heading heading56--border-bottom heading56--stretch-content heading56--left" data-id="widget56--id--4">
          <span class="heading56__text">Category 2<span class="heading56__line heading56__line--left"></span>	See All</span>
        </h3>
      </div>

      <!-- Main content row with articles grid and sidebar -->
      <div class="row">
        <!-- Main article column: takes full width on small screens, and 9/12 on medium+ screens -->
        <div class="col-12 col-md-9">
          <div class="row">
            <!-- Each article is displayed in a responsive column -->
            <div class="col-6 col-md-4" v-for="article in articles" :key="article.id">
              <Article :article="article" layout="verticle" />
            </div>
          </div>
        </div>

        <!-- Sidebar column: takes full width on small, 3/12 on medium+ screens -->
        <div class="col-12 col-md-3">
          <!-- Sidebar content goes here -->
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/**
 * Grid Articles component styling
 * 
 * Uses Bootstrap grid classes for responsive layout
 * Custom classes (heading56__*) are used for category headings styling
 */
</style>
