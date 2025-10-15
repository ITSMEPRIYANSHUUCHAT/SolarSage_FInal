# Pending Tasks & Incomplete Features

This document tracks all pending tasks, incomplete logic, and features that still need implementation in the SolarSage project.

---

## 🔴 Critical Pending Items

### 1. Real AI Integration
**Status**: Mock Implementation
**Priority**: High

**Current State**:
- Using simulated AI responses in `src/services/aiDataExtraction.ts`
- Mock data generation instead of actual OpenAI integration

**Required Work**:
- Implement actual OpenAI API calls in edge functions
- Create proper prompt engineering for bill extraction
- Handle API rate limits and errors
- Validate extracted data accuracy

**Files to Update**:
- `supabase/functions/process-pdf/index.ts`
- `src/services/aiDataExtraction.ts`

---

### 2. Solcast API Integration
**Status**: Partial Implementation
**Priority**: High

**Current State**:
- `solcastApi.ts` has basic API structure
- Not fully integrated with bill processing flow
- API key management exists but not enforced

**Required Work**:
- Complete Solcast API integration for historical data
- Implement forecast data fetching
- Add proper error handling for API failures
- Cache Solcast responses to reduce API calls
- Validate location coordinates before API calls

**Files to Update**:
- `src/utils/solcastApi.ts`
- `src/components/ImprovedInsightsPanel.tsx`
- `src/components/SolarComparator.tsx`

---

### 3. Database Model - Mongoose Integration
**Status**: Not Implemented
**Priority**: Medium

**Current State**:
- `src/models/CustomerInfo.ts` defines Mongoose schema
- `src/utils/dbConnect.ts` has connection logic
- **BUT**: Currently using Supabase PostgreSQL, not MongoDB

**Required Work**:
- Either remove Mongoose and fully commit to Supabase
- OR migrate to MongoDB Atlas if needed
- Update all database operations to use chosen system
- Remove conflicting code

**Decision Needed**: Choose between Supabase or MongoDB

**Files to Update/Remove**:
- `src/models/CustomerInfo.ts`
- `src/utils/dbConnect.ts`
- `src/services/customerService.ts`

---

## 🟡 Important Pending Features

### 4. Neighborhood Ranking Algorithm
**Status**: Mock Data
**Priority**: Medium

**Current State**:
- `SolarComparator.tsx` generates random ranking data
- No real comparison with actual neighbor data

**Required Work**:
- Define geographic boundaries for neighborhoods
- Aggregate real customer data for comparison
- Implement privacy-preserving ranking system
- Add filters (by location radius, system size, etc.)

**Implementation Plan**:
```typescript
// Needed: Database query to get neighbors
interface NeighborQuery {
  latitude: number;
  longitude: number;
  radius: number; // km
  systemSizeRange?: [number, number];
}

// Needed: Ranking calculation
function calculateNeighborhoodRank(
  userScore: number,
  neighborScores: number[]
): number {
  // Implementation needed
}
```

---

### 5. PDF Text Extraction Accuracy
**Status**: Basic Implementation
**Priority**: Medium

**Current State**:
- Using `pdf-parse` library in edge function
- Simple text extraction without OCR
- No handling for scanned PDFs or images

**Required Work**:
- Implement OCR for scanned bills
- Handle different bill formats (multiple utility companies)
- Improve table extraction for charges breakdown
- Add PDF validation (is it actually a bill?)

**Tools to Consider**:
- Tesseract.js for OCR
- pdf.js for better rendering
- Custom parsers for known bill formats

---

### 6. User Profile Management
**Status**: Basic Schema Only
**Priority**: Medium

**Current State**:
- `profiles` table exists in database
- Basic profile creation on signup
- No UI for profile editing

**Required Work**:
- Create profile editing page
- Add fields: display name, avatar, preferences
- Implement avatar upload to storage
- Add Solcast API key management UI
- User preferences (units, notifications, etc.)

**Files to Create**:
- `src/pages/Profile.tsx`
- `src/components/ProfileForm.tsx`

---

### 7. Error Handling & User Feedback
**Status**: Basic Toast Notifications
**Priority**: Medium

**Current State**:
- Using `sonner` for toast notifications
- Limited error messages
- No retry logic for failed operations

**Required Work**:
- Implement comprehensive error boundaries
- Add retry logic for API failures
- Better user feedback for processing states
- Handle edge cases (invalid PDFs, API timeouts)
- Add error logging service

**Files to Update**:
- All service files
- Add global error boundary component

---

## 🟢 Nice-to-Have Features

### 8. Real-time Processing Updates
**Status**: Not Implemented
**Priority**: Low

**Current State**:
- Static loading states
- No progress indicators

**Required Work**:
- Implement WebSocket or Supabase Realtime
- Show processing steps in real-time
- Add progress percentage

---

### 9. Data Export & Reporting
**Status**: Basic PDF Generation
**Priority**: Low

