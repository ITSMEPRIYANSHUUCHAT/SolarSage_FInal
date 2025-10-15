# Project Files & Directory Structure

This document provides a comprehensive overview of every file and directory in the SolarSage project, including their purpose, dependencies, and relationships.

---

## 📁 Root Directory

```
solarsage/
├── .env                          # Environment variables
├── .gitignore                    # Git ignore rules
├── README.md                     # Main project documentation
├── package.json                  # NPM dependencies and scripts
├── package-lock.json             # Locked dependency versions
├── tsconfig.json                 # TypeScript configuration
├── tsconfig.app.json             # App-specific TS config
├── tsconfig.node.json            # Node-specific TS config
├── vite.config.ts                # Vite build configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── postcss.config.js             # PostCSS configuration
├── components.json               # shadcn/ui configuration
├── eslint.config.js              # ESLint rules
├── index.html                    # HTML entry point
├── docs/                         # Documentation files
├── public/                       # Static assets
├── src/                          # Source code
└── supabase/                     # Supabase configuration
```

---

## 🔧 Configuration Files

### `.env`
**Purpose**: Environment variables for local development
**Contains**:
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`

**Used By**: All files that need Supabase connection
**Security**: Never committed to Git (in .gitignore)

---

### `vite.config.ts`
**Purpose**: Vite build tool configuration
**Key Settings**:
- React plugin
- Path aliases (`@/` → `src/`)
- Development server settings
- Build optimization

**Dependencies**: None
**Used By**: Build process, dev server

---

### `tailwind.config.ts`
**Purpose**: Tailwind CSS configuration
**Key Features**:
- Custom color palette (extends `src/index.css`)
- Typography settings
- Animations
- Dark mode support

**Dependencies**: `src/index.css`
**Used By**: All component styling

---

### `tsconfig.json`
**Purpose**: TypeScript compiler configuration
**Key Settings**:
- Strict type checking
- ES2020 target
- Path mapping
- JSX support

**Dependencies**: None
**Used By**: All `.ts` and `.tsx` files

---

### `package.json`
**Purpose**: Project metadata and dependencies
**Scripts**:
- `dev`: Start development server
- `build`: Build for production
- `preview`: Preview production build
- `lint`: Run ESLint

**Dependencies**: 50+ packages (React, Supabase, UI libraries)

---

## 📂 Source Directory (`src/`)

```
src/
├── main.tsx                      # Application entry point
├── App.tsx                       # Root component
├── App.css                       # Root styles
├── index.css                     # Global styles & design tokens
├── vite-env.d.ts                 # Vite type definitions
├── components/                   # Reusable components
├── contexts/                     # React contexts
├── hooks/                        # Custom hooks
├── integrations/                 # External integrations
├── lib/                          # Utility libraries
├── models/                       # Data models
├── pages/                        # Page components
├── services/                     # API services
└── utils/                        # Utility functions
```

---

## 🚀 Entry Files

### `src/main.tsx`
**Purpose**: Application entry point, React DOM rendering
**Responsibilities**:
- Mount React app to DOM
- Setup React Router
- Wrap app with providers (Auth, Theme, Query)
- Define route structure

**Dependencies**:
- `App.tsx`
- `contexts/AuthContext.tsx`
- `components/theme-provider.tsx`
- All page components

**Code Structure**:
```typescript
ReactDOM.createRoot(root).render(
  <AuthProvider>
    <ThemeProvider>
      <QueryClientProvider>
        <Router>
          <Routes>...</Routes>
        </Router>
      </QueryClientProvider>
    </ThemeProvider>
  </AuthProvider>
);
```

---

### `src/App.tsx`
**Purpose**: Root component wrapper
**Responsibilities**:
- Import global styles
- Render child routes
- Setup toast notifications

**Dependencies**:
- `App.css`
- `components/ui/toaster.tsx`

---

### `src/index.css`
**Purpose**: Global styles and design system tokens
**Contains**:
- CSS custom properties (colors, spacing)
- Tailwind base, components, utilities
- Dark/light mode variables
- Font imports

**Used By**: All components (via Tailwind)

**Key Sections**:
```css
:root {
  --background: ...;
  --foreground: ...;
  --primary: ...;
}

