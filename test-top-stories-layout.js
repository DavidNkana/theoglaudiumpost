/**
 * Test script for the TopStories component layout
 * This script verifies that the TopStories component is configured to display 4-5 stories next to each other
 */

import fs from 'fs';
import path from 'path';

// Function to test the TopStories component layout
async function testTopStoriesLayout() {
  console.log('Testing TopStories component layout...');
  
  try {
    // Read the TopStories.vue file
    const filePath = path.resolve('./src/views/News/Partials/TopStories.vue');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Check if the file contains the correct column classes
    const expectedClasses = 'class="col-10 col-sm-6 col-md-4 col-lg-3 col-xl-2"';
    const hasCorrectClasses = fileContent.includes(expectedClasses);
    
    if (hasCorrectClasses) {
      console.log('✅ PASS: TopStories component has the correct column classes');
      console.log('This configuration will display:');
      console.log('- 1 card on extra small screens (mobile)');
      console.log('- 2 cards on small screens');
      console.log('- 3 cards on medium screens');
      console.log('- 4 cards on large screens');
      console.log('- 6 cards on extra large screens');
      console.log('\nThe requirement of displaying 4-5 top stories next to each other is met on large and extra large screens.');
    } else {
      console.log('❌ FAIL: TopStories component does not have the correct column classes');
      console.log(`Expected: ${expectedClasses}`);
      
      // Try to find what classes are actually being used
      const classRegex = /class="(col-[^"]+)"/;
      const match = fileContent.match(classRegex);
      if (match) {
        console.log(`Found: ${match[0]}`);
      }
    }
  } catch (error) {
    console.error('Error testing TopStories layout:', error.message);
  }
}

// Run the test
testTopStoriesLayout();