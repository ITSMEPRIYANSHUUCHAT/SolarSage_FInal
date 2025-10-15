# API Endpoints Documentation

This document details all API endpoints, their methods, parameters, request/response formats, and purposes.

---

## Supabase Edge Functions

Base URL: `https://glgvubxgigvrczrifcuv.supabase.co/functions/v1`

### Authentication
All edge function requests require authentication via Bearer token:
```
Authorization: Bearer <SUPABASE_ANON_KEY>
```

---

## 📤 Upload PDF

### Endpoint
```
POST /upload-pdf
```

### Purpose
Uploads a PDF file to Supabase Storage and extracts text content using pdf-parse library.

### Request

**Method**: `POST`

**Headers**:
```
Content-Type: multipart/form-data
Authorization: Bearer <SUPABASE_ANON_KEY>
```

**Body** (FormData):
```javascript
const formData = new FormData();
formData.append('file', pdfFile);
```

### Response

**Success (200)**:
```json
{
  "success": true,
  "extractedText": "Full text content extracted from PDF...",
  "fileName": "1234567890-bill.pdf",
  "storagePath": "1234567890-bill.pdf"
}
```

**Error (400 - No File)**:
```json
{
  "error": "No file uploaded"
}
```

**Error (500 - Processing Failed)**:
```json
{
  "error": "Failed to process PDF",
  "details": "Error message"
}
```

### Implementation Details
- Uses `pdfjs-dist` library for PDF parsing
- Uploads original PDF to `pdfs` storage bucket
- Returns extracted text for further AI processing
- File size limit: 20MB

---

## 🤖 Process PDF with AI

### Endpoint
```
POST /process-pdf
```

### Purpose
Processes extracted PDF text using AI to extract structured bill data, generate insights, and store results in the database.

### Request

