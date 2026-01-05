from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    ITS_API_KEY: str = ""
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    
    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()
