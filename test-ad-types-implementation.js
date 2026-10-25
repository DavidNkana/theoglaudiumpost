/**
 * Test script for the ad types implementation
 * This script verifies that both banner ads for Google AdSense and square ads for direct advertisers
 * are correctly implemented in the news layout
 */

import fs from 'fs';
import path from 'path';

// Function to test the ad types implementation
async function testAdTypesImplementation() {
  console.log('Testing ad types implementation...');
  
  try {
    // Read the News.vue file
    const newsFilePath = path.resolve('./src/views/News/News.vue');
    const newsFileContent = fs.readFileSync(newsFilePath, 'utf8');
    
    // Read the LatestNews.vue file
    const latestNewsFilePath = path.resolve('./src/views/News/Partials/LatestNews.vue');
    const latestNewsFileContent = fs.readFileSync(latestNewsFilePath, 'utf8');
    
    // Read the AdBanner.vue file
    const adBannerFilePath = path.resolve('./src/components/AdBanner.vue');
    const adBannerFileContent = fs.readFileSync(adBannerFilePath, 'utf8');
    
    // Read the AdArticle.vue file
    const adArticleFilePath = path.resolve('./src/components/AdArticle.vue');
    const adArticleFileContent = fs.readFileSync(adArticleFilePath, 'utf8');
    
    // Test 1: Check if News.vue has Google AdSense banner ads
    const hasGoogleAdsInNews = newsFileContent.includes(':adProvider="\'google\'"') && 
                              newsFileContent.includes('<!-- Google AdSense Banner -->');
    
    // Test 2: Check if LatestNews.vue has both ad types
    const hasDirectAdsInLatestNews = latestNewsFileContent.includes(':adProvider="\'direct\'"') && 
                                    latestNewsFileContent.includes('<!-- Square ad after every 8 articles');
    
    const hasGoogleAdsInLatestNews = latestNewsFileContent.includes(':adProvider="\'google\'"') && 
                                    latestNewsFileContent.includes('<!-- Banner ad after every 16 articles');
    
    // Test 3: Check if AdBanner.vue has the adProvider prop
    const hasAdProviderInAdBanner = adBannerFileContent.includes('adProvider: {') && 
                                   adBannerFileContent.includes('default: "direct"') &&
                                   adBannerFileContent.includes('validator: (value) => ["direct", "google"].includes(value)');
    
    // Test 4: Check if AdArticle.vue has the adProvider prop
    const hasAdProviderInAdArticle = adArticleFileContent.includes('adProvider: {') && 
                                    adArticleFileContent.includes('default: \'direct\'') &&
                                    adArticleFileContent.includes('validator: (value) => ["direct", "google"].includes(value)');
    
    // Test 5: Check if the CSS styling for both ad types is correct
    const hasGoogleAdSenseStyling = adBannerFileContent.includes('/* Google AdSense specific styling */') && 
                                   adBannerFileContent.includes('.google-adsense {');
    
    const hasBannerAdStyling = latestNewsFileContent.includes('/* Google AdSense banner styling */') && 
                              latestNewsFileContent.includes('.article-grid-item-banner {');
    
    // Report results
    console.log('\n=== Test Results ===');
    
    if (hasGoogleAdsInNews) {
      console.log('✅ PASS: News.vue has Google AdSense banner ads');
    } else {
      console.log('❌ FAIL: News.vue does not have Google AdSense banner ads');
    }
    
    if (hasDirectAdsInLatestNews) {
      console.log('✅ PASS: LatestNews.vue has direct advertiser ads');
    } else {
      console.log('❌ FAIL: LatestNews.vue does not have direct advertiser ads');
    }
    
    if (hasGoogleAdsInLatestNews) {
      console.log('✅ PASS: LatestNews.vue has Google AdSense banner ads');
    } else {
      console.log('❌ FAIL: LatestNews.vue does not have Google AdSense banner ads');
    }
    
    if (hasAdProviderInAdBanner) {
      console.log('✅ PASS: AdBanner.vue has the adProvider prop');
    } else {
      console.log('❌ FAIL: AdBanner.vue does not have the adProvider prop');
    }
    
    if (hasAdProviderInAdArticle) {
      console.log('✅ PASS: AdArticle.vue has the adProvider prop');
    } else {
      console.log('❌ FAIL: AdArticle.vue does not have the adProvider prop');
    }
    
    if (hasGoogleAdSenseStyling) {
      console.log('✅ PASS: AdBanner.vue has Google AdSense styling');
    } else {
      console.log('❌ FAIL: AdBanner.vue does not have Google AdSense styling');
    }
    
    if (hasBannerAdStyling) {
      console.log('✅ PASS: LatestNews.vue has banner ad styling');
    } else {
      console.log('❌ FAIL: LatestNews.vue does not have banner ad styling');
    }
    
    // Overall assessment
    if (hasGoogleAdsInNews && hasDirectAdsInLatestNews && hasGoogleAdsInLatestNews && 
        hasAdProviderInAdBanner && hasAdProviderInAdArticle && 
        hasGoogleAdSenseStyling && hasBannerAdStyling) {
      console.log('\n✅ OVERALL: All ad types are correctly implemented');
      console.log('The implementation:');
      console.log('1. Keeps banner ads for Google AdSense');
      console.log('2. Uses in-feed square ads for direct advertisers');
      console.log('3. Clearly distinguishes between the two ad types');
      console.log('4. Maintains proper styling for both ad types');
    } else {
      console.log('\n❌ OVERALL: Not all ad types are correctly implemented');
      console.log('Please check the implementation and make the necessary fixes.');
    }
  } catch (error) {
    console.error('Error testing ad types implementation:', error.message);
  }
}

// Run the test
testAdTypesImplementation();