# Media Endpoint Documentation

## Overview

The `/api/v1/media/{id}` endpoint has been updated to support specific image dimensions for different story types and to ensure that all images are returned with optimal quality and format.

## Changes Made

1. Added support for story types with predefined dimensions:
   - Top Story: 170 × 368 px
   - Featured Story: 170 × 272 px
   - Popular: 170 × 192 px

2. Added automatic quality and format optimization:
   - All images now include `q_auto` and `f_auto` parameters
   - This ensures optimal image quality and format for each device and browser

3. Improved response format:
   - The endpoint now always returns a JSON response with a URL
   - Binary data is no longer returned, ensuring consistent response format

## Usage Examples

### Basic Usage

```
GET /api/v1/media/123
```

Response:
```json
{
  "url": "https://res.cloudinary.com/dzrldiajp/image/upload/q_auto,f_auto/v1754156507/images/rhggczm73hgv1ppktsi1.png"
}
```

### With Story Type

```
GET /api/v1/media/123?storyType=top
```

Response:
```json
{
  "url": "https://res.cloudinary.com/dzrldiajp/image/upload/q_auto,f_auto,w_170,h_368/v1754156507/images/rhggczm73hgv1ppktsi1.png"
}
```

```
GET /api/v1/media/123?storyType=featured
```

Response:
```json
{
  "url": "https://res.cloudinary.com/dzrldiajp/image/upload/q_auto,f_auto,w_170,h_272/v1754156507/images/rhggczm73hgv1ppktsi1.png"
}
```

```
GET /api/v1/media/123?storyType=popular
```

Response:
```json
{
  "url": "https://res.cloudinary.com/dzrldiajp/image/upload/q_auto,f_auto,w_170,h_192/v1754156507/images/rhggczm73hgv1ppktsi1.png"
}
```

### With Custom Dimensions

```
GET /api/v1/media/123?width=600&height=400
```

Response:
```json
{
  "url": "https://res.cloudinary.com/dzrldiajp/image/upload/q_auto,f_auto,w_600,h_400/v1754156507/images/rhggczm73hgv1ppktsi1.png"
}
```

### With Custom Quality

```
GET /api/v1/media/123?quality=90
```

Response:
```json
{
  "url": "https://res.cloudinary.com/dzrldiajp/image/upload/q_90,f_auto/v1754156507/images/rhggczm73hgv1ppktsi1.png"
}
```

## Testing

To test the changes, you can use the following curl commands:

```bash
# Basic usage
curl -X GET "http://localhost:9011/laudium/api/v1/media/53"

# With story type
curl -X GET "http://localhost:9011/laudium/api/v1/media/53?storyType=top"
curl -X GET "http://localhost:9011/laudium/api/v1/media/53?storyType=featured"
curl -X GET "http://localhost:9011/laudium/api/v1/media/53?storyType=popular"

# With custom dimensions
curl -X GET "http://localhost:9011/laudium/api/v1/media/53?width=600&height=400"

# With custom quality
curl -X GET "http://localhost:9011/laudium/api/v1/media/53?quality=90"
```

## Cloudinary Transformation Reference

For more information on Cloudinary transformations, see the [Cloudinary documentation](https://cloudinary.com/documentation/image_transformations).

Common transformations:
- `q_auto`: Automatic quality optimization
- `f_auto`: Automatic format selection
- `w_<width>`: Width in pixels
- `h_<height>`: Height in pixels
- `c_crop`: Crop mode
- `c_fill`: Fill mode
- `c_scale`: Scale mode
- `g_auto`: Automatic gravity (focus)