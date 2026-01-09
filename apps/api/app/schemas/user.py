from pydantic import BaseModel


class UserSummaryOut(BaseModel):
    id: int
    email: str
    employee_no: str | None = None
    name: str | None = None
    title: str | None = None
    department: str | None = None

    class Config:
        from_attributes = True
