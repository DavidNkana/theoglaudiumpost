<!-- src/components/BreakingNewsTicker.vue -->
<template>
  <div class="breaking-news-container">
    <div class="breaking-news-header">
      <span class="breaking-label">BREAKING</span>
    </div>
    <div class="breaking-news-ticker">
      <div class="ticker-wrapper" ref="tickerWrapper">
        <div
          class="ticker-content"
          :style="{ transform: `translateX(${-currentPosition}px)` }"
        >
          <div class="ticker-item" v-for="(item, index) in news" :key="index">
            {{ item }}
            <span class="ticker-separator">•</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    name: "BreakingNewsTicker",
    props: {
      news: {
        type: Array,
        required: true,
      },
    },
    data() {
      return {
        currentPosition: 0,
        tickerAnimation: null,
        tickerWidth: 0,
        contentWidth: 0,
      };
    },
    methods: {
      startTicker() {
        const tickerEl = this.$refs.tickerWrapper;
        if (!tickerEl) return;

        this.stopTicker();
        this.tickerWidth = tickerEl.offsetWidth;
        this.contentWidth = tickerEl.scrollWidth;

        const animateTicker = () => {
          this.currentPosition += 0.5;

          // Reset position when all items have scrolled
          if (this.currentPosition >= this.contentWidth) {
            this.currentPosition = -this.tickerWidth;
          }

          this.tickerAnimation = requestAnimationFrame(animateTicker);
        };

        this.tickerAnimation = requestAnimationFrame(animateTicker);
      },
      stopTicker() {
        if (this.tickerAnimation) {
          cancelAnimationFrame(this.tickerAnimation);
          this.tickerAnimation = null;
        }
      },
      handleResize() {
        this.startTicker();
      },
    },
    mounted() {
      this.$nextTick(() => {
        this.startTicker();
        window.addEventListener("resize", this.handleResize);
      });
    },
    beforeUnmount() {
      this.stopTicker();
      window.removeEventListener("resize", this.handleResize);
    },
  };
</script>

<style scoped>
  .breaking-news-container {
    display: flex;
    height: 40px;
    background-color: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 4px;
    overflow: hidden;
  }

  .breaking-news-header {
    display: flex;
    align-items: center;
    background-color: #dc3545;
    padding: 0 15px;
    flex-shrink: 0;
  }

  .breaking-label {
    color: white;
    font-weight: 700;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .breaking-news-ticker {
    flex-grow: 1;
    overflow: hidden;
    position: relative;
  }

  .ticker-wrapper {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .ticker-content {
    display: flex;
    align-items: center;
    height: 100%;
    transition: transform 0.1s linear;
    white-space: nowrap;
  }

  .ticker-item {
    padding: 0 20px;
    font-weight: 500;
    color: #333;
  }

  .ticker-separator {
    margin-left: 10px;
    color: #888;
  }
</style>
