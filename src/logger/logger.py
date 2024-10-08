"""
Logger module for the application.
"""
import logging
import time
import os
from functools import wraps
from typing import Any, Callable, Dict, Optional, TypeVar, Literal
from logging.handlers import TimedRotatingFileHandler

T = TypeVar("T")


class ColorFormatter(logging.Formatter):
    """
    Logging formatter supporting colored output.
    """

    COLOR_CODES: Dict[int, str] = {
        logging.DEBUG: "\033[36m",  # Cyan
        logging.INFO: "\033[32m",  # Green
        logging.WARNING: "\033[33m",  # Yellow
        logging.ERROR: "\033[31m",  # Red
        logging.CRITICAL: "\033[1;31m",  # Bold Red
    }
    RESET_CODE: str = "\033[0m"

    def __init__(
        self,
        fmt: Optional[str] = None,
        datefmt: Optional[str] = None,
        style: Literal["%", "{", "$"] = "%",
        use_color: bool = True,
    ) -> None:
        """
        Initialize the ColorFormatter.

        Args:
            fmt (Optional[str]): The format string for the logger.
            datefmt (Optional[str]): The date format string for the logger.
            style (str): The style of the format string ('percent', 'string', or 'dollar').
            use_color (bool): Whether to use colored output.
        """
        super().__init__(fmt, datefmt, style)
        self.use_color: bool = use_color

    def format(self, record: logging.LogRecord) -> str:
        """
        Format the specified record as text.

        Args:
            record (logging.LogRecord): The log record to format.

        Returns:
            str: The formatted log record.
        """
        if self.use_color:
            record.color_on = self.COLOR_CODES.get(record.levelno, self.RESET_CODE)
            record.color_off = self.RESET_CODE
        else:
            record.color_on = record.color_off = ""
        return super().format(record)


class Logger:
    """
    Logger class for the application.
    """
    def __init__(
        self,
        name: str = __name__,
        log_level: int = logging.INFO,
        log_file: str = "app.log",
        rotation_days: int = 7,
        backup_count: int = 1,
    ) -> None:
        """
        Initialize the Logger.

        Args:
            name (str): The name of the logger.
            log_level (int): The logging level.
            log_file (str): The file where logs will be stored.
            rotation_days (int): Number of days between log rotations.
            backup_count (int): Number of backup files to keep.
        """
        self.logger: logging.Logger = logging.getLogger(name)

        if not self.logger.handlers:
            self.logger.setLevel(log_level)

            log_format = "{color_on}[{asctime}] [{levelname}] {message}{color_off}"
            date_format = "%Y-%m-%d %H:%M:%S"
            formatter = ColorFormatter(
                fmt=log_format, datefmt=date_format, style='{'
            )
            formatter.converter = time.gmtime  # Use GMT for timestamps

            # StreamHandler for console output
            stream_handler = logging.StreamHandler()
            stream_handler.setFormatter(formatter)

            # Determine the log directory in the project root
            project_root = os.path.abspath(
                os.path.join(os.path.dirname(__file__), "..", "..")
            )
            log_directory = os.path.join(project_root, "logs")
            os.makedirs(log_directory, exist_ok=True)

            # FileHandler for log file with rotation
            log_file_path = os.path.join(log_directory, log_file)
            file_handler = TimedRotatingFileHandler(
                log_file_path,
                when="D",
                interval=rotation_days,
                backupCount=backup_count,
            )
            file_handler.setFormatter(logging.Formatter("[%(asctime)s] %(message)s"))
            file_handler.setLevel(log_level)

            self.logger.addHandler(stream_handler)
            self.logger.addHandler(file_handler)
            self.logger.propagate = False  # Avoid duplicate logs

    def set_log_level(self, level: int) -> None:
        """
        Dynamically set the logging level.

        Args:
            level (int): The new logging level.
        """
        self.logger.setLevel(level)
        for handler in self.logger.handlers:
            handler.setLevel(level)

    def _log_with_context(self, level: int, message: str, **context: Any) -> None:
        """
        Log a message with context at the specified level.

        Args:
            level (int): The logging level.
            message (str): The message to log.
            **context: Additional context to include in the log message.
        """
        context_str = " ".join(f"{k}={v}" for k, v in context.items())
        full_message = f"{message} [{context_str}]" if context_str else message
        self.logger.log(level, full_message)

    def info(self, message: str, **context: Any) -> None:
        """
        Log an informational message.

        Args:
            message (str): The message to log.
            **context: Additional context to include in the log message.
        """
        self._log_with_context(logging.INFO, message, **context)

    def error(self, message: str, **context: Any) -> None:
        """
        Log an error message.

        Args:
            message (str): The message to log.
            **context: Additional context to include in the log message.
        """
        self._log_with_context(logging.ERROR, message, **context)

    def debug(self, message: str, **context: Any) -> None:
        """
        Log a debug message.

        Args:
            message (str): The message to log.
            **context: Additional context to include in the log message.
        """
        self._log_with_context(logging.DEBUG, message, **context)

    def warning(self, message: str, **context: Any) -> None:
        """
        Log a warning message.

        Args:
            message (str): The message to log.
            **context: Additional context to include in the log message.
        """
        self._log_with_context(logging.WARNING, message, **context)

    def critical(self, message: str, **context: Any) -> None:
        """
        Log a critical message.

        Args:
            message (str): The message to log.
            **context: Additional context to include in the log message.
        """
        self._log_with_context(logging.CRITICAL, message, **context)

    def exception(self, message: str, **context: Any) -> None:
        """
        Log an exception message.

        Args:
            message (str): The message to log.
            **context: Additional context to include in the log message.
        """
        self.logger.exception(message, extra=context)

    @staticmethod
    def log_execution(
        level: int = logging.INFO,
    ) -> Callable[[Callable[..., T]], Callable[..., T]]:
        """
        Decorator to log the execution of a function.

        Args:
            level (int): The logging level for the execution logs.

        Returns:
            Callable: A decorator function.
        """

        def decorator(func: Callable[..., T]) -> Callable[..., T]:
            """
            Decorator to log the execution of a function.

            Args:
                func (Callable[..., T]): The function to log.

            Returns:
                Callable[..., T]: A wrapper function.
            """
            @wraps(func)
            def wrapper(*args: Any, **kwargs: Any) -> T:
                """
                Wrapper function to log the execution of a function.

                Args:
                    *args (Any): The arguments passed to the function.
                    **kwargs (Any): The keyword arguments passed to the function.

                Returns:
                    T: The result of the function.
                """
                logger = Logger(func.__module__)
                logger._log_with_context(level, f"Executing {func.__name__}")
                result = func(*args, **kwargs)
                logger._log_with_context(level, f"Finished executing {func.__name__}")
                return result

            return wrapper

        return decorator
