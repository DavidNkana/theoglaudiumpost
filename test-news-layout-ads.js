/**
 * Test script for the News page layout changes
 * This script verifies that:
 * 1. The right sidebar has been removed
 * 2. Ads appear after every 6 articles
 */

import fs from 'fs';
import path from 'path';

// Function to test the News page layout changes
async function testNewsLayoutAds() {
  console.log('Testing News page layout changes...');
  
  try {
    // Read the News.vue file
    const newsFilePath = path.resolve('./src/views/News/News.vue');
    const newsFileContent = fs.readFileSync(newsFilePath, 'utf8');
    
    // Read the LatestNews.vue file
    const latestNewsFilePath = path.resolve('./src/views/News/Partials/LatestNews.vue');
    const latestNewsFileContent = fs.readFileSync(latestNewsFilePath, 'utf8');
    
    // Test 1: Check if the right sidebar has been removed
    const hasRightSidebar = newsFileContent.includes('Right Sidebar') && 
                           newsFileContent.includes('col-lg-4 ps-lg-4') &&
                           newsFileContent.includes('<PopularStories');
    
    // Test 2: Check if the main column now takes full width
    const hasFullWidthMainColumn = newsFileContent.includes('col-12 main-column');
    
    // Test 3: Check if ads are inserted after every 6 articles
    const hasAdsAfterArticles = latestNewsFileContent.includes('v-if="(index + 1) % 6 === 0 && index > 0"') && 
                               latestNewsFileContent.includes('<AdBanner size="medium" :placement="IN_ARTICLE_BOTTOM"') &&
                               latestNewsFileContent.includes('article-grid-item-ad');
    
    // Report results
    console.log('\n=== Test Results ===');
    
    if (!hasRightSidebar) {
      console.log('✅ PASS: Right sidebar has been removed');
    } else {
      console.log('❌ FAIL: Right sidebar is still present');
    }
    
    if (hasFullWidthMainColumn) {
      console.log('✅ PASS: Main column now takes full width (col-12)');
    } else {
      console.log('❌ FAIL: Main column does not take full width');
    }
    
    if (hasAdsAfterArticles) {
      console.log('✅ PASS: Ads are inserted after every 6 articles');
      console.log('- Conditional rendering based on index');
      console.log('- AdBanner component with correct props');
      console.log('- Proper styling with article-grid-item-ad class');
    } else {
      console.log('❌ FAIL: Ads are not properly inserted after articles');
    }
    
    // Overall assessment
    if (!hasRightSidebar && hasFullWidthMainColumn && hasAdsAfterArticles) {
      console.log('\n✅ OVERALL: All changes have been successfully implemented');
      console.log('The News page now:');
      console.log('1. Has no right sidebar with Popular section');
      console.log('2. Uses a full-width layout for the main content');
      console.log('3. Displays ads after every 6 articles');
    } else {
      console.log('\n❌ OVERALL: Not all changes have been implemented correctly');
      console.log('Please check the implementation and make the necessary fixes.');
    }
  } catch (error) {
    console.error('Error testing News layout changes:', error.message);
  }
}

// Run the test
testNewsLayoutAds();