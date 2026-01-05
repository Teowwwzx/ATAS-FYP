from enum import Enum

class IntentType(str, Enum):
    """Standard user intent types for profile badges - 6 Standardized Options"""
    OPEN_TO_SPEAK = "open_to_speak"  # Willing to speak at events
    OPEN_TO_SPONSOR = "open_to_sponsor"  # Willing to sponsor events
    LOOKING_FOR_SPONSOR = "looking_for_sponsor"  # Seeking sponsorship
    LOOKING_FOR_SPEAKER = "looking_for_speaker"  # Seeking speakers
    HIRING_TALENT = "hiring_talent"  # Actively hiring
    OPEN_TO_JOB = "open_to_job"  # Open to job opportunities
    
    @classmethod
    def values(cls):
        return [item.value for item in cls]
