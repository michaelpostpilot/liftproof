from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    FRONTEND_URL: str = "http://localhost:3000"
    ANTHROPIC_API_KEY: str = ""
    PYTHON_ENV: str = "development"

    class Config:
        env_file = ".env"


settings = Settings()
