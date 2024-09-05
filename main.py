import os
import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from src.logger.logger import Logger
from contextlib import asynccontextmanager
from src.auth_routes import router as auth_router
from fastapi.middleware.cors import CORSMiddleware
from src.api_routes import router as api_router

# Initialize the logger
logger = Logger(name=__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Application is starting up")
    yield
    # Shutdown
    logger.info("Application is shutting down")


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Include the auth routes
app.include_router(auth_router, prefix="/auth", tags=["authentication"])
# Include the api routes
app.include_router(api_router, prefix="/api", tags=["api"])
# Serve static files
app.mount("/static", StaticFiles(directory="src/static"), name="static")


# Serve index.html
@app.get("/")
async def read_index():
    logger.info("Serving index.html")
    return FileResponse("src/templates/index.html")


# Add a health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    logger.info("Starting the server")
    host = os.getenv(
        "HOST", "0.0.0.0"
    )  # Changed to 0.0.0.0 to listen on all interfaces
    port = int(os.getenv("PORT", 8230))
    workers = int(os.getenv("WORKERS", 3))

    uvicorn.run(app, host=host, port=port, workers=workers)
