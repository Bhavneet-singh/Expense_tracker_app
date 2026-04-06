# PennyWise Project Flow Chart

This document reflects the current codebase in `client/` and `server/`, including the PostgreSQL + Prisma backend, protected routing, Zustand stores, analytics queries, and Docker runtime.

## 1. End-to-End System Flow

```mermaid
flowchart TD
    U[User] --> B[Browser / React 19 Client]

    subgraph Client["Client App (Vite + React + TanStack Router + Zustand)"]
        M[main.tsx]
        A[App.tsx]
        RT[routeTree.gen.ts]
        ROOT[__root.tsx RootLayout]
        NAV[Navigation]

        ROUTES[Routes]
        HOME[/index route -> HomePage/]
        LOGIN[/login route -> LoginPage/]
        SIGNUP[/signup route -> SignupPage/]
        DASH[/dashboard route -> DashboardPage/]
        EXP[/expenses route -> ExpensesPage/]
        ANA[/analytics route -> AnalyticsPage/]
        PRO[/profile route -> ProfilePage/]

        GUARD[beforeLoad route guards]
        AUTHSTORE[authStore]
        EXPSTORE[expenseStore]
        ANASTORE[analyticsStore]

        APICLIENT[Axios api.ts]
        TOKEN[localStorage TOKEN_KEY]
    end

    subgraph Server["Server App (Express 5 + TypeScript)"]
        SIDX[src/index.ts]
        CORS[CORS + express.json]
        ROUTER[Mounted API Routers]
        AUTHMW[requireAuth middleware]
        ERRORMW[errorHandler]

        AUTHR[/api/auth]
        EXPR[/api/expenses]
        PROR[/api/profile]
        ANAR[/api/analytics]
    end

    subgraph Data["Data Layer"]
        DBINIT[connectDB]
        PGPOOL[pg Pool]
        PRISMA[Prisma Client]
        USERS[(users table)]
        EXPENSES[(expenses table)]
    end

    subgraph Infra["Runtime / Containers"]
        CLIENTDEV[Vite dev server :3000]
        SERVERCTR[Node server :8000]
        POSTGRES[Postgres 15]
        PGADMIN[pgAdmin :8080]
        DOCKER[docker-compose.yml]
    end

    U --> CLIENTDEV
    CLIENTDEV --> M --> A --> RT --> ROOT
    ROOT --> NAV
    ROOT --> ROUTES
    ROUTES --> HOME
    ROUTES --> LOGIN
    ROUTES --> SIGNUP
    ROUTES --> DASH
    ROUTES --> EXP
    ROUTES --> ANA
    ROUTES --> PRO

    DASH --> GUARD
    EXP --> GUARD
    ANA --> GUARD
    PRO --> GUARD
    GUARD --> AUTHSTORE
    AUTHSTORE --> TOKEN

    LOGIN --> AUTHSTORE
    SIGNUP --> AUTHSTORE
    DASH --> EXPSTORE
    DASH --> ANASTORE
    EXP --> EXPSTORE
    ANA --> ANASTORE
    PRO --> AUTHSTORE

    AUTHSTORE --> APICLIENT
    EXPSTORE --> APICLIENT
    ANASTORE --> APICLIENT
    TOKEN --> APICLIENT

    APICLIENT -->|Authorization Bearer token| SIDX
    SIDX --> CORS --> ROUTER
    ROUTER --> AUTHR
    ROUTER --> EXPR
    ROUTER --> PROR
    ROUTER --> ANAR

    EXPR --> AUTHMW
    PROR --> AUTHMW
    ANAR --> AUTHMW

    AUTHR --> PRISMA
    EXPR --> PRISMA
    PROR --> PRISMA
    ANAR --> PGPOOL

    SIDX --> ERRORMW
    AUTHMW --> ERRORMW

    DBINIT --> PGPOOL
    DBINIT --> PRISMA
    PRISMA --> USERS
    PRISMA --> EXPENSES
    PGPOOL --> USERS
    PGPOOL --> EXPENSES

    DOCKER --> POSTGRES
    DOCKER --> PGADMIN
    DOCKER --> SERVERCTR
    SERVERCTR --> POSTGRES
```

## 2. Client Navigation and State Flow

