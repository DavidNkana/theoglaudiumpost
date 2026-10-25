/**
 * Test script for verifying the card border fix
 * 
 * This script checks that:
 * 1. The newspaper-view container no longer has a border
 * 2. Each individual pin-card has a 1px solid black border
 */

// Import required modules
import fs from 'fs';
import path from 'path';

// Function to read and parse CSS from a Vue file
function extractCSS(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/);
    
    if (styleMatch && styleMatch[1]) {
      return styleMatch[1];
    }
    
    return '';
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return '';
  }
}

// Function to check if a CSS selector has a specific property
function hasProperty(css, selector, property) {
  const selectorRegex = new RegExp(`${selector}\\s*{[^}]*${property}[^}]*}`, 'i');
  return selectorRegex.test(css);
}

// Main test function
async function testCardBorderFix() {
  console.log('Testing card border fix implementation...');
  
  // Define file paths
  const newspaperViewPath = path.resolve('./src/views/Newspaper/NewspaperView.vue');
  const pinCardPath = path.resolve('./src/components/PinCard.vue');
  
  // Extract CSS from files
  const newspaperViewCSS = extractCSS(newspaperViewPath);
  const pinCardCSS = extractCSS(pinCardPath);
  
  // Test 1: Newspaper view should NOT have a border
  const newspaperViewHasBorder = hasProperty(newspaperViewCSS, '\\.newspaper-view', 'border:\\s*1px\\s+solid\\s+black');
  
  if (newspaperViewHasBorder) {
    console.log('❌ FAIL: newspaper-view still has a border property');
  } else {
    console.log('✅ PASS: newspaper-view no longer has a border property');
  }
  
  // Test 2: Pin card should have a border
  const pinCardHasBorder = hasProperty(pinCardCSS, '\\.pin-card', 'border:\\s*1px\\s+solid\\s+black');
  
  if (pinCardHasBorder) {
    console.log('✅ PASS: pin-card has the correct border property');
  } else {
    console.log('❌ FAIL: pin-card does not have the required border property');
  }
  
  // Summary
  if (!newspaperViewHasBorder && pinCardHasBorder) {
    console.log('\n✅ SUCCESS: The border has been correctly moved from the container to each individual card');
  } else {
    console.log('\n❌ FAILURE: The border fix has not been correctly implemented');
  }
}

// Run the test
testCardBorderFix();