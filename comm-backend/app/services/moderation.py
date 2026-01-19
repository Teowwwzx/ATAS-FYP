def is_text_allowed(text: str) -> bool:
    bad_words = ["spam", "ad"]
    return not any(w in text.lower() for w in bad_words)