.dark {
  /* Dark mode overrides */
}
```

---

## 📄 Pages (`src/pages/`)

### `src/pages/Index.tsx`
**Purpose**: Main dashboard page
**Responsibilities**:
- PDF upload interface
- Processing flow display
- Insights panel
- PDF viewer

**Dependencies**:
- `components/UploadArea.tsx`
- `components/ProcessingFlow.tsx`
- `components/ImprovedInsightsPanel.tsx`
- `components/PDFViewer.tsx`
- `services/supabaseService.ts`
- `contexts/AuthContext.tsx`

**State Management**:
- Processing state (idle, uploading, processing, complete)
- Bill data
- Insights data
- Error handling

**Used By**: Protected route in `main.tsx`

---

### `src/pages/Auth.tsx`
**Purpose**: Authentication page
**Responsibilities**:
- Display login/signup forms
- OTP verification
- Google OAuth button
- Guest mode entry

**Dependencies**:
- `components/OTPVerification.tsx`
- `contexts/AuthContext.tsx`
- `components/ui/button.tsx`
- `components/ui/card.tsx`

**Flow**:
1. User enters email
2. OTP sent
3. Verification component shown
4. On success → redirect to dashboard

---

### `src/pages/GuestLanding.tsx`
**Purpose**: Guest mode landing page
**Responsibilities**:
- Explain guest mode features
- Show upload limit (3 PDFs)
- Prompt to sign up

**Dependencies**:
- `contexts/AuthContext.tsx`
- `components/GuestModeNotice.tsx`
- UI components

---

### `src/pages/Records.tsx`
**Purpose**: Customer records page
**Responsibilities**:
- Display historical bill analyses
- Allow record deletion
- Protected route (auth required)

**Dependencies**:
- `components/CustomerRecords.tsx`
- `services/supabaseService.ts`
- `contexts/AuthContext.tsx`

---

### `src/pages/NotFound.tsx`
**Purpose**: 404 error page
**Responsibilities**:
- Show error message
- Link back to home

**Dependencies**: UI components only

---

## 🧩 Components (`src/components/`)

### Core Components

#### `src/components/UploadArea.tsx`
**Purpose**: PDF file upload interface
**Responsibilities**:
- Drag & drop functionality
- File validation
- Upload to edge function
- Progress feedback

**Dependencies**:
- `react-dropzone`
- `services/supabaseService.ts`
- `services/guestService.ts`
- `contexts/AuthContext.tsx`

**Props**:
```typescript
interface UploadAreaProps {
  onUploadComplete: (data: { extractedText: string; fileName: string }) => void;
  isProcessing: boolean;
}
```

**Used By**: `pages/Index.tsx`

---

#### `src/components/ProcessingFlow.tsx`
**Purpose**: Visual processing status indicator
**Responsibilities**:
- Show current processing step
- Display progress
- Handle errors

**Props**:
```typescript
interface ProcessingFlowProps {
  status: 'uploading' | 'extracting' | 'analyzing' | 'complete';
  error?: string;
}
```

**Used By**: `pages/Index.tsx`

---

#### `src/components/InsightsPanel.tsx`
**Purpose**: Display basic bill analysis results
**Responsibilities**:
- Show key metrics
- Display insights
- Tabbed interface

**Dependencies**:
- `utils/insightsGenerator.ts`
- UI components (Card, Tabs, Badge)

**Props**:
```typescript
interface InsightsPanelProps {
  insights: InsightsData;
  billData: BillData;
}
```

**Used By**: `pages/Index.tsx`

---

#### `src/components/ImprovedInsightsPanel.tsx`
**Purpose**: Enhanced insights with charts and comparisons
**Responsibilities**:
- Display detailed metrics
- Show charts (Recharts)
- Solar comparator integration
- PDF download

**Dependencies**:
- `components/SolarComparator.tsx`
- `components/InsightsDocument.tsx`
- `recharts`
- UI components

**Props**: Same as `InsightsPanel.tsx`

**Used By**: `pages/Index.tsx` (preferred over basic panel)

---

#### `src/components/SolarComparator.tsx`
**Purpose**: Solar performance comparison widget
**Responsibilities**:
- Display performance score
- Show neighborhood rankings
- Generate mock comparison data

**Dependencies**:
- `recharts` (BarChart)
- UI components

**Props**:
```typescript
interface SolarComparatorProps {
  actualGeneration: number;
  expectedGeneration: number;
}
```

**Used By**: `components/ImprovedInsightsPanel.tsx`

---

#### `src/components/OTPVerification.tsx`
**Purpose**: OTP input and verification
**Responsibilities**:
- 6-digit OTP input
- Auto-submit when complete
- Resend OTP functionality
- Error display

**Dependencies**:
- `components/ui/input-otp.tsx`
- `contexts/AuthContext.tsx`

**Props**:
```typescript
interface OTPVerificationProps {
  email: string;
  onVerificationComplete: () => void;
}
```

**Used By**: `pages/Auth.tsx`

---

#### `src/components/CustomerRecords.tsx`
**Purpose**: Display table of customer records
**Responsibilities**:
- Fetch records from database
- Display in table format
- Delete functionality
- Loading/error states

**Dependencies**:
- `services/supabaseService.ts`
- `components/ui/table.tsx`
- `components/ui/button.tsx`

**Used By**: `pages/Records.tsx`

---

#### `src/components/PDFViewer.tsx`
**Purpose**: Display uploaded PDF file
**Responsibilities**:
- Load PDF from storage
- Display in iframe or viewer

**Props**:
```typescript
interface PDFViewerProps {
  fileUrl: string;
}
```

**Used By**: `pages/Index.tsx`

---

#### `src/components/GuestModeNotice.tsx`
**Purpose**: Guest mode information banner
**Responsibilities**:
- Show remaining uploads
- Prompt to sign up

**Dependencies**: `contexts/AuthContext.tsx`

**Used By**: `pages/GuestLanding.tsx`, `pages/Index.tsx`

---

#### `src/components/InsightsDocument.tsx`
**Purpose**: Generate and download PDF report
**Responsibilities**:
- Trigger PDF generation
- Save data to database
- Auto-download on mount

**Dependencies**:
- `utils/pdfGenerator.ts`
- `services/customerService.ts`

**Props**:
```typescript
interface InsightsDocumentProps {
  insights: InsightsData;
  fileName: string;
  onComplete: () => void;
  billData: BillData;
}
```

**Used By**: `components/ImprovedInsightsPanel.tsx`

---

#### `src/components/ProtectedRoute.tsx`
**Purpose**: Route authentication guard
**Responsibilities**:
- Check if user is authenticated
- Redirect to auth page if not
- Allow access if authenticated

**Dependencies**: `contexts/AuthContext.tsx`

**Used By**: `main.tsx` (wraps protected routes)

---

#### `src/components/UserMenu.tsx`
**Purpose**: User profile dropdown menu
**Responsibilities**:
- Display user info
- Sign out button
- Navigation links

**Dependencies**:
- `contexts/AuthContext.tsx`
- UI components (DropdownMenu)

**Used By**: Navigation components

---

#### `src/components/SolcastApiKeyForm.tsx`
**Purpose**: Form to input Solcast API key
**Responsibilities**:
- Save API key to localStorage
- Validate key format

**Dependencies**: UI components

**Used By**: Settings or profile page (if implemented)

---

#### `src/components/SolcastForm.tsx`
**Purpose**: Form to configure Solcast settings
**Responsibilities**:
- Input location, capacity
- Save settings

**Dependencies**: `utils/solcastApi.ts`

**Used By**: Settings page (if implemented)

---

### UI Components (`src/components/ui/`)

**Purpose**: shadcn/ui reusable components
**Count**: 40+ components
**Examples**:
- `button.tsx` - Button component with variants
- `card.tsx` - Card container
- `dialog.tsx` - Modal dialogs
- `table.tsx` - Data tables
- `tabs.tsx` - Tabbed interfaces
- `toast.tsx` - Toast notifications

**Used By**: All page and feature components

**Key Pattern**:
```typescript
// All UI components use class-variance-authority
const buttonVariants = cva(
  "base-classes",
  {
    variants: { variant: {...}, size: {...} }
  }
);
```

---

## 🔗 Contexts (`src/contexts/`)

### `src/contexts/AuthContext.tsx`
**Purpose**: Global authentication state
**Provides**:
- `user`: Current user object
- `session`: Auth session
- `isGuest`: Guest mode flag
- `signIn()`, `signUp()`, `signOut()`
- `enterGuestMode()`, `exitGuestMode()`

**Dependencies**:
- `integrations/supabase/client.ts`

**Used By**: Nearly all components

**State**:
```typescript
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isGuest: boolean;
  guestPdfCount: number;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  enterGuestMode: () => void;
  incrementGuestPdfCount: () => void;
  exitGuestMode: () => void;
}
```

---

### `src/components/theme-provider.tsx`
**Purpose**: Dark/light mode management
**Provides**:
- `theme`: Current theme (light/dark/system)
- `setTheme()`: Change theme

**Dependencies**: `next-themes`

**Used By**: `main.tsx`, theme toggle components

---

## 🛠️ Services (`src/services/`)

### `src/services/supabaseService.ts`
**Purpose**: Supabase API interactions
**Exports**:
- `uploadPDF()`: Upload PDF to edge function
- `processPDFWithAI()`: Process PDF with AI
- `getAllCustomerRecords()`: Fetch records
- `deleteCustomerRecord()`: Delete record

**Dependencies**:
- `integrations/supabase/client.ts`
- `utils/pdfUtils.ts`
- `utils/insightsGenerator.ts`

**Used By**: Components that interact with backend

**Code Pattern**:
```typescript
export const uploadPDF = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/upload-pdf`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ANON_KEY}` },
    body: formData
  });
  
  return await response.json();
};
```

---

### `src/services/guestService.ts`
**Purpose**: Guest mode operations
**Exports**:
- `uploadPDFAsGuest()`: Mock upload for guests
- `processPDFWithAIAsGuest()`: Mock processing
- `getGuestPdfCount()`: Get count from localStorage
- `setGuestPdfCount()`: Set count

**Dependencies**: None (uses localStorage)

**Used By**: Components when `isGuest === true`

---

### `src/services/customerService.ts`
**Purpose**: Customer data CRUD operations
**Exports**:
- `createCustomerInfo()`
- `getAllCustomerInfo()`
- `getCustomerInfoById()`
- `deleteCustomerInfoById()`
- `convertToCustomerInfo()`: Data transformation

**Dependencies**:
- `models/CustomerInfo.ts`
- `utils/dbConnect.ts`

**Note**: Currently uses Mongoose (not active), should use Supabase

**Used By**: `components/InsightsDocument.tsx`, record management

---

### `src/services/aiDataExtraction.ts`
**Purpose**: AI data extraction logic (mock)
**Exports**:
- `extractDataWithAI()`: Simulate AI extraction

**Dependencies**: None

**Used By**: `services/supabaseService.ts`

**Implementation**:
```typescript
export const extractDataWithAI = async (pdfText: string): Promise<Partial<BillData>> => {
  // Validate content
  // Generate mock structured data
  return mockBillData;
};
```

---

## 🔧 Utils (`src/utils/`)

### `src/utils/pdfUtils.ts`
**Purpose**: PDF data structures and utilities
**Exports**:
- `BillData` interface
- PDF parsing helpers

**Dependencies**: None (type definitions)

**Used By**: All components working with bill data

---

### `src/utils/insightsGenerator.ts`
**Purpose**: Generate insights from bill data
**Exports**:
- `generateInsights()`: Main function
- `InsightsData` interface

**Dependencies**: `utils/pdfUtils.ts`

**Algorithm**:
```typescript
export const generateInsights = (billData: BillData): InsightsData => {
  // Calculate metrics
  const dailyAverage = totalGeneration / billingDays;
  const efficiency = (actual / expected) * 100;
  
  // Generate insight items
  const insights = [
    { type: 'info', title: '...', description: '...' },
    // ...
  ];
  
  return { summary, solar, cost, insights };
};
```

**Used By**: `services/supabaseService.ts`, edge functions

---

### `src/utils/pdfGenerator.ts`
**Purpose**: Generate downloadable PDF reports
**Exports**:
- `generatePDF()`: Create and download PDF

**Dependencies**: `jspdf`

**Used By**: `components/InsightsDocument.tsx`

**Process**:
1. Create new jsPDF document
2. Add pages with data
3. Insert charts (as images)
4. Format tables and text
5. Trigger download

---

### `src/utils/solcastApi.ts`
**Purpose**: Solcast API integration
**Exports**:
- `fetchSolcastData()`: Get solar data
- `getSolcastApiKey()`: Retrieve API key

**Dependencies**: None

**Status**: Partially implemented (mock data)

**Used By**: `components/SolarComparator.tsx`

---

### `src/utils/dbConnect.ts`
**Purpose**: MongoDB connection (not used)
**Status**: Legacy code, project uses Supabase

**Note**: Should be removed or replaced with Supabase connection

---

## 🗂️ Models (`src/models/`)

### `src/models/CustomerInfo.ts`
**Purpose**: Mongoose schema for customer data
**Status**: Not actively used (legacy)

**Note**: Project uses Supabase PostgreSQL, not MongoDB

**Should Be**: Removed or replaced with TypeScript interfaces

---

## 🔌 Integrations (`src/integrations/`)

### `src/integrations/supabase/client.ts`
**Purpose**: Supabase client instance
**Exports**:
- `supabase`: Configured Supabase client

**Configuration**:
```typescript
export const supabase = createClient(
  'https://glgvubxgigvrczrifcuv.supabase.co',
  'eyJhbGci...'
);
```

**Used By**: All services and components

---

### `src/integrations/supabase/types.ts`
**Purpose**: Auto-generated database types
**Status**: Read-only (generated by Supabase)

**Contains**: TypeScript types for all database tables

**Used By**: Services for type safety

---

## 🪝 Hooks (`src/hooks/`)

### `src/hooks/use-mobile.tsx`
**Purpose**: Detect mobile devices
**Exports**: `useMobile()` hook

**Used By**: Responsive components

---

### `src/components/ui/use-toast.ts`
**Purpose**: Toast notification hook
**Exports**: `useToast()`, `toast()` function

**Used By**: All components showing notifications

---

## 🗄️ Supabase (`supabase/`)

```
supabase/
├── config.toml                   # Supabase project config
├── migrations/                   # Database migrations
└── functions/                    # Edge functions
    ├── upload-pdf/
    │   └── index.ts
    └── process-pdf/
        └── index.ts
