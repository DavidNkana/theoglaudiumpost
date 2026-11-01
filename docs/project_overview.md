# Laudium Biz App - Project Overview

## Introduction
The Laudium Biz App is a digital news and community-engagement hub designed specifically for Laudium, a culturally rich suburb in South Africa. The platform aims to modernize local news distribution by transitioning from traditional print newspapers and WhatsApp groups to a centralized digital platform available as both a Progressive Web App (PWA) and native Android application.

## Core Purpose
- Streamline discovery and distribution of local news
- Empower residents and local businesses to consume and contribute content
- Provide modern tools (analytics) to inform decisions and drive engagement

## Key Stakeholders
- **Residents & Community Contributors**: Citizens who submit tips, stories, photos, and events
- **Local Businesses & Advertisers**: Small shops and entrepreneurs seeking targeted ad placements
- **Editorial Team & Moderators**: Curators who refine content and ensure quality

## System Architecture

The platform runs on **Supabase** (PostgreSQL, Auth, Storage, Row Level
Security). The Vue frontend talks to Supabase directly; there is no separate
application server.

- **Content model**: articles, ads, categories, tags, media, announcements,
  events, businesses, campaigns, payments and profiles
- **Authorization**: Row Level Security. Readers can read published content;
  only administrators can create or change content.
- **Images**: article covers and ad creatives live in a public storage bucket
- **Accounts**: Supabase Auth. The `profiles` table carries the role
  (`admin` or `business`) that the security policies read

## Core Functionality
1. **Admin-Authored Article Management**
   - Every article is written, illustrated and published by an administrator
   - Rich editor with cover images uploaded to object storage

2. **Admin-Authored Advert Manager**
   - Administrators create, schedule and price every ad in the admin dashboard
   - Tiered premium visibility options

3. **Search**
   - Keyword search across articles, categories and tags
   - Archive browsing by date, category and tag

4. **Community News Submission Portal**
   - Web form for text, images, and video uploads
   - Moderation workflow for content review

5. **Push Notifications**
   - Geotargeted alerts for local events and breaking news
   - Category-based opt-in preferences

6. **YouTube Integration**
   - Embedded local video reporting
   - Analytics on watch-time and engagement

7. **Analytics & Reporting Dashboard**
   - Real-time metrics on readership and ad performance
   - Exportable reports for stakeholders

8. **Android + PWA Compatibility**
   - Offline caching via service workers
   - Native-like experience through Android wrapper

## Unique Differentiators
- **Community-First Design**: Blends professional journalism with grassroots reporting
- **Human Editorial Ownership**: Every story is written and published by the editorial team
- **Local Monetization Engine**: Affordable ad model for small businesses
- **Platform Agnosticism**: Seamless experience across browser and Android environments

## Monetization Strategy
The platform is designed to be financially sustainable through:
- **Ad Revenue**: Display, video, and featured listing packages
- **Premium Visibility**: Subscription plans for priority placement
- **Recurring Placements**: Discounted rates for monthly commitments

## Conclusion
The Laudium Biz App represents more than just a news platform—it's a digital infrastructure for community building, combining cutting-edge technology with the real-world needs of its users.