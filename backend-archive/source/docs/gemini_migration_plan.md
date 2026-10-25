# Gemini Migration Implementation Plan

**Project:** Laudiumbiz API  
**Migration:** Perplexity → Gemini 2.5 Pro  
**Date:** August 4, 2025

## Overview

This document outlines the implementation plan for migrating all Perplexity API routes to Gemini 2.5 Pro, broken down into 4 sprints.

## Migration Goals

1. Replace all Perplexity routes with Gemini 2.5 Pro equivalents
2. Ensure all Gemini routes use grounding via GoogleSearch tool
3. Structure prompts to be JSON-compliant
4. Stream and safely parse API responses
5. Match output format to the Perplexity contract where applicable
6. Duplicate all routes under new paths (`/api/v1/gemini/...` or `/api/gemini/sourceArticles/...`)

## Prerequisites

- Google Cloud Platform account with Vertex AI API access
- Gemini 2.5 Pro API key
- Java SDK for Gemini (Google AI SDK)
- Test environment for validating the migration

## Sprint Plan

### Sprint 1: Core Infrastructure and Initial Routes

**Duration:** 1 week  
**Focus:** Setup infrastructure and implement core reasoning routes

**Tasks:**
1. Setup and Configuration
   - Add Gemini API key to application.properties
   - Add Google AI SDK dependencies to pom.xml
   - Create GeminiService class with base methods
   - Implement GoogleSearch tool integration

2. Implement Core Routes
   - Create GeminiController with base path `/api/v1/gemini`
   - Implement `/api/v1/gemini/generate-reasoning` endpoint
   - Implement `/api/v1/gemini/generate-text` endpoint

3. Testing
   - Create unit tests for GeminiService
   - Create integration tests for new endpoints
   - Compare responses with Perplexity endpoints for consistency

**Deliverables:**
- Working GeminiService with GoogleSearch integration
- Two functional Gemini endpoints with proper error handling
- Test suite for validating the implementation

### Sprint 2: Async Routes and Article Generation

**Duration:** 1 week  
**Focus:** Implement asynchronous routes and article generation

**Tasks:**
1. Implement Async Routes
   - Add async support to GeminiService
   - Implement `/api/v1/gemini/async/generate-reasoning` endpoint
   - Implement `/api/v1/gemini/async/generate-text` endpoint

2. Implement Article Generation
   - Implement `/api/v1/gemini/generate-article` endpoint
   - Implement `/api/v1/gemini/async/generate-article` endpoint
   - Implement `/api/v1/gemini/article` endpoint
   - Implement `/api/v1/gemini/async/article` endpoint

3. Testing
   - Create unit tests for async methods
   - Create integration tests for article generation
   - Validate response format matches Perplexity contract

**Deliverables:**
- Functional async routes with proper error handling
- Article generation endpoints with metadata extraction
- Test suite for validating async and article generation

### Sprint 3: Source Article System

**Duration:** 1 week  
**Focus:** Implement source article routes

**Tasks:**
1. Create Source Article Controller
   - Create GeminiSourceArticleController with base path `/api/gemini/sourceArticles`
   - Implement source article model for Gemini responses

2. Implement Source Article Routes
   - Implement `/api/gemini/sourceArticles` endpoint
   - Implement `/api/gemini/sourceArticles/task/{taskId}` endpoint
   - Implement `/api/gemini/sourceArticles/custom` endpoint
   - Implement `/api/gemini/sourceArticles/all` endpoint

3. Testing
   - Create unit tests for source article methods
   - Create integration tests for source article endpoints
   - Validate source article format matches Perplexity contract

**Deliverables:**
- Functional source article routes with proper error handling
- Source article model compatible with Gemini responses
- Test suite for validating source article functionality

### Sprint 4: Investigative Journalism and Final Testing

**Duration:** 1 week  
**Focus:** Complete remaining routes and comprehensive testing

**Tasks:**
1. Implement Remaining Routes
   - Implement `/api/v1/gemini/investigative-journalism` endpoint
   - Implement `/api/v1/gemini/async/investigative-journalism` endpoint
   - Address any remaining edge cases or issues

2. Comprehensive Testing
   - Create end-to-end tests for all routes
   - Perform load testing to ensure performance
   - Validate all response formats match Perplexity contract

3. Documentation and Finalization
   - Update Swagger documentation for all new endpoints
   - Create user documentation for the new Gemini routes
   - Prepare monitoring and logging for production

**Deliverables:**
- All routes fully implemented and tested
- Comprehensive test suite for all functionality
- Complete documentation for the new Gemini implementation

## Testing Strategy

1. **Unit Testing**
   - Test each method in GeminiService independently
   - Mock Gemini API responses for predictable testing
   - Validate error handling and edge cases

2. **Integration Testing**
   - Test each endpoint with real Gemini API calls
   - Compare responses with Perplexity endpoints
   - Validate response format and structure

3. **End-to-End Testing**
   - Test complete user flows using the new endpoints
   - Validate asynchronous job processing
   - Test error scenarios and recovery

4. **Performance Testing**
   - Measure response times compared to Perplexity
   - Test concurrent requests to ensure scalability
   - Validate streaming performance for large responses

## Rollback Plan

In case of critical issues during or after the migration:

1. **Immediate Issues**
   - If a specific Gemini endpoint fails, route traffic back to the corresponding Perplexity endpoint
   - Log the failure and continue with the migration of other endpoints

2. **Systematic Issues**
   - If multiple Gemini endpoints fail, pause the migration
   - Investigate the root cause and address the issues
   - Resume the migration once the issues are resolved

3. **Post-Deployment Issues**
   - Monitor error rates and performance metrics
   - If error rates exceed threshold, route traffic back to Perplexity endpoints
   - Address issues and redeploy the fixed Gemini implementation

## Success Metrics

The migration will be considered successful if:

1. All Gemini endpoints return valid responses with proper formatting
2. Response times are comparable to or better than Perplexity
3. Error rates are below 1% for all endpoints
4. All tests pass with at least 95% coverage
5. User feedback indicates satisfaction with the new implementation