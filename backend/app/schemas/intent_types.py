from enum import Enum

class IntentType(str, Enum):
    """Standard user intent types for profile badges"""
    OPEN_TO_SPEAK = "open_to_speak"
    HIRING_TALENT = "hiring_talent"
    LOOKING_FOR_SPONSOR = "looking_for_sponsor"
    OPEN_TO_COLLABORATE = "open_to_collaborate"
    SEEKING_MENTORSHIP = "seeking_mentorship"
    OFFERING_MENTORSHIP = "offering_mentorship"
    
    @classmethod
    def values(cls):
        return [item.value for item in cls]