```

### `supabase/config.toml`
**Purpose**: Supabase project configuration
**Contains**:
- Project ID
- Database settings
- API settings
- Storage configuration

**Used By**: Supabase CLI

---

### `supabase/functions/upload-pdf/index.ts`
**Purpose**: Edge function to upload and extract PDF
**Responsibilities**:
- Receive PDF file
- Extract text using pdf-parse
- Upload to storage
- Return extracted text

**Dependencies**:
- `pdfjs-dist` (Deno)
- Supabase client

**Endpoint**: `POST /functions/v1/upload-pdf`

**Code Flow**:
```typescript
serve(async (req) => {
  // Parse multipart form data
  // Extract PDF text
  // Upload to storage
  // Return text
});
```

---

### `supabase/functions/process-pdf/index.ts`
**Purpose**: Edge function for AI processing
**Responsibilities**:
- Receive extracted text
- Call OpenAI API (mock)
- Generate insights
- Store in database
- Return results

**Dependencies**:
- OpenAI API
- Supabase client

**Endpoint**: `POST /functions/v1/process-pdf`

**Requires**: Authenticated user

---

## 📊 Dependency Graph

### High-Level Dependencies

```
main.tsx
  └── App.tsx
       └── index.css (global styles)
  └── AuthContext.tsx
       └── supabase/client.ts
  └── ThemeProvider
  └── Pages (Index, Auth, Records, etc.)
       └── Components
            └── Services
                 └── Supabase Client
                 └── Utils
                      └── Edge Functions
