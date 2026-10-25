# Self-Service Advert Manager

## Overview
The Self-Service Advert Manager enables local businesses to create, pay for, and manage their advertisements without admin intervention. This feature provides a streamlined process for businesses to promote their products and services to the Laudium community through customized ad creation, scheduling, and placement options.

## Core Functionality
1. **Ad Creation and Management**
   - Customized ad creation with title, description, image, and link URL
   - Ad scheduling with start and end dates
   - Status management (active/inactive)
   - Ad performance tracking (impressions and clicks)

2. **Campaign Management**
   - Group ads into campaigns for organized management
   - Track campaign performance metrics
   - Manage multiple campaigns simultaneously

3. **Placement Options**
   - Tiered "premium visibility" slots for featured placement
   - Various placement locations throughout the application
   - Pricing based on placement visibility and duration

4. **Payment Integration**
   - PayFast integration for secure payments
   - Cost calculation based on placement and duration
   - Payment history and receipts

## Technical Implementation

### Components
- **Ad Management Interface**: `src/views/Business/Ads/Index.vue`
- **Ad Creation/Editing Form**: `src/views/Business/Ads/Partials/AdForm.vue`
- **Ad Table Component**: `src/views/Business/Ads/Partials/AdsTable.vue`
- **Ad Service**: `src/services/ads.js`
- **Business Service**: `src/services/businesses.js`

### Key Functions

#### Ad Management
```javascript
// Fetch ads with filtering and pagination
export const getAds = ({
  page = 0,
  size = 10,
  search = "",
  status = "",
  placement = "",
}) =>
  api.get(
    `/ads?search=${search}&placement=${placement}&status=${status}&size=${size}&page=${page}`
  );

// Create a new ad
export const createAd = (data) => api.post("/ads/create", data);

// Edit an existing ad
export const editAd = (id, data) => api.put(`/ads/${id}`, data);

// Delete an ad
export const removeAd = (id) => api.delete(`/ads/${id}`);
```

#### Campaign Management
```javascript
// Fetch campaigns
export const getCampaigns = (
  tab = "all",
  page = "0",
  search = "",
  category = ""
) => api.get(`/campaigns?search=${search}`);

// Create a new campaign
export const createCampaign = (data) => api.post("/campaigns/create", data);
```

#### Ad Tracking
```javascript
// Track ad clicks
export const trackClick = (id) => api.put(`/ads/${id}/click`);

// Track ad impressions
export const trackImpression = (id) => api.put(`/ads/${id}/impression`);
```

### Workflow
1. **Ad Creation**:
   - Business user logs in to their account
   - User navigates to the Ad Management section
   - User creates a new ad by filling out the ad form
   - User selects placement options and scheduling
   - System calculates the cost based on placement and duration
   - User completes payment through PayFast integration
   - Ad is created and scheduled for the selected dates

2. **Ad Management**:
   - User can view all their ads in the Ad Management interface
   - Filtering options allow for easy navigation of ads
   - User can edit, pause, or delete ads as needed
   - Performance metrics show impressions and clicks

3. **Campaign Management**:
   - User can create campaigns to group related ads
   - Campaign performance can be tracked across all ads
   - Multiple campaigns can be managed simultaneously

## Integration Points
- **PayFast API**: External payment gateway for processing ad payments
- **Analytics Service**: Tracking of ad impressions and clicks
- **User Authentication**: Business user accounts and permissions
- **Content Storage**: Ad images and metadata stored in database

## Security and Performance Considerations
- Secure payment processing through PayFast
- Input validation for all form fields
- Image optimization for ad creatives
- Rate limiting for API calls
- Access control based on user roles and permissions

## Future Enhancements
- Advanced targeting options based on user demographics
- A/B testing capabilities for ad variations
- Enhanced analytics dashboard for ad performance
- Automated recommendations for ad optimization
- Integration with social media platforms for wider reach