/**
 * Test: article-by-ids service helper
 */

import axios from 'axios';
import { getSourceArticlesByIds, getSourceArticleById } from './src/services/articles.js';

// Backup originals
const originalPost = axios.post;
const originalGet = axios.get;

let postCalls = [];
let getCalls = [];

axios.post = function(url, data, config) {
  postCalls.push({ url, data, config });
  // Return a resolved promise with a predictable shape
  return Promise.resolve({ data: { sourceArticles: [], requestedIds: data?.ids || [] } });
};

axios.get = function(url, config) {
  getCalls.push({ url, config });
  return Promise.resolve({ data: { id: '123', title: 'Demo' } });
};

async function run() {
  console.log('=== Testing getSourceArticlesByIds ===');
  postCalls = [];

  const ids = ['1','2','3'];
  const res = await getSourceArticlesByIds(ids, 'gpt');

  const call = postCalls[0];
  const expectedUrl = 'chatgpt/sourceArticles/byIds';

  console.log('Expected URL:', expectedUrl);
  console.log('Actual URL:', call?.url);
  console.log('Expected payload.ids:', JSON.stringify(ids));
  console.log('Actual payload.ids:', JSON.stringify(call?.data?.ids));

  if (call?.url === expectedUrl && JSON.stringify(call?.data?.ids) === JSON.stringify(ids)) {
    console.log('✅ PASS: getSourceArticlesByIds forms correct request');
  } else {
    console.log('❌ FAIL: getSourceArticlesByIds request mismatch');
  }

  console.log('\n=== Testing getSourceArticleById ===');
  getCalls = [];
  const gid = '42';
  await getSourceArticleById(gid, 'gpt');

  const gcall = getCalls[0];
  const expectedGetUrl = `chatgpt/sourceArticles/${gid}`;
  console.log('Expected GET URL:', expectedGetUrl);
  console.log('Actual GET URL:', gcall?.url);
  if (gcall?.url === expectedGetUrl) {
    console.log('✅ PASS: getSourceArticleById forms correct request');
  } else {
    console.log('❌ FAIL: getSourceArticleById request mismatch');
  }

  // Restore axios
  axios.post = originalPost;
  axios.get = originalGet;
}

run();
