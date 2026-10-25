# GPT-Powered Deep Search

## Overview
The GPT-Powered Deep Search module enables users to search through the Laudium Biz App's content using natural language queries. This feature leverages GPT technology to understand user intent and provide more relevant search results than traditional keyword-based search. It also enhances article generation by providing contextual information from the search results.

## Core Functionality
1. **Natural Language Query Processing**
   - Understands conversational and keyword-based search queries
   - Interprets user intent beyond exact keyword matching
   - Handles complex queries with multiple parameters

2. **Semantic Search Capabilities**
   - Finds content based on meaning rather than exact word matches
   - Recognizes synonyms and related concepts
   - Ranks results by relevance to the query intent

3. **Search Results Presentation**
   - Displays results with title, excerpt, and publication date
   - Categorizes results for easier navigation
   - Supports pagination for large result sets

4. **Integration with Article Generation**
   - Provides context snippets from search results for AI-assisted article creation
   - Enhances article quality with relevant background information
   - Enables fact-checking against existing content

## Technical Implementation

### Components
- **Search Interface**: `src/views/Search/Search.vue`
- **Article Service**: `src/services/articles.js`

### Key Functions

#### Search Execution
```javascript
// Perform search with filtering and pagination
const performSearch = async (resetPage = true) => {
  if (resetPage) {
    currentPage.value = 1;
  }

  loading.value = true;
  searchPerformed.value = true;
  currentSearchTerm.value = searchQuery.value;

  // Update URL with search parameters
  router.push({
    path: "/search",
    query: {
      q: searchQuery.value,
      filter: activeFilter.value,
      page: currentPage.value,
    },
  });

  try {
    const response = await getArticles({
      page: currentPage.value - 1 < 0 ? 0 : currentPage.value - 1,
      search: searchQuery.value,
      category: activeFilter.value,
      size: 10,
    });
    // Process and display search results
  } catch (error) {
    // Handle errors
  } finally {
    loading.value = false;
  }
};
```

#### Article Generation with Search Context
```javascript
/**
 * Generates a Laudium-style article using GPT and Deep Search context
 * @param {string} topic - The topic of the article
 * @param {string[]} context - Array of context snippets from Deep Search
 * @returns {Promise<string>} - The generated article content
 */
export const generateArticle = async (messages) => {
  try {
    const response = await axios.post(
      import.meta.env.VITE_GPT_API_URL,
      {
        model: "gpt-4o",
        temperature: 0.7,
        messages,
        max_tokens: 2000,
      },
      {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_GPT_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    
    const rawContent = response.data.choices[0].message.content.trim();
    const { html, summary } = parseArticleResponse(rawContent);

    return {
      html: stripCodeBlockMarkers(html),
      summary,
    };
  } catch (error) {
    console.error(
      "Article generation failed:",
      error.response?.data || error.message
    );
    return null;
  }
};
```

### Workflow
1. **Search Initiation**:
   - User enters a natural language query in the search box
   - User can optionally filter by category
   - System processes the query to understand intent

2. **Results Processing**:
   - Backend API processes the search query (potentially using GPT)
   - Results are ranked by relevance to the query
   - Pagination is applied for large result sets

3. **Results Display**:
   - Search results are displayed with title, excerpt, and date
   - User can navigate through paginated results
   - User can refine search with filters

4. **Integration with Article Creation**:
   - When creating articles, the system can use Deep Search to gather context
   - Search results provide background information for the article topic
   - GPT uses this context to generate more accurate and relevant content

## Integration Points
- **GPT API**: External API call to OpenAI's GPT-4o model
- **Backend Search API**: Processes search queries and returns relevant results
- **Article Generation**: Uses search results as context for content creation
- **URL Parameters**: Enables shareable search links with query parameters

## Security and Performance Considerations
- API keys stored in environment variables
- Rate limiting for search queries
- Caching of common search results to improve performance
- Input validation to prevent injection attacks
- Error handling for failed searches

## Future Enhancements
- Advanced filtering options (date range, content type, etc.)
- Personalized search results based on user preferences
- Voice search capabilities
- Search suggestions and autocomplete
- Improved context gathering for article generation