from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import authrouter

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


@app.get("/")
async def root():
    return {"message": "Welcome to BreakFree API"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
