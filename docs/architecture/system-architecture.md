# System Architecture (Reverse-Engineered)

> All diagrams are Mermaid and reflect the **as-built** system, not the aspirational `project_overview.md`.

## 1. Component architecture

```mermaid
graph TD
  subgraph Browser["Browser (Vite SPA)"]
    APP[App.tsx<br/>Router + Providers]
    AUTH[AuthContext]
    IDX[pages/Index]
    REC[pages/Records]
    AUTHPG[pages/Auth]
    GUEST[pages/GuestLanding]
    SVC[services/supabaseService]
    GSVC[services/guestService<br/>MOCK]
    DOC[InsightsDocument<br/>+ jsPDF]
    BROKEN[services/customerService<br/>+ mongoose  ❌BROKEN]
    SUPACLIENT[integrations/supabase/client]
  end

  subgraph Supabase["Supabase (cloud)"]
    GOTRUE[Auth / GoTrue]
    PG[(PostgreSQL<br/>customer_info, profiles)]
    BUCKET[(Storage: pdfs)]
    FUP[Edge: upload-pdf]
    FPROC[Edge: process-pdf]
  end

  OPENAI[OpenAI API<br/>gpt-4o-mini]
  SOLCAST[Solcast API<br/>dead path]

  APP --> AUTH --> SUPACLIENT --> GOTRUE
  IDX --> SVC
  IDX -->|guest| GSVC
  IDX -.lazy.-> DOC --> BROKEN
  SVC --> FUP --> BUCKET
  SVC --> FPROC --> OPENAI
  FPROC --> PG
  REC --> SVC --> PG
  AUTHPG --> AUTH
```

## 2. Request flow — authenticated bill analysis (the real path)

```mermaid
sequenceDiagram
  participant U as User
  participant IDX as Index.tsx
  participant SVC as supabaseService
  participant FUP as upload-pdf (Deno)
  participant FPROC as process-pdf (Deno)
  participant OAI as OpenAI
  participant PG as Postgres

  U->>IDX: drop PDF (UploadArea)
  IDX->>SVC: uploadPDF(file)
  SVC->>FUP: invoke (multipart)
  FUP->>FUP: pdfjs-dist extract text
  FUP->>PG: (storage) put pdfs/<ts>_name
  FUP-->>SVC: { extractedText, fileName }
  IDX->>SVC: processPDFWithAI(text, name)
  SVC->>SVC: getSession() → bearer token
  SVC->>FPROC: invoke (Authorization: Bearer)
  FPROC->>FPROC: validateElectricityBill(text)
  FPROC->>OAI: chat.completions gpt-4o-mini
  OAI-->>FPROC: JSON bill fields
  FPROC->>PG: insert customer_info (user_id)
  FPROC-->>SVC: { billData, insights, dbRecord }
  IDX->>U: render ImprovedInsightsPanel
```

## 3. Authentication flow

```mermaid
graph TD
  START[/ visited] --> PR{ProtectedRoute<br/>loading?}
  PR -->|loading| SPIN[spinner]
  PR -->|user or guest| ALLOW[render page]
  PR -->|neither| REDIR[Navigate to /guest]

  subgraph SignIn
    A[Auth.tsx] -->|email/pw| SP[supabase.auth.signInWithPassword]
    A -->|google| OAUTH[signInWithOAuth google]
    SP --> LISTENER[onAuthStateChange]
    OAUTH -->|redirect /| LISTENER
    LISTENER --> CTX[AuthContext sets user/session]
  end

  subgraph Guest
    G[GuestLanding] --> EG[enterGuestMode]
    EG --> LS[localStorage guest_mode=true]
    LS --> CTX
  end

  CTX --> ALLOW
```

Notes:
- Guest mode is **client-only trust** — `localStorage.guest_mode` and `guest_pdf_count`. A user can reset the counter from devtools; the 3-PDF limit is not enforced server-side (and guests never hit the server anyway — they get mock data).
- Profile rows are created by a Postgres trigger (`handle_new_user`) on `auth.users` insert.

## 4. Data flow

```mermaid
graph LR
  PDF[PDF bytes] -->|upload-pdf| TXT[plain text]
  TXT -->|process-pdf prompt| OAI[OpenAI]
  OAI --> JSON[extracted JSON]
  JSON --> DERIVE[derive solar efficiency,<br/>savings, insights array]
  DERIVE --> ROW[(customer_info row<br/>user_id scoped)]
  ROW --> RECORDS[Records page]
  JSON --> PANEL[ImprovedInsightsPanel]
  PANEL -->|jsPDF| REPORT[downloaded PDF report]
```

## 5. "RAG pipeline" — does not exist

The task brief assumed a FAISS/embedding/retrieval pipeline. **It is not present.** The closest analog is a single zero-shot extraction prompt:

```mermaid
graph LR
  T[bill text] --> P[system prompt:<br/>'extract fields as JSON'] --> M[gpt-4o-mini] --> J[JSON.parse]
```

There is no chunking, no embedding, no vector store, no retriever, no re-ranking. If a true RAG capability is desired it must be built from scratch (recommendation in [SOLARSAGE_MASTER_REPORT.md](../SOLARSAGE_MASTER_REPORT.md)).

## 6. Deployment architecture (current + target)

```mermaid
graph TD
  subgraph Current
    CDN[Static host / Lovable<br/>SPA bundle] --> SB[Supabase project<br/>glgvubxgigvrczrifcuv]
    SB --> EF[Edge Functions]
    EF --> OAIc[OpenAI]
  end
```

- **Frontend** is a static bundle (`vite build` → `dist/`) — deploy to any static host/CDN (Netlify, Vercel, S3+CloudFront, Nginx).
- **Backend** is fully managed by Supabase; edge functions deploy via `supabase functions deploy`.
- **Secrets** (`OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) live in Supabase function config, not in the SPA. The SPA only ships the public anon key.

See deployment options in [docs/deployment/](../deployment/).
