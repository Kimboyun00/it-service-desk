ALLOWED_TRANSITIONS = {
    "open": {"in_progress", "closed"},
    "in_progress": {"resolved", "closed"},
    "resolved": {"closed", "in_progress"},
    "closed": set(),
}

def can_transition(old: str, new: str) -> bool:
    return new in ALLOWED_TRANSITIONS.get(old, set())
