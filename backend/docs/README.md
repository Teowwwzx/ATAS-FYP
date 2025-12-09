# Backend Documentation

Welcome to the backend documentation! This directory contains comprehensive guides for the ATAS-FYP platform.

## 📚 Available Documentation

### 1. [Seeder Enhancements](./SEEDER_ENHANCEMENTS.md)
Comprehensive overview of all database seeders, including:
- What data is seeded
- New features added
- Test credentials
- Running instructions

### 2. [Onboarding Implementation](./ONBOARDING_IMPLEMENTATION.md)
Detailed guide on user onboarding:
- How real-world platforms handle onboarding
- Comparison of different approaches (custom DB vs external services)
- Our implementation details
- Best practices and recommendations

### 3. [Onboarding Flow Diagrams](./ONBOARDING_FLOW_DIAGRAMS.md)
Visual documentation with Mermaid diagrams:
- User onboarding states
- Detailed flow charts
- Database relationships
- Data distributions
- API integration examples

## 🚀 Quick Start

### Seeding the Database

```bash
# Navigate to backend directory
cd backend

# Run all seeders
python -m app.seeders.seeder
```

This will create:
- 15 users (students, experts, teachers, sponsors, admins)
- 100+ skills
- 60+ tags
- Complete profiles with avatars and covers
- 10 organizations
- Education and job experience records
- 20 events with participants
- Onboarding records for all users
- 50 reviews
- And more!

### Test Credentials

After seeding, you can login with:
- **Email**: `student1@gmail.com` (or any role: expert, teacher, sponsor, admin)
- **Password**: `123123`

## 📊 What's New

### Latest Updates
- ✨ **Onboarding System**: Track user onboarding progress through multiple steps
- ✨ **Education & Experience**: Seed realistic education and job history
- ✨ **Reviews**: Create event and organization reviews with ratings
- 🎯 **Enhanced Participants**: All invitation statuses (pending, accepted, rejected, attended, absent)
- 🖼️ **Real Images**: Using Pravatar, Unsplash, and UI Avatars for realistic photos

## 🏗️ Architecture

### Database Models
```
Users → Profiles → Skills/Tags
Users → Organizations → Members
Users → Education/JobExperience
Users → Onboarding
Events → Participants (with statuses)
Events → Pictures/Proposals/Reminders
Reviews → Events/Organizations
```

### Onboarding Flow
```
Registration → Email Verification → Onboarding Prompt
→ Profile Setup → Skills → Interests → Experience → Preferences
→ Completed/Skipped → Dashboard
```

## 🛠️ Development

### Adding a New Seeder

1. Create a new seeder file in `app/seeders/`:
```python
# app/seeders/my_seeder.py
from sqlalchemy.orm import Session

def seed_my_data(db: Session):
    print("Seeding my data...")
    # Your seeding logic here
    print("Successfully seeded my data")
```

2. Import and call it in `app/seeders/seeder.py`:
```python
from app.seeders.my_seeder import seed_my_data

def run_seeders():
    # ... other seeders ...
    seed_my_data(db)
    db.commit()
```

### Modifying Onboarding Steps

Edit the `UserOnboarding` model in `app/models/onboarding_model.py` to:
- Add/remove step flags
- Change total steps count
- Add custom onboarding data fields

## 📖 Additional Resources

### Onboarding Best Practices
- Keep it short (5 steps or less)
- Allow users to skip
- Save progress automatically
- Send reminder emails for incomplete onboarding
- A/B test different flows

### Feature Flags for Onboarding
Consider integrating:
- **LaunchDarkly**: For feature flags and A/B testing
- **Mixpanel/Amplitude**: For analytics and funnel tracking
- **Intercom**: For in-app messaging and guidance

## 🤝 Contributing

When adding new features:
1. Create database models first
2. Add comprehensive seeders
3. Update documentation
4. Include mermaid diagrams for complex flows

## 📝 License

This documentation is part of the ATAS-FYP project.

---

**Need help?** Check the specific documentation files linked above, or review the code comments in the seeder files.