**Current State**:
- `pdfGenerator.ts` creates basic reports
- No CSV/Excel export
- No email delivery

**Required Work**:
- Add CSV export for records
- Email PDF reports to users
- Scheduled monthly reports
- Comparison reports (month-over-month)

---

### 10. Mobile Responsiveness
**Status**: Partial
**Priority**: Medium

**Current State**:
- Tailwind responsive classes used
- Not fully tested on mobile devices

**Required Work**:
- Comprehensive mobile testing
- Optimize charts for mobile
- Add mobile-specific navigation
- Test touch interactions

---

### 11. Accessibility (A11y)
**Status**: Basic
**Priority**: Medium

**Current State**:
- Some ARIA labels
- Keyboard navigation partially supported

**Required Work**:
- Full WCAG AA compliance
- Screen reader testing
- Keyboard navigation for all features
- Focus management
- Color contrast validation

---

### 12. Performance Optimization
**Status**: Not Optimized
**Priority**: Low

**Current State**:
- No image optimization
- No code splitting
- No caching strategy

**Required Work**:
- Implement lazy loading for routes
- Add image optimization
- Cache API responses
- Optimize bundle size
- Add service worker for offline support

---

## 🔧 Technical Debt

### 13. Type Safety
**Status**: Moderate
**Priority**: Medium

**Issues**:
- Some `any` types in codebase
- Missing type definitions for API responses
- Incomplete Zod schemas

**Required Work**:
- Remove all `any` types
- Add strict TypeScript config
- Complete Zod validation schemas
- Generate types from database schema

---

### 14. Testing
**Status**: No Tests
**Priority**: High

**Required Work**:
- Unit tests for utilities
- Integration tests for services
- E2E tests for critical flows
- Component tests
- API endpoint tests

**Setup Needed**:
- Vitest configuration
- React Testing Library
- Playwright for E2E

---

### 15. Documentation
**Status**: In Progress
**Priority**: Medium

**Required Work**:
- API endpoint documentation (OpenAPI/Swagger)
- Component documentation (Storybook)
- Code comments for complex logic
- Architecture decision records (ADRs)

---

## 📋 Data Model Improvements

### 16. Database Optimizations
**Status**: Basic Schema
**Priority**: Low

**Required Work**:
- Add database indexes for performance
- Implement data archiving for old records
- Add database triggers for automation
- Optimize queries with materialized views

---

### 17. Data Validation
**Status**: Partial
**Priority**: Medium

**Required Work**:
- Validate extracted bill data ranges
- Check for anomalies in consumption
- Validate coordinates before Solcast calls
- Add business logic validations

---

## 🔐 Security Enhancements

### 18. Rate Limiting
**Status**: Not Implemented
**Priority**: High

**Required Work**:
- Implement rate limiting for API endpoints
- Add request throttling for edge functions
- Limit guest mode uploads per IP
- Add CAPTCHA for signup

---

### 19. API Key Security
**Status**: Basic
**Priority**: Medium

**Current State**:
- API keys stored in Supabase secrets
- No key rotation

**Required Work**:
- Implement API key rotation
- Add key expiration
- Monitor API key usage
- Alert on suspicious activity

---

## 📊 Analytics & Monitoring

### 20. Usage Analytics
**Status**: Not Implemented
**Priority**: Low

**Required Work**:
- Track user engagement metrics
- Monitor feature usage
- Add conversion tracking
- Performance monitoring (Core Web Vitals)

---

### 21. Error Tracking
**Status**: Console Logs Only
**Priority**: Medium

**Required Work**:
- Integrate Sentry or similar
- Track frontend errors
- Monitor edge function failures
- Set up alerts for critical errors

---

## 🎯 Feature Enhancements

### 22. Multi-Bill Comparison
**Status**: Not Implemented
**Priority**: Low

**Idea**: Allow users to compare multiple months side-by-side

---

### 23. Bill Reminders
**Status**: Not Implemented
**Priority**: Low

**Idea**: Email reminders to upload monthly bills

---

### 24. Solar System Recommendations
**Status**: Not Implemented
**Priority**: Low

**Idea**: Recommend solar panel upgrades based on analysis

---

### 25. Community Features
**Status**: Not Implemented
**Priority**: Low

**Ideas**:
- Community forum
- Share tips
- Public leaderboards (opt-in)

---

## 📝 Summary

**Total Pending Items**: 25
- **Critical**: 3
- **High Priority**: 6
- **Medium Priority**: 10
- **Low Priority**: 6

**Estimated Effort**: 3-4 months of development work

**Recommended Priority Order**:
1. Real AI Integration (Critical)
2. Solcast API Integration (Critical)
3. Database Model Decision (Critical)
4. Error Handling & Testing (High)
5. Neighborhood Ranking (Medium)
6. User Profile Management (Medium)