**Method**: `POST`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer <SUPABASE_ANON_KEY>
```

**Body**:
```json
{
  "pdfText": "Extracted text from PDF...",
  "fileName": "bill.pdf"
}
```

### Response

**Success (200)**:
```json
{
  "success": true,
  "billData": {
    "accountNumber": "ACC123456",
    "billingPeriod": "Jan 1, 2024 - Jan 31, 2024",
    "dueDate": "Feb 15, 2024",
    "totalAmount": 3250.50,
    "energyUsage": 450,
    "solarGeneration": 380,
    "previousBalance": 0,
    "location": {
      "latitude": 28.7041,
      "longitude": 77.1025,
      "address": "New Delhi, India"
    },
    "rates": {
      "Tier 1 (0-500 kWh)": 6.50,
      "Tier 2 (500-1000 kWh)": 7.50
    },
    "chargesBreakdown": {
      "Energy Charges": 2925.00,
      "Fixed Charges": 200.00,
      "Taxes": 125.50
    }
  },
  "insights": {
    "summary": "Your solar system generated 380 kWh this month...",
    "solar": {
      "totalGeneration": 380,
      "dailyAverage": 12.26,
      "efficiency": 84.5,
      "performanceScore": 92,
      "potentialSavings": 450
    },
    "cost": {
      "totalBill": 3250.50,
      "solarSavings": 2470.00,
      "netCost": 780.50,
      "savingsPercentage": 76
    },
    "insights": [
      {
        "type": "info",
        "title": "Great Solar Performance",
        "description": "Your system is performing 92% of expected output"
      }
    ]
  },
  "dbRecord": {
    "id": "uuid-here",
    "user_id": "user-uuid",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Error (401 - Unauthorized)**:
```json
{
  "error": "Unauthorized - User must be authenticated"
}
```

**Error (500 - Processing Failed)**:
```json
{
  "error": "Failed to process PDF",
  "details": "Specific error message"
}
```

### Implementation Details
- Requires authenticated user (checks auth header)
- Uses OpenAI API for data extraction (currently mocked)
- Validates extracted data structure
- Stores results in `customer_info` table
- Links record to authenticated user

---

## 🗄️ Database Tables (via Supabase Client)

### customer_info

**Purpose**: Store processed bill analysis data

#### Get All Records
```typescript
const { data, error } = await supabase
  .from('customer_info')
  .select('*')
  .order('created_at', { ascending: false });
```

**Response**:
```json
[
  {
    "id": "uuid",
    "user_id": "user-uuid",
    "account_number": "ACC123456",
    "billing_period": "Jan 2024",
    "total_amount": 3250.50,
    "energy_usage": 450,
    "solar_generation": 380,
    "performance_score": 92,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
]
```

#### Get Single Record
```typescript
const { data, error } = await supabase
  .from('customer_info')
  .select('*')
  .eq('id', recordId)
  .single();
```

#### Create Record
```typescript
const { data, error } = await supabase
  .from('customer_info')
  .insert({
    user_id: userId,
    account_number: "ACC123456",
    billing_period: "Jan 2024",
    total_amount: 3250.50,
    // ... other fields
  })
  .select()
  .single();
```

#### Delete Record
```typescript
const { error } = await supabase
  .from('customer_info')
  .delete()
  .eq('id', recordId);
```

**RLS Policies**:
- Users can only SELECT their own records
- Users can only INSERT with their own user_id
- Users can only DELETE their own records

---

### profiles

**Purpose**: Store user profile information

#### Get Profile
```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', userId)
  .single();
```

**Response**:
```json
{
  "id": "uuid",
  "user_id": "user-uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

#### Update Profile
```typescript
const { data, error } = await supabase
  .from('profiles')
  .update({
    full_name: "Jane Doe",
    updated_at: new Date().toISOString()
  })
  .eq('user_id', userId);
```

---

## 🔐 Authentication Endpoints (Supabase Auth)

### Sign Up with Email
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword123'
});
```

### Sign In with OTP
```typescript
// Request OTP
const { error } = await supabase.auth.signInWithOtp({
  email: 'user@example.com'
});

// Verify OTP
const { data, error } = await supabase.auth.verifyOtp({
  email: 'user@example.com',
  token: '123456',
  type: 'email'
});
```

### Sign In with Google OAuth
```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'https://yourapp.com'
  }
});
```

### Sign Out
```typescript
const { error } = await supabase.auth.signOut();
```

### Get Current Session
```typescript
const { data: { session } } = await supabase.auth.getSession();
```

---

## 📦 Storage Endpoints (Supabase Storage)

### Upload File
```typescript
const { data, error } = await supabase.storage
  .from('pdfs')
  .upload('path/to/file.pdf', fileBuffer, {
    contentType: 'application/pdf'
  });
```

### Download File
```typescript
const { data, error } = await supabase.storage
  .from('pdfs')
  .download('path/to/file.pdf');
```

### Get Public URL
```typescript
const { data } = supabase.storage
  .from('pdfs')
  .getPublicUrl('path/to/file.pdf');
```

### Delete File
```typescript
const { error } = await supabase.storage
  .from('pdfs')
  .remove(['path/to/file.pdf']);
```

---

## 🌤️ External APIs

### Solcast API (Not Fully Implemented)

#### Get Historical Solar Data
```
GET https://api.solcast.com.au/data/historic/pv_power/estimated_actuals
```

**Query Parameters**:
```
latitude: 28.7041
longitude: 77.1025
capacity: 5.0 (kW)
start: 2024-01-01T00:00:00Z
end: 2024-01-31T23:59:59Z
format: json
api_key: <SOLCAST_API_KEY>
```

**Response**:
```json
{
  "estimated_actuals": [
    {
      "period_end": "2024-01-01T00:30:00Z",
      "period": "PT30M",
      "pv_estimate": 0.234
    }
  ]
}
```

---

## 📊 Rate Limits

- **Edge Functions**: 100 requests/minute per user
- **Database**: No hard limit (Supabase manages)
- **Storage**: 50MB/minute upload limit
- **Solcast API**: 50 requests/day (free tier)

---

## 🔒 Security

All endpoints implement:
- HTTPS encryption
- JWT-based authentication
- Row-level security for database
- CORS restrictions
- Input validation
- Rate limiting
