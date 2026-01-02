from pydantic import BaseModel

class AttachmentRegisterIn(BaseModel):
    key: str
    filename: str
    content_type: str
    size: int = 0
    is_internal: bool = False