```

### Component Dependencies

```
Index.tsx
  ├── UploadArea
  │    ├── supabaseService.uploadPDF()
  │    └── guestService.uploadPDFAsGuest()
  ├── ProcessingFlow
  ├── ImprovedInsightsPanel
  │    ├── SolarComparator
  │    ├── InsightsDocument
  │    │    └── pdfGenerator.generatePDF()
  │    └── recharts
  └── PDFViewer
```

### Service Dependencies

```
supabaseService
  ├── supabase/client
  ├── Edge Functions (upload-pdf, process-pdf)
  ├── pdfUtils
  └── insightsGenerator

guestService
  └── localStorage

customerService
  ├── CustomerInfo model
  └── dbConnect (not used)
```

---

## 🚀 Build Output

When running `npm run build`, Vite generates:

```
dist/
├── index.html                    # Optimized HTML
├── assets/
│   ├── index-[hash].js          # Bundled JavaScript
│   ├── index-[hash].css         # Bundled CSS
│   └── [images/fonts]           # Optimized assets
```

---

## 📝 Summary

**Total Files**: 100+
- **Pages**: 5
- **Components**: 50+ (including UI)
- **Services**: 4
- **Utils**: 6
- **Edge Functions**: 2
- **Contexts**: 2
- **Hooks**: 2

**Key Relationships**:
- All components depend on `AuthContext`
- All services use `supabase/client`
- All styling uses `index.css` tokens
- Edge functions are independent (serverless)

**Critical Files**:
1. `main.tsx` - App entry
2. `index.css` - Design system
3. `AuthContext.tsx` - Auth state
4. `supabase/client.ts` - Backend connection
5. `supabaseService.ts` - API layer
