from ..models.user import User

def is_admin(user: User) -> bool:
    return user.role in ("admin", "agent")
