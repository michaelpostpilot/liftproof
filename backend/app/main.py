from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import health, analysis, export, recommend, copilot

app = FastAPI(
    title="LiftProof API",
    description="Statistical engine for geo-testing incrementality analysis",
    version="0.1.0",
)

origins = [
    settings.FRONTEND_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://liftproof-app.vercel.app",
]
# Remove empty strings and duplicates
origins = list(set(o for o in origins if o))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(analysis.router)
app.include_router(export.router)
app.include_router(recommend.router)
app.include_router(copilot.router)
