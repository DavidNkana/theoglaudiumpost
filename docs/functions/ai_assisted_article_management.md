# AI-Assisted Article Management

## Overview
The AI-Assisted Article Management module enables content creators to leverage artificial intelligence for streamlining the article creation process. This feature combines AI-generated content with human editorial oversight to produce high-quality, locally relevant articles efficiently.

## Core Functionality
1. **AI-Assisted Content Generation**
   - Auto-draft generation via GPT-4o integration
   - Conversational refinement of article content
   - HTML-formatted output with proper semantic structure

2. **AI-Generated Thumbnails**
   - Automatic thumbnail generation based on article title and summary
   - Image processing to create appropriate thumbnail sizes

3. **Human Editorial Workflow**
   - Intuitive editor for human review and fact-checking
   - Refinement history tracking for iterative improvements
   - Final approval and publishing controls

## Technical Implementation

### Components
- **Article Creation Interface**: `src/views/Admin/Articles/Create.vue`
- **Article Editing Interface**: `src/views/Admin/Articles/Edit.vue`
- **Article Service**: `src/services/articles.js`

### Key Functions

#### Article Generation
```javascript
// Generate article content using GPT
export const generateArticle = async (messages) => {
  // Makes API request to GPT with conversation history
  // Returns HTML content and improved summary
}
```

#### Thumbnail Generation
```javascript
// Generate article thumbnail using AI
export const generateArticleThumbnail = (prompt) => {
  // Makes API request to generate image based on article content
}
```

#### Refinement Process
```javascript
// Submit refinement request
const submitRefinement = async () => {
  // Adds user refinement to message history
  // Calls generateArticle with updated context
  // Updates article content with refined version
}
```

### Workflow
1. **Content Creation**:
   - Editor initiates article creation with topic/title
   - AI generates initial draft with proper HTML formatting
   - System maintains conversation history for context

2. **Content Refinement**:
   - Editor reviews AI-generated content
   - Editor provides natural language refinement instructions
   - AI refines content based on instructions and previous context
   - Process repeats until content meets quality standards

3. **Thumbnail Generation**:
   - AI generates thumbnail image based on article title and summary
   - System processes image to create appropriate sizes
   - Editor can approve or replace with manual upload

4. **Publishing**:
   - Editor adds metadata (category, tags, etc.)
   - Article can be published immediately or scheduled
   - Optional push notifications can be enabled

## Integration Points
- **GPT API**: External API call to OpenAI's GPT-4o model
- **Image Generation API**: Backend service for AI thumbnail creation
- **Content Storage**: Articles stored in database with version history
- **Frontend Editor**: Rich text editor for content refinement

## Security and Performance Considerations
- API keys stored in environment variables
- Rate limiting for API calls
- Error handling for failed generation attempts
- Caching of generated content to reduce API usage

## Future Enhancements
- Enhanced context gathering from multiple sources
- Improved image generation with more specific prompts
- Automated fact-checking against trusted sources
- Style customization based on article category