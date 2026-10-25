<script setup>
/**
 * Article.vue
 * 
 * Simple article preview component for displaying article information in a compact format.
 * 
 * This component:
 * - Renders article previews with image, title, and publication date
 * - Supports different layout modes (horizontal or vertical)
 * - Links to the full article page
 * - Provides responsive image loading with srcset
 */

/**
 * Component props
 */
const props = defineProps({
  /**
   * Article data object containing title, image URL, date, etc.
   * @type {Object}
   * @required
   */
  article:{
    type: Object,
    required: true,
  },

  /**
   * Layout orientation for the article preview
   * @type {String}
   * @default 'horizontal'
   * @values 'horizontal', 'vertical'
   */
  layout: {
    type: String,
    default: 'horizontal',
  }
})
</script>

<!-- 
  Article preview component that displays article information in a compact format
  Supports both horizontal and vertical layouts based on the layout prop
-->
<template>
  <article :class="[
      'relative z-20 align-left post type-post status-publish format-standard has-post-thumbnail hentry category-interview',
      layout === 'horizontal' ? 'd-flex valign-top' : ''
]">
    <figure class="w-4/5 p-1">
      <RouterLink to="/article/2">
        <img width="150" height="150" :src="article.imageUrl" class="attachment-thumbnail size-thumbnail" alt="" loading="lazy" decoding="async" :srcset="`${article.imageUrl} 150w, ${article.imageUrl} 480w`" sizes="auto, (max-width: 150px) 100vw, 150px">
      </RouterLink>
    </figure>
    <div class="post56__text">
      <h3 class="h8">
        <RouterLink to="/article/2">
          {{article.title}}
        </RouterLink>
      </h3>
      <div class="meta56 component56">
        <div class="meta56__item meta56__date" title="08 Jan, 2025 09:36:17">
          {{article.date}}
        </div>
      </div>
    </div><!-- .post56__text -->
    <div class="post56__sep__line"></div>
  </article>
</template>
