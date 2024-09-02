import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from src.logger.logger import Logger
from contextlib import asynccontextmanager
from src.auth_routes import router as auth_router

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
# Include the auth routes
app.include_router(auth_router, prefix="/auth", tags=["authentication"])
# Serve static files
app.mount("/static", StaticFiles(directory="src/static"), name="static")
# Serve index.html
@app.get("/")
async def read_index():
    logger.info("Serving index.html")
    return FileResponse("src/templates/index.html")




if __name__ == "__main__":

    logger.info("Starting the server")
    uvicorn.run(app, host="127.0.0.1", port=8230)
