from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.models import DICT_MODELS  # noqa: F401
from app.routers import dict_entries


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Maurice Wilkes API",
    description="十二词性词典系统",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dict_entries.router)
app.include_router(dict_entries.compat_router)


@app.get("/")
async def root():
    return {"message": "Maurice Wilkes API", "version": "1.0.0"}
