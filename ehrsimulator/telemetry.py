"""
OpenTelemetry configuration for EHR Simulator
Provides comprehensive tracing and logging for all requests, prompts, and responses.
"""

import os
import logging
from datetime import datetime
from typing import Optional, Dict, Any

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import (
    ConsoleSpanExporter,
    BatchSpanProcessor,
    SimpleSpanProcessor
)
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.logging import LoggingInstrumentor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

def setup_telemetry(service_name: str = "ehrsimulator", service_version: str = "1.0.0"):
    """
    Set up OpenTelemetry tracing and logging for the EHR Simulator.
    
    Args:
        service_name: Name of the service for tracing
        service_version: Version of the service
    """
    
    # Create resource with service information
    resource = Resource.create({
        "service.name": service_name,
        "service.version": service_version,
        "service.instance.id": os.getenv("HOSTNAME", "localhost"),
        "deployment.environment": os.getenv("ENVIRONMENT", "development")
    })
    
    # Create tracer provider
    tracer_provider = TracerProvider(resource=resource)
    
    # Add span processors
    # Console exporter for development
    console_exporter = ConsoleSpanExporter()
    tracer_provider.add_span_processor(SimpleSpanProcessor(console_exporter))
    
    # OTLP exporter for production (if configured)
    otlp_endpoint = os.getenv("OTLP_ENDPOINT")
    if otlp_endpoint:
        try:
            otlp_exporter = OTLPSpanExporter(endpoint=otlp_endpoint)
            tracer_provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
            logger.info(f"OTLP exporter configured with endpoint: {otlp_endpoint}")
        except Exception as e:
            logger.warning(f"Failed to configure OTLP exporter: {e}")
    
    # Set the tracer provider
    trace.set_tracer_provider(tracer_provider)
    
    # Get the tracer
    tracer = trace.get_tracer(__name__)
    
    logger.info("OpenTelemetry setup completed")
    return tracer

def instrument_fastapi(app):
    """Instrument FastAPI application with OpenTelemetry."""
    FastAPIInstrumentor.instrument_app(app)
    logger.info("FastAPI instrumentation completed")

def instrument_httpx():
    """Instrument HTTPX client with OpenTelemetry."""
    HTTPXClientInstrumentor().instrument()
    logger.info("HTTPX instrumentation completed")

def instrument_sqlalchemy():
    """Instrument SQLAlchemy with OpenTelemetry."""
    SQLAlchemyInstrumentor().instrument()
    logger.info("SQLAlchemy instrumentation completed")

def instrument_logging():
    """Instrument Python logging with OpenTelemetry."""
    LoggingInstrumentor().instrument()
    logger.info("Logging instrumentation completed")

def log_llm_request(tracer, model: str, prompt: str, response: str, duration: float, 
                   status: str = "success", error: Optional[str] = None):
    """
    Log detailed LLM request information with OpenTelemetry spans.
    
    Args:
        tracer: OpenTelemetry tracer
        model: LLM model name
        prompt: Input prompt
        response: LLM response
        duration: Request duration in seconds
        status: Request status (success/error)
        error: Error message if any
    """
    
    with tracer.start_as_current_span("llm_request") as span:
        # Add attributes to span
        span.set_attribute("llm.model", model)
        span.set_attribute("llm.prompt_length", len(prompt))
        span.set_attribute("llm.response_length", len(response))
        span.set_attribute("llm.duration_seconds", duration)
        span.set_attribute("llm.status", status)
        
        if error:
            span.set_attribute("llm.error", error)
            span.set_status(trace.Status(trace.StatusCode.ERROR, error))
        else:
            span.set_status(trace.Status(trace.StatusCode.OK))
        
        # Add events with detailed information
        span.add_event("llm.request_start", {
            "timestamp": datetime.utcnow().isoformat(),
            "model": model,
            "prompt_preview": prompt[:200] + "..." if len(prompt) > 200 else prompt
        })
        
        span.add_event("llm.response_received", {
            "timestamp": datetime.utcnow().isoformat(),
            "response_preview": response[:200] + "..." if len(response) > 200 else response,
            "duration_seconds": duration
        })
        
        # Log detailed information
        logger.info(f"LLM Request - Model: {model}, Duration: {duration:.2f}s, Status: {status}")
        if error:
            logger.error(f"LLM Error: {error}")
        
        return span

def log_api_request(tracer, method: str, path: str, status_code: int, duration: float,
                   request_body: Optional[Dict[str, Any]] = None, response_body: Optional[Dict[str, Any]] = None):
    """
    Log detailed API request information with OpenTelemetry spans.
    
    Args:
        tracer: OpenTelemetry tracer
        method: HTTP method
        path: Request path
        status_code: HTTP status code
        duration: Request duration in seconds
        request_body: Request body (optional)
        response_body: Response body (optional)
    """
    
    with tracer.start_as_current_span("api_request") as span:
        # Add attributes to span
        span.set_attribute("http.method", method)
        span.set_attribute("http.route", path)
        span.set_attribute("http.status_code", status_code)
        span.set_attribute("http.duration_seconds", duration)
        
        # Set span status based on status code
        if 200 <= status_code < 400:
            span.set_status(trace.Status(trace.StatusCode.OK))
        else:
            span.set_status(trace.Status(trace.StatusCode.ERROR, f"HTTP {status_code}"))
        
        # Add events with detailed information
        span.add_event("api.request_start", {
            "timestamp": datetime.utcnow().isoformat(),
            "method": method,
            "path": path,
            "request_body_size": len(str(request_body)) if request_body else 0
        })
        
        span.add_event("api.response_sent", {
            "timestamp": datetime.utcnow().isoformat(),
            "status_code": status_code,
            "response_body_size": len(str(response_body)) if response_body else 0,
            "duration_seconds": duration
        })
        
        # Log detailed information
        logger.info(f"API Request - {method} {path} - Status: {status_code}, Duration: {duration:.3f}s")
        
        if request_body:
            logger.debug(f"Request Body: {request_body}")
        if response_body:
            logger.debug(f"Response Body: {response_body}")
        
        return span

def log_database_operation(tracer, operation: str, table: str, duration: float, 
                          success: bool = True, error: Optional[str] = None):
    """
    Log detailed database operation information with OpenTelemetry spans.
    
    Args:
        tracer: OpenTelemetry tracer
        operation: Database operation (SELECT, INSERT, UPDATE, DELETE)
        table: Table name
        duration: Operation duration in seconds
        success: Whether operation was successful
        error: Error message if any
    """
    
    with tracer.start_as_current_span("database_operation") as span:
        # Add attributes to span
        span.set_attribute("db.operation", operation)
        span.set_attribute("db.table", table)
        span.set_attribute("db.duration_seconds", duration)
        span.set_attribute("db.success", success)
        
        if error:
            span.set_attribute("db.error", error)
            span.set_status(trace.Status(trace.StatusCode.ERROR, error))
        else:
            span.set_status(trace.Status(trace.StatusCode.OK))
        
        # Add events
        span.add_event("db.operation_start", {
            "timestamp": datetime.utcnow().isoformat(),
            "operation": operation,
            "table": table
        })
        
        span.add_event("db.operation_complete", {
            "timestamp": datetime.utcnow().isoformat(),
            "success": success,
            "duration_seconds": duration
        })
        
        # Log detailed information
        logger.info(f"Database Operation - {operation} on {table} - Duration: {duration:.3f}s, Success: {success}")
        if error:
            logger.error(f"Database Error: {error}")
        
        return span 