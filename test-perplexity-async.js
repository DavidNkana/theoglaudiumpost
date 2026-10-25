/**
 * Test script for the updated generateArticleFromSummary function
 * 
 * This script tests that the function makes a POST request to the correct endpoint
 * with the correct parameters.
 */

// Mock the API module
const mockPost = jest.fn();
jest.mock('./src/services/api', () => ({
  post: mockPost
}));

// Mock the API_ENDPOINTS
jest.mock('./src/config/api', () => ({
  API_ENDPOINTS: {
    PERPLEXITY: {
      GENERATE_ARTICLE_ASYNC: 'gemini/async/generate-article'
    }
  }
}));

// Import the function to test
const { generateArticleFromSummary } = require('./src/features/articles/PerplexityService');

describe('generateArticleFromSummary', () => {
  beforeEach(() => {
    // Clear mock calls before each test
    mockPost.mockClear();
  });

  it('should call api.post with the correct endpoint and parameters', async () => {
    // Arrange
    const summaryText = 'This is a test summary';
    mockPost.mockResolvedValue({ data: { taskId: '123456' } });

    // Act
    await generateArticleFromSummary(summaryText);

    // Assert
    expect(mockPost).toHaveBeenCalledWith(
      'gemini/async/generate-article',
      { prompt: summaryText }
    );
  });

  it('should return the response from the API', async () => {
    // Arrange
    const summaryText = 'This is a test summary';
    const expectedResponse = { data: { taskId: '123456' } };
    mockPost.mockResolvedValue(expectedResponse);

    // Act
    const result = await generateArticleFromSummary(summaryText);

    // Assert
    expect(result).toEqual(expectedResponse);
  });
});

console.log('Test script created. Run with: npm test test-perplexity-async.js');