```mermaid
flowchart LR
    subgraph Router["TanStack Router"]
        ROOT[__root.tsx]
        IDX[index.tsx]
        LG[login.tsx]
        SU[signup.tsx]
        DA[dashboard.tsx]
        EX[expenses.tsx]
        AN[analytics.tsx]
        PR[profile.tsx]
    end

    subgraph Pages["Page Entry Components"]
        HP[HomePage]
        LP[LoginPage -> LoginForm]
        SP[SignupPage -> SignupForm]
        DP[DashboardPage]
        EP[ExpensesPage]
        AP[AnalyticsPage]
        PP[ProfilePage]
    end

    subgraph Stores["Zustand Stores"]
        AS[authStore]
        ES[expenseStore]
        NS[analyticsStore]
    end

    subgraph Services["Client Services"]
        API[api.ts Axios instance]
        AUTHSVC[authService]
        EXPSVC[expenseService]
        ANASVC[analyticsService]
    end

    ROOT --> IDX --> HP
    ROOT --> LG --> LP
    ROOT --> SU --> SP
    ROOT --> DA --> DP
    ROOT --> EX --> EP
    ROOT --> AN --> AP
    ROOT --> PR --> PP

    DA -->|beforeLoad auth check| AS
    EX -->|beforeLoad auth check| AS
    AN -->|beforeLoad auth check| AS
    PR -->|beforeLoad auth check| AS

    LP --> AS
    SP --> AS
    PP --> AS
    DP --> ES
    DP --> NS
    EP --> ES
    AP --> NS

    AS --> AUTHSVC --> API
    ES --> EXPSVC --> API
    NS --> ANASVC --> API

    API -->|request interceptor adds token| API
    API -->|401 response clears token + redirects to /login| API
```

## 3. Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant LoginSignupUI as Login/Signup Form
    participant AuthStore as authStore
    participant AuthService as authService
    participant API as Axios api.ts
    participant AuthRoute as /api/auth
    participant AuthController as authControllers
    participant UserModel as models/User.ts
    participant DB as PostgreSQL users

    User->>LoginSignupUI: Submit signup/login form
    LoginSignupUI->>AuthStore: signup() or login()
    AuthStore->>AuthService: Call service
    AuthService->>API: POST /auth/signup or /auth/login
    API->>AuthRoute: HTTP request
    AuthRoute->>AuthController: signup or login

    alt Signup
        AuthController->>AuthController: Validate name/email/password
        AuthController->>UserModel: findUserByEmail()
        UserModel->>DB: SELECT user by email
        AuthController->>AuthController: bcrypt.hash(password)
        AuthController->>UserModel: createUser()
        UserModel->>DB: INSERT user
        AuthController-->>API: success + user
        API-->>AuthStore: response.data
        AuthStore-->>LoginSignupUI: user stored, no token yet
    else Login
        AuthController->>UserModel: findUserByEmail()
        UserModel->>DB: SELECT user by email
        AuthController->>AuthController: bcrypt.compare(password)
        AuthController->>AuthController: generateToken(userId)
        AuthController-->>API: success + user + JWT
        API-->>AuthStore: response.data
        AuthStore->>AuthStore: save JWT in localStorage
        AuthStore-->>LoginSignupUI: set isAuthenticated = true
    end
```

## 4. Expense CRUD Flow

```mermaid
flowchart TD
    U[User on Dashboard or Expenses page]
    MODAL[ExpenseModal / ExpenseForm]
    STORE[expenseStore]
    SVC[expenseService]
    API[Axios api.ts]
    ROUTE[/api/expenses routes]
    AUTH[requireAuth]
    CTRL[expenseControllers]
    USERMODEL[findUserById]
    EXPMODEL[Expense model functions]
    DB[(expenses table)]

    U -->|Create / Edit / Delete / Filter| MODAL
    MODAL --> STORE
    STORE -->|createExpense|getC[createExpenseService]
    STORE -->|getAllExpenses|getR[getAllExpensesService]
    STORE -->|updateExpense|getU[updateExpenseService]
    STORE -->|deleteExpense|getD[deleteExpenseService]

    getC --> SVC
    getR --> SVC
    getU --> SVC
    getD --> SVC
    SVC --> API --> ROUTE --> AUTH --> CTRL

    CTRL --> USERMODEL
    CTRL --> EXPMODEL
    USERMODEL --> DB
    EXPMODEL --> DB

    CTRL --> VALIDATE[Validate amount/category/description/date + ownership]
    VALIDATE --> RESPONSE[sendSuccess response]
    RESPONSE --> STORE
    STORE --> UI[Expenses list / dashboard recent expenses / counts]
