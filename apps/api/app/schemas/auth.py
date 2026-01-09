from pydantic import BaseModel, EmailStr, Field, field_validator

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    employee_no: str | None = Field(default=None, max_length=50)
    name: str | None = Field(default=None, max_length=100)
    title: str | None = Field(default=None, max_length=100)
    department: str | None = Field(default=None, max_length=100)

    @field_validator("password")
    @classmethod
    def password_must_be_bytes_le_72(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password must be <= 72 bytes (bcrypt limit).")
        return v

class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)

    @field_validator("password")
    @classmethod
    def login_password_bytes_le_72(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password must be <= 72 bytes (bcrypt limit).")
        return v


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
