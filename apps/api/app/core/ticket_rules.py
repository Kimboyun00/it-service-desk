STATUSES = {"open", "in_progress", "resolved", "closed"}

# 모든 상태를 서로 자유롭게 오갈 수 있도록 허용(현재 상태와 동일하게 설정하는 것만 제외)
ALLOWED_TRANSITIONS = {s: {t for t in STATUSES if t != s} for s in STATUSES}

def can_transition(old: str, new: str) -> bool:
    return new in ALLOWED_TRANSITIONS.get(old, set())