```

## 5. Analytics Flow

```mermaid
flowchart TD
    AP[AnalyticsPage]
    DP[DashboardPage]
    ASTORE[analyticsStore]
    ES[expenseStore]
    ASVC[analyticsService]
    API[Axios api.ts]
    AR[/api/analytics]
    AUTH[requireAuth]
    ACTRL[analyticsControllers]
    ENSURE[ensureUser]
    SQL[Raw SQL via pg query()]
    DB[(expenses table)]

    DP -->|after expenses exist| ASTORE
    AP -->|initial loadAllAnalytics()| ASTORE
    AP -->|selectedYear change| ASTORE
    ES -->|expense length used to trigger analytics fetches| DP

    ASTORE -->|getDashboardStats| ASVC
    ASTORE -->|getCategoryStats| ASVC
    ASTORE -->|getTrends| ASVC
    ASTORE -->|getPeriodStats(days)| ASVC
    ASTORE -->|getYearlyStats(year)| ASVC
    ASTORE -->|getCurrentMonth| ASVC
    ASTORE -->|getYearlyCategoryStats(year)| ASVC
    ASTORE -->|getAllYears| ASVC

    ASVC --> API --> AR --> AUTH --> ACTRL --> ENSURE --> SQL --> DB

    SQL --> CAT[Category totals and percentages]
    SQL --> DASHSTATS[Total, count, avg, current month, last month]
    SQL --> TRENDS[Last 6 month trends]
    SQL --> PERIOD[Custom day-range category totals]
    SQL --> MONTHLY[Monthly totals by year]
    SQL --> CURRENT[Current month category totals]
    SQL --> YEARCAT[Monthly category breakdown for year]
    SQL --> ALLYEARS[Totals grouped by year]

    CAT --> ASTORE
    DASHSTATS --> ASTORE
    TRENDS --> ASTORE
    PERIOD --> ASTORE
    MONTHLY --> ASTORE
    CURRENT --> ASTORE
    YEARCAT --> ASTORE
    ALLYEARS --> ASTORE

    ASTORE --> CHARTS[Recharts visual components]
    CHARTS --> OUT[Dashboard cards, pie chart, line chart, yearly charts, tables, lazy year sections]
```

## 6. Profile Flow

```mermaid
flowchart TD
    U[User on ProfilePage]
    PROFILEUI[ProfileView / ProfileEditForm / ExportDataButton / DeleteAccountModal]
    AUTHSTORE[authStore]
    AUTHSVC[authService]
    API[Axios api.ts]
    PR[/api/profile routes]
    AUTH[requireAuth]
    PCTRL[profileControllers]
    UMODEL[User model]
    EXMODEL[Expense model]
    DB[(users + expenses tables)]

    U --> PROFILEUI --> AUTHSTORE --> AUTHSVC --> API --> PR --> AUTH

    PR -->|GET /| PCTRL
    PR -->|PUT /| PCTRL
    PR -->|GET /export| PCTRL
    PR -->|DELETE /account| PCTRL

    PCTRL --> UMODEL --> DB
    PCTRL --> EXMODEL --> DB

    PCTRL --> ACTIONS[Validate input, hash password, export JSON payload, delete expenses, delete user]
    ACTIONS --> AUTHSTORE
    AUTHSTORE --> UI[Profile screen refresh or logout/reset]
```

## 7. Backend Request Lifecycle

```mermaid
flowchart LR
    REQ[Incoming HTTP request]
    IDX[src/index.ts]
    PARSE[express.json + cors]
    MATCH[Route match]
    AUTH[Optional requireAuth]
    CTRL[Controller]
    MODEL[Model / query layer]
    DB[(PostgreSQL)]
    OK[sendSuccess JSON response]
    ERR[throw AppError or other error]
    ERRMW[errorHandler]
    RESERR[Formatted error JSON]

    REQ --> IDX --> PARSE --> MATCH --> AUTH --> CTRL --> MODEL --> DB --> OK
    CTRL --> ERR --> ERRMW --> RESERR
    AUTH --> ERR
```

## 8. Data Model Flow

```mermaid
erDiagram
    USERS ||--o{ EXPENSES : owns

    USERS {
        int id PK
        string name
        string email UNIQUE
        string password
        timestamptz created_at
        timestamptz updated_at
    }

    EXPENSES {
        int id PK
        int user_id FK
        decimal amount
        string category
        string description
        timestamptz date
        timestamptz created_at
        timestamptz updated_at
    }
```

## 9. Docker Runtime Flow

```mermaid
flowchart TD
    DC[docker-compose.yml]
    PG[postgres service]
    PGA[pgadmin service]
    APP[server service]
    HEALTH[Postgres healthcheck]
    DB[(expense-tracker database)]
    LOGS[./logs volume]

    DC --> PG
    DC --> PGA
    DC --> APP

    PG --> DB
    PG --> HEALTH
    HEALTH -->|healthy dependency| APP
    PGA --> DB
    APP -->|DATABASE_URL| DB
    APP --> LOGS
```

## 10. Important Notes from Current Code

- The current backend is PostgreSQL-based with `pg` + `Prisma`, even though the root `README.md` still describes an older MongoDB/Mongoose architecture.
- `authStore` initializes `token` from `localStorage`, but protected route guards currently check `isAuthenticated`, which starts as `false` until login happens again in the current session.
- Expense filtering in the UI includes search/date/amount state on the client store, but only `category` and `sort` are sent to the backend API right now.
- Analytics uses raw SQL through `pg` instead of Prisma so aggregate queries can be handled directly in PostgreSQL.
