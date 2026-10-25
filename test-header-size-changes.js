/**
 * Test script for header size changes
 * 
 * This script verifies that the CSS properties for making the header larger
 * have been correctly applied to the Header.vue component.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current file path and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the Header.vue file
const headerFilePath = path.join(__dirname, 'src', 'components', 'Header.vue');

// Read the file content
try {
  const fileContent = fs.readFileSync(headerFilePath, 'utf8');
  console.log('Successfully read Header.vue file');
  
  // Test 1: Check if logo dimensions were increased
  const logoImgRegex = /<img[^>]*src="\/logo\/Lauduim Header Logo\.png"[^>]*height="(\d+)"[^>]*width="(\d+)"[^>]*>/;
  const logoMatch = fileContent.match(logoImgRegex);
  
  if (logoMatch) {
    const height = parseInt(logoMatch[1]);
    const width = parseInt(logoMatch[2]);
    
    console.log(`Logo dimensions: ${width}x${height}px`);
    
    if (height === 55 && width === 175) {
      console.log('✅ PASS: Logo dimensions have been increased to 55x175px');
    } else {
      console.log(`❌ FAIL: Logo dimensions are ${width}x${height}px, expected 55x175px`);
    }
  } else {
    console.log('❌ FAIL: Could not find logo image tag in Header.vue');
  }
  
  // Test 2: Check if app-header padding was added
  const appHeaderRegex = /\.app-header\s*{[^}]*padding:\s*(\d+)px\s+(\d+)[^}]*}/s;
  const appHeaderMatch = fileContent.match(appHeaderRegex);
  
  if (appHeaderMatch) {
    const paddingTop = parseInt(appHeaderMatch[1]);
    const paddingRight = parseInt(appHeaderMatch[2]);
    
    console.log(`app-header padding: ${paddingTop}px ${paddingRight}`);
    
    if (paddingTop === 8 && paddingRight === 0) {
      console.log('✅ PASS: app-header padding has been set to 8px 0');
    } else {
      console.log(`❌ FAIL: app-header padding is ${paddingTop}px ${paddingRight}, expected 8px 0`);
    }
  } else {
    console.log('❌ FAIL: Could not find app-header padding in Header.vue');
  }
  
  // Test 3: Check if header-logo properties were adjusted
  const headerLogoRegex = /\.header-logo\s*{[^}]*max-height:\s*(\d+)px[^}]*padding-top:\s*(\d+)px[^}]*padding-bottom:\s*(\d+)px[^}]*}/s;
  const headerLogoMatch = fileContent.match(headerLogoRegex);
  
  if (headerLogoMatch) {
    const maxHeight = parseInt(headerLogoMatch[1]);
    const paddingTop = parseInt(headerLogoMatch[2]);
    const paddingBottom = parseInt(headerLogoMatch[3]);
    
    console.log(`header-logo properties: max-height=${maxHeight}px, padding-top=${paddingTop}px, padding-bottom=${paddingBottom}px`);
    
    if (maxHeight === 70 && paddingTop === 5 && paddingBottom === 5) {
      console.log('✅ PASS: header-logo properties have been adjusted correctly');
    } else {
      console.log(`❌ FAIL: header-logo properties are not as expected`);
      console.log(`  Expected: max-height=70px, padding-top=5px, padding-bottom=5px`);
      console.log(`  Actual: max-height=${maxHeight}px, padding-top=${paddingTop}px, padding-bottom=${paddingBottom}px`);
    }
  } else {
    console.log('❌ FAIL: Could not find header-logo properties in Header.vue');
  }
  
  // Summary
  console.log('\nSummary of changes:');
  console.log('1. Increased logo dimensions from 47x150px to 55x175px');
  console.log('2. Added padding of 8px to the top and bottom of the header');
  console.log('3. Increased logo max-height from 60px to 70px');
  console.log('4. Increased logo padding from 2px to 5px on top and bottom');
  console.log('\nThese changes collectively make the header larger while maintaining its design and functionality.');
  
} catch (error) {
  console.error('Error reading or parsing Header.vue file:', error);
}