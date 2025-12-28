from sqlalchemy.orm import Session
from app.database.database import SessionLocal, engine, Base
from app.models.user_model import User, Role
from app.models.organization_model import Organization, organization_members
from app.models.event_model import (
    Event, EventCategory, EventPicture, EventParticipant, EventProposal, 
    EventProposalComment, EventChecklistItem, EventChecklistAssignment, EventReminder
)
from app.models.profile_model import Profile, Education, JobExperience
from app.models.review_model import Review
from app.models.notification_model import Notification
from app.models.follows_model import Follow
from app.models.audit_log_model import AuditLog
from app.models.chat_model import Conversation, Message
from app.models.onboarding_model import UserOnboarding
from sqlalchemy import text

def clear_db(db: Session):
    print("Clearing database (except admins)...")

    try:
        # Get admin role
        admin_role = db.query(Role).filter(Role.name == "admin").first()
        admin_user_ids = []
        if admin_role:
            admins = db.query(User).filter(User.roles.contains(admin_role)).all()
            admin_user_ids = [u.id for u in admins]
            print(f"Found {len(admin_user_ids)} admins to preserve.")
        
        # 1. Clear dependent tables first to avoid FK constraints
        
        # Delete Reviews
        db.query(Review).delete()
        print("Cleared Reviews")

        # Delete Notifications
        db.query(Notification).delete()
        print("Cleared Notifications")

        # Delete Follows
        db.query(Follow).delete()
        print("Cleared Follows")
        
        # Delete AuditLogs
        db.query(AuditLog).delete()
        print("Cleared AuditLogs")
        
        # Delete Event related data (Order matters due to FKs)
        db.query(EventChecklistAssignment).delete()
        db.query(EventChecklistItem).delete()
        db.query(EventReminder).delete()
        db.query(EventPicture).delete()
        db.query(EventCategory).delete()
        db.query(EventProposalComment).delete()
        
        # EventParticipant references EventProposal and Conversation
        db.query(EventParticipant).delete()
        
        # EventProposal references Conversation
        db.query(EventProposal).delete()
        
        # Now safe to delete Events
        db.query(Event).delete()
        print("Cleared Events and related data")
        
        # Delete Chat Messages & Conversations
        # Must be after EventParticipant and EventProposal are deleted (since they ref Conversation)
        db.query(Message).delete()
        db.query(Conversation).delete()
        print("Cleared Chat")

        # Delete JobExperience & Education (User related)
        if admin_user_ids:
            # For admins, keep the records but unlink from Organizations (since we are deleting Orgs)
            db.query(JobExperience).filter(JobExperience.user_id.in_(admin_user_ids)).update({JobExperience.org_id: None}, synchronize_session=False)
            db.query(Education).filter(Education.user_id.in_(admin_user_ids)).update({Education.org_id: None}, synchronize_session=False)
            
            # Delete non-admin records
            db.query(JobExperience).filter(JobExperience.user_id.notin_(admin_user_ids)).delete(synchronize_session=False)
            db.query(Education).filter(Education.user_id.notin_(admin_user_ids)).delete(synchronize_session=False)
            db.query(UserOnboarding).filter(UserOnboarding.user_id.notin_(admin_user_ids)).delete(synchronize_session=False)
        else:
            db.query(JobExperience).delete()
            db.query(Education).delete()
            db.query(UserOnboarding).delete()
        print("Cleared User details (Education, JobExperience, Onboarding)")

        # Delete Organization Memberships
        db.execute(organization_members.delete())
        
        # Delete Organizations
        db.query(Organization).delete()
        print("Cleared Organizations & Memberships")
        
        # Delete Profiles (except admins)
        if admin_user_ids:
            db.query(Profile).filter(Profile.user_id.notin_(admin_user_ids)).delete(synchronize_session=False)
        else:
            db.query(Profile).delete()
        print("Cleared Profiles")

        # Delete Users (except admins)
        if admin_user_ids:
            db.query(User).filter(User.id.notin_(admin_user_ids)).delete(synchronize_session=False)
        else:
            db.query(User).delete()
        print("Cleared Users (except admins)")
        
        db.commit()
        print("Database cleared successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"Error clearing database: {e}")
        raise

if __name__ == "__main__":
    db = SessionLocal()
    try:
        clear_db(db)
    finally:
        db.close()
