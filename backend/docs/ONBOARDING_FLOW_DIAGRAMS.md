# Onboarding Flow Visualization

## User Onboarding States

```mermaid
stateDiagram-v2
    [*] --> NotStarted: User Registers
    NotStarted --> InProgress: Start Onboarding
    InProgress --> InProgress: Complete Step
    InProgress --> Completed: Complete All Steps
    InProgress --> Skipped: User Skips
    NotStarted --> Skipped: User Skips
    Completed --> [*]
    Skipped --> [*]
```

## Detailed Onboarding Flow

```mermaid
flowchart TD
    Start([User Registration]) --> EmailVerify{Email Verified?}
    EmailVerify -->|Yes| OnboardingPrompt[Show Onboarding Prompt]
    EmailVerify -->|No| SendEmail[Send Verification Email]
    SendEmail --> EmailVerify
    
    OnboardingPrompt --> UserChoice{User Decision}
    UserChoice -->|Start Onboarding| Step1[Step 1: Complete Profile]
    UserChoice -->|Skip| Skipped[Status: Skipped]
    
    Step1 --> SetName[Set Full Name]
    SetName --> UploadAvatar[Upload Avatar]
    UploadAvatar --> WriteBio[Write Bio]
    WriteBio --> Step2[Step 2: Add Skills]
    
    Step2 --> SelectSkills[Select Your Skills]
    SelectSkills --> SetLevels[Set Proficiency Levels]
    SetLevels --> Step3[Step 3: Select Interests]
    
    Step3 --> ChooseTags[Choose Interest Tags]
    ChooseTags --> Step4[Step 4: Add Experience]
    
    Step4 --> AddEducation[Add Education]
    AddEducation --> AddJobs[Add Job Experience]
    AddJobs --> Step5[Step 5: Set Preferences]
    
    Step5 --> NotificationPrefs[Notification Settings]
    NotificationPrefs --> PrivacySettings[Privacy Settings]
    PrivacySettings --> CareerGoals[Set Career Goals]
    CareerGoals --> Completed[Status: Completed]
    
    Completed --> Dashboard[Redirect to Dashboard]
    Skipped --> Dashboard
    
    Dashboard --> End([User Home Page])
    
    style Step1 fill:#e3f2fd
    style Step2 fill:#e8f5e9
    style Step3 fill:#fff3e0
    style Step4 fill:#fce4ec
    style Step5 fill:#f3e5f5
    style Completed fill:#c8e6c9
    style Skipped fill:#ffcdd2
```

## Onboarding Progress Tracking

```mermaid
graph LR
    A[Profile Completed] -->|✓| B[Skills Added]
    B -->|✓| C[Interests Selected]
    C -->|✓| D[Experience Added]
    D -->|✓| E[Preferences Set]
    
    style A fill:#4caf50,color:#fff
    style B fill:#8bc34a,color:#fff
    style C fill:#cddc39,color:#000
    style D fill:#ffeb3b,color:#000
    style E fill:#ffc107,color:#000
```

## Database Relationships

```mermaid
erDiagram
    User ||--o| UserOnboarding : has
    User ||--o| Profile : has
    User ||--o{ Education : has
    User ||--o{ JobExperience : has
    Profile ||--o{ Skill : has
    Profile ||--o{ Tag : has
    
    User {
        uuid id PK
        string email
        string password
        boolean is_verified
        enum status
    }
    
    UserOnboarding {
        uuid id PK
        uuid user_id FK
        enum status
        int current_step
        boolean profile_completed
        boolean skills_added
        boolean interests_selected
        boolean experience_added
        boolean preferences_set
        jsonb onboarding_data
        datetime started_at
        datetime completed_at
    }
    
    Profile {
        uuid id PK
        uuid user_id FK
        string full_name
        text bio
        string avatar_url
        string cover_url
    }
    
    Education {
        uuid id PK
        uuid user_id FK
        string qualification
        string field_of_study
        datetime start_datetime
        datetime end_datetime
    }
    
    JobExperience {
        uuid id PK
        uuid user_id FK
        string title
        text description
        datetime start_datetime
        datetime end_datetime
    }
```

## Seeder Data Distribution

```mermaid
pie title "Onboarding Status Distribution"
    "Completed" : 60
    "In Progress" : 20
    "Not Started" : 10
    "Skipped" : 10
```

```mermaid
pie title "Event Participant Status (Ended Events)"
    "Attended" : 60
    "Absent" : 20
    "Accepted" : 15
    "Rejected" : 5
```

```mermaid
pie title "Event Participant Status (Upcoming Events)"
    "Accepted" : 60
    "Pending" : 30
    "Rejected" : 10
```

## API Integration Example

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Database
    
    User->>Frontend: Complete Registration
    Frontend->>API: POST /auth/register
    API->>Database: Create User
    API->>Database: Create UserOnboarding (status: not_started)
    API-->>Frontend: Return User + Token
    
    Frontend->>User: Show Onboarding Prompt
    User->>Frontend: Click "Get Started"
    Frontend->>API: POST /onboarding/start
    API->>Database: Update status to in_progress
    API-->>Frontend: Return onboarding state
    
    loop For each step
        User->>Frontend: Complete Step Data
        Frontend->>API: PATCH /onboarding/step/{n}
        API->>Database: Update step completion
        API->>Database: Increment current_step
        API-->>Frontend: Return updated state
    end
    
    User->>Frontend: Complete Final Step
    Frontend->>API: POST /onboarding/complete
    API->>Database: Update status to completed
    API->>Database: Set completed_at timestamp
    API-->>Frontend: Return success
    
    Frontend->>User: Redirect to Dashboard
```

## Key Takeaways

1. **Flexible States**: Support for multiple onboarding states (not_started, in_progress, completed, skipped)
2. **Progressive Tracking**: Track each step individually with boolean flags
3. **Flexible Storage**: JSONB field for storing additional onboarding data
4. **Realistic Data**: Seeders create diverse onboarding states for testing
5. **Production Ready**: Designed to support real-world onboarding flows
