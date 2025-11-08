from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import authrouter, journalrouter, onboardingrouter, tasksrouter, poserouter
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from backend/.env explicitly
_env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=_env_path)

app = FastAPI(title="BreakFree API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
    ],  # Add your frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(authrouter.router, prefix="/api")
app.include_router(journalrouter.router, prefix="/api")
app.include_router(onboardingrouter.router, prefix="/api")
app.include_router(tasksrouter.router, prefix="/api")
app.include_router(poserouter.router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "Welcome to BreakFree API"}



@app.get("/health")
async def health_check():
    return {"status": "healthy"}
