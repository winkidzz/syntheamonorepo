import os
from fastapi import FastAPI, Request, Response, BackgroundTasks, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, Integer, String, JSON, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.sql import func
import asyncio
import httpx
import random
from datetime import datetime
from typing import List, Optional
import json
from enum import Enum
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, update
import base64
import aiofiles
import tempfile
from PIL import Image
import io
import requests
import logging

# --- Enhanced Logging Configuration ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('ehrsimulator.log')
    ]
)
logger = logging.getLogger("ehrsimulator")
llm_logger = logging.getLogger("ehrsimulator.llm")

# --- LLM Configuration ---
LLM_CONFIG = {
    "temperature": 0.0,      # Set to 0 for maximum reproducibility and accuracy
    "top_p": 1.0,           # Use deterministic sampling
    "repeat_penalty": 1.1,   # Slight penalty to avoid repetition
    "top_k": 1,             # Most deterministic setting
    "timeout": 120.0        # Extended timeout for complex clinical prompts
}

# Available LLM Models
AVAILABLE_MODELS = {
    "gemma3:27b": {
        "name": "Gemma 3 27B",
        "type": "ollama",
        "description": "Google's Gemma 3 27B model via Ollama"
    },
    "llava:latest": {
        "name": "LLaVA Latest",
        "type": "ollama", 
        "description": "LLaVA vision model via Ollama"
    },
    "mistral:latest": {
        "name": "Mistral Latest",
        "type": "ollama",
        "description": "Mistral AI model via Ollama"
    },
    "llama3:8b": {
        "name": "Llama 3 8B",
        "type": "ollama",
        "description": "Meta's Llama 3 8B model via Ollama"
    },
    "gemini-pro": {
        "name": "Gemini Pro",
        "type": "google",
        "description": "Google's Gemini Pro model via API"
    }
}

# Clinical significance thresholds
CLINICAL_SIGNIFICANCE = {
    "critical_threshold": 5,    # Score threshold for major modifications
    "significant_threshold": 2, # Score threshold for moderate modifications
    "routine_threshold": 0      # Score threshold for minimal modifications
}

"""
ENHANCED INCREMENTAL SUMMARY SYSTEM

This system implements sophisticated LLM-based incremental summary updates that:

1. PRESERVE CONTINUITY: Maintains existing clinical assessments and care plans
2. EVIDENCE-BASED UPDATES: Only modifies recommendations when clinically justified
3. REPRODUCIBLE RESULTS: Uses temperature=0 and deterministic sampling for consistency
4. CLINICAL SIGNIFICANCE SCORING: Automatically assesses the significance of new data
5. DETAILED FHIR PARSING: Extracts comprehensive clinical information from patient records
6. PROFESSIONAL FORMATTING: Maintains clinical documentation standards

Key Features:
- Temperature=0 for reproducible and accurate results
- Clinical significance assessment guides modification decisions
- Preserves stable clinical information and ongoing care plans
- Enhanced FHIR data extraction for better clinical context
- Comprehensive prompting system for different summary types
- Automatic highlighting of changes for clinical review

Usage:
- Historical summaries: Comprehensive overviews of patient medical history
- Current summaries: Incremental updates that build upon previous versions
- Automatic assessment of when modifications to recommendations are warranted
"""

# --- Database Setup ---
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/postgres"
)
engine = create_async_engine(DATABASE_URL, echo=True)
async_session = async_sessionmaker(engine, expire_on_commit=False)
Base = declarative_base()

class Patient(Base):
    __tablename__ = "patients"
    id = Column(Integer, primary_key=True, index=True)
    synthea_id = Column(String, unique=True, index=True)
    data = Column(JSON)  # Store FHIR bundle or patient state

class PatientSummary(Base):
    __tablename__ = "patient_summaries"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    summary_type = Column(String, nullable=False) # 'historical' or 'current'
    content = Column(Text, nullable=False)
    version = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    changes_highlighted = Column(Text, nullable=True)  # HTML with highlighted changes

# --- FastAPI App ---
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# --- LangChain Agent Stub ---
# TODO: Integrate LangChain for patient simulation logic

# --- Simple Patient State Simulation ---
VITALS_LIST = ["heart_rate", "blood_pressure", "temperature", "respiratory_rate"]
MEDICATIONS = ["Aspirin", "Metformin", "Lisinopril", "Atorvastatin"]
ASSESSMENTS = ["Stable", "Needs Attention", "Critical"]
ENCOUNTERS = ["Checkup", "ER Visit", "Follow-up", "Discharge"]

async def simulate_patient_update_async(patient_id: int):
    async with async_session() as session:
        patient = await session.get(Patient, patient_id)
        if not patient:
            return
        # Simulate new vitals
        vitals = {v: random.randint(60, 120) if v == "heart_rate" else random.uniform(36, 39) if v == "temperature" else random.randint(12, 20) if v == "respiratory_rate" else f"{random.randint(100,140)}/{random.randint(60,90)}" for v in VITALS_LIST}
        medication = random.choice(MEDICATIONS)
        assessment = random.choice(ASSESSMENTS)
        encounter = random.choice(ENCOUNTERS)
        timestamp = datetime.utcnow().isoformat()
        # Update patient data
        update = {
            "timestamp": timestamp,
            "vitals": vitals,
            "medication": medication,
            "assessment": assessment,
            "encounter": encounter
        }
        # Store update history in patient.data["updates"]
        data = patient.data or {}
        updates = data.get("updates", [])
        updates.append(update)
        data["updates"] = updates
        patient.data = data
        session.add(patient)
        await session.commit()
        await session.refresh(patient)
        return update

# --- Synthea API Call Stub ---
async def fetch_synthea_patient():
    # TODO: Call the Synthea Spring Boot service to generate a patient
    async with httpx.AsyncClient() as client:
        resp = await client.get("http://localhost:8081/generate-patient")
        return resp.json()

# --- Workflow Engine ---
class WorkflowType(str, Enum):
    NEW_PATIENT_VISIT = "new_patient_visit"
    SURGERY_ADMISSION = "surgery_admission"

WORKFLOW_STEPS = {
    WorkflowType.NEW_PATIENT_VISIT: [
        "questionnaire", "vitals", "history", "assessment"
    ],
    WorkflowType.SURGERY_ADMISSION: [
        "admission", "preop_vitals", "labs", "constant_vitals", "postop_assessment"
    ]
}

class PatientWorkflow:
    def __init__(self, patient_fhir, workflow_type=WorkflowType.NEW_PATIENT_VISIT):
        self.fhir = patient_fhir
        self.step = 0
        self.workflow = WORKFLOW_STEPS[workflow_type]
        self.workflow_type = workflow_type

    def next_event(self):
        if self.step >= len(self.workflow):
            # After workflow, continue with maintenance events (e.g., vitals)
            if self.workflow_type == WorkflowType.SURGERY_ADMISSION:
                return self.build_event("constant_vitals")
            return None
        event_type = self.workflow[self.step]
        self.step += 1
        return self.build_event(event_type)

    def build_event(self, event_type):
        if event_type == "questionnaire":
            return {"type": "questionnaire", "data": extract_demographics(self.fhir)}
        elif event_type == "vitals":
            return {"type": "vitals", "data": extract_initial_vitals(self.fhir)}
        elif event_type == "history":
            return {"type": "history", "data": extract_history(self.fhir)}
        elif event_type == "assessment":
            return {"type": "assessment", "data": extract_assessment(self.fhir)}
        elif event_type == "admission":
            return {"type": "admission", "data": extract_admission(self.fhir)}
        elif event_type == "preop_vitals":
            return {"type": "preop_vitals", "data": extract_initial_vitals(self.fhir)}
        elif event_type == "labs":
            return {"type": "labs", "data": extract_labs(self.fhir)}
        elif event_type == "constant_vitals":
            return {"type": "vitals", "data": extract_random_vitals(self.fhir)}
        elif event_type == "postop_assessment":
            return {"type": "postop_assessment", "data": extract_assessment(self.fhir)}
        return {"type": event_type, "data": {}}

# --- FHIR Data Extraction Helpers ---
def extract_demographics(fhir):
    patient = next((r for r in fhir.get("entry", []) if r.get("resource", {}).get("resourceType") == "Patient"), None)
    if not patient:
        return {}
    resource = patient["resource"]
    return {
        "id": resource.get("id"),
        "name": resource.get("name", [{}])[0],
        "gender": resource.get("gender"),
        "birthDate": resource.get("birthDate"),
        "address": resource.get("address", [{}])[0],
    }
def extract_initial_vitals(fhir):
    # Find first Observation with category 'vital-signs'
    for entry in fhir.get("entry", []):
        res = entry.get("resource", {})
        if res.get("resourceType") == "Observation" and any(
            c.get("coding", [{}])[0].get("code") == "vital-signs" for c in res.get("category", [])):
            return res.get("valueQuantity", {})
    # Fallback: plausible values
    return {"heart_rate": 72, "blood_pressure": "120/80", "temperature": 37.0, "respiratory_rate": 16}

def extract_history(fhir):
    # Extract conditions, allergies, medications
    conditions = [e["resource"] for e in fhir.get("entry", []) if e["resource"].get("resourceType") == "Condition"]
    allergies = [e["resource"] for e in fhir.get("entry", []) if e["resource"].get("resourceType") == "AllergyIntolerance"]
    medications = [e["resource"] for e in fhir.get("entry", []) if e["resource"].get("resourceType") == "MedicationStatement"]
    return {"conditions": conditions, "allergies": allergies, "medications": medications}

def extract_assessment(fhir):
    # Example: return a summary assessment
    return {"summary": "Initial assessment completed."}

def extract_admission(fhir):
    # Example: return reason for admission
    encounter = next((e["resource"] for e in fhir.get("entry", []) if e["resource"].get("resourceType") == "Encounter"), None)
    if encounter:
        return {"reason": encounter.get("reasonCode", [{}])[0]}
    return {"reason": "Surgery"}

def extract_labs(fhir):
    # Extract lab results (Observations with category 'laboratory')
    labs = [e["resource"] for e in fhir.get("entry", []) if e["resource"].get("resourceType") == "Observation" and any(
        c.get("coding", [{}])[0].get("code") == "laboratory" for c in e["resource"].get("category", []))]
    return labs

def extract_random_vitals(fhir):
    # Generate plausible random vitals based on demographics
    demo = extract_demographics(fhir)
    import random
    age = 30
    try:
        if demo.get("birthDate"):
            from datetime import datetime
            age = datetime.now().year - int(demo["birthDate"].split("-")[0])
    except Exception:
        pass
    return {
        "heart_rate": random.randint(60, 100) if age < 60 else random.randint(60, 90),
        "blood_pressure": f"{random.randint(110,130)}/{random.randint(70,85)}",
        "temperature": round(random.uniform(36.5, 37.5), 1),
        "respiratory_rate": random.randint(12, 20)
    }

# --- Per-patient workflow state ---
workflow_states = {}

@app.get("/events/{patient_id}")
async def patient_events(patient_id: int):
    async def event_generator():
        # Load patient FHIR bundle
        async with async_session() as session:
            patient = await session.get(Patient, patient_id)
            if not patient:
                yield {"event": "error", "data": "Patient not found"}
                return
            fhir = patient.data
            # Choose workflow (for demo: alternate by patient_id)
            workflow_type = WorkflowType.NEW_PATIENT_VISIT if patient_id % 2 == 1 else WorkflowType.SURGERY_ADMISSION
            if patient_id not in workflow_states:
                workflow_states[patient_id] = PatientWorkflow(fhir, workflow_type)
            workflow = workflow_states[patient_id]
            while True:
                event = workflow.next_event()
                if event:
                    yield {"event": "update", "data": event}
                else:
                    # After workflow, send periodic vitals
                    yield {"event": "update", "data": workflow.build_event("constant_vitals")}
                await asyncio.sleep(2)
    return EventSourceResponse(event_generator())

# --- REST Endpoint: Nurse Treats Patient ---
@app.post("/treat/{patient_id}")
async def treat_patient(patient_id: int, request: Request, background_tasks: BackgroundTasks):
    data = await request.json()
    # For demonstration, just trigger a single update
    update = await simulate_patient_update_async(patient_id)
    return {"status": "treatment received", "patient_id": patient_id, "action": data, "update": update}

# --- LLM Summarization Stubs & Endpoints ---

def get_fhir_stats(fhir_bundle: dict, last_n: Optional[int] = None) -> str:
    """
    Enhanced helper to extract clinically relevant information from FHIR resources.
    Returns detailed clinical data for LLM processing rather than just resource counts.
    """
    if not fhir_bundle or "entry" not in fhir_bundle:
        return "No clinical data available."
    
    entries = fhir_bundle.get("entry", [])
    if last_n:
        # For current summaries, focus on most recent entries
        # Note: In a real implementation, this would be sorted by date
        entries = entries[-last_n:] if len(entries) > last_n else entries
    
    # Organize clinical data by type
    clinical_data = {
        "demographics": [],
        "conditions": [],
        "medications": [],
        "observations": [],
        "encounters": [],
        "procedures": [],
        "allergies": [],
        "care_plans": [],
        "other_resources": []
    }
    
    for entry in entries:
        resource = entry.get("resource", {})
        resource_type = resource.get("resourceType")
        
        if resource_type == "Patient":
            # Extract demographics
            name = resource.get("name", [{}])[0]
            demographics = {
                "name": f"{name.get('given', [''])[0]} {name.get('family', '')}".strip(),
                "gender": resource.get("gender", "Unknown"),
                "birth_date": resource.get("birthDate", "Unknown"),
                "id": resource.get("id", "Unknown")
            }
            clinical_data["demographics"].append(demographics)
            
        elif resource_type == "Condition":
            # Extract condition information
            condition = {
                "code": resource.get("code", {}).get("text", "Unknown condition"),
                "clinical_status": resource.get("clinicalStatus", {}).get("coding", [{}])[0].get("code", "Unknown"),
                "onset": resource.get("onsetDateTime", resource.get("onsetString", "Unknown onset"))
            }
            clinical_data["conditions"].append(condition)
            
        elif resource_type == "MedicationStatement" or resource_type == "MedicationRequest":
            # Extract medication information
            medication = {
                "medication": resource.get("medicationCodeableConcept", {}).get("text", "Unknown medication"),
                "status": resource.get("status", "Unknown"),
                "dosage": resource.get("dosage", [{}])[0].get("text", "Unknown dosage") if resource.get("dosage") else "Unknown dosage"
            }
            clinical_data["medications"].append(medication)
            
        elif resource_type == "Observation":
            # Extract vital signs and lab results
            observation = {
                "code": resource.get("code", {}).get("text", "Unknown observation"),
                "value": resource.get("valueQuantity", {}).get("value", resource.get("valueString", "Unknown value")),
                "unit": resource.get("valueQuantity", {}).get("unit", ""),
                "status": resource.get("status", "Unknown"),
                "category": [cat.get("coding", [{}])[0].get("display", "Unknown") for cat in resource.get("category", [])]
            }
            clinical_data["observations"].append(observation)
            
        elif resource_type == "Encounter":
            # Extract encounter information
            encounter = {
                "type": resource.get("type", [{}])[0].get("text", "Unknown encounter"),
                "status": resource.get("status", "Unknown"),
                "period": resource.get("period", {}).get("start", "Unknown date"),
                "reason": [reason.get("text", "Unknown") for reason in resource.get("reasonCode", [])]
            }
            clinical_data["encounters"].append(encounter)
            
        elif resource_type == "Procedure":
            # Extract procedure information
            procedure = {
                "code": resource.get("code", {}).get("text", "Unknown procedure"),
                "status": resource.get("status", "Unknown"),
                "performed": resource.get("performedDateTime", resource.get("performedString", "Unknown date"))
            }
            clinical_data["procedures"].append(procedure)
            
        elif resource_type == "AllergyIntolerance":
            # Extract allergy information
            allergy = {
                "substance": resource.get("code", {}).get("text", "Unknown allergen"),
                "criticality": resource.get("criticality", "Unknown"),
                "type": resource.get("type", "Unknown"),
                "clinical_status": resource.get("clinicalStatus", {}).get("coding", [{}])[0].get("code", "Unknown")
            }
            clinical_data["allergies"].append(allergy)
            
        elif resource_type == "CarePlan":
            # Extract care plan information
            care_plan = {
                "title": resource.get("title", "Unknown care plan"),
                "status": resource.get("status", "Unknown"),
                "intent": resource.get("intent", "Unknown"),
                "description": resource.get("description", "No description")
            }
            clinical_data["care_plans"].append(care_plan)
            
        else:
            clinical_data["other_resources"].append(resource_type)
    
    # Format clinical data for LLM consumption
    formatted_data = []
    
    if clinical_data["demographics"]:
        demo = clinical_data["demographics"][0]
        formatted_data.append(f"Patient: {demo['name']} ({demo['gender']}, DOB: {demo['birth_date']})")
    
    if clinical_data["conditions"]:
        conditions_text = "Active Conditions: " + "; ".join([
            f"{cond['code']} (status: {cond['clinical_status']}, onset: {cond['onset']})" 
            for cond in clinical_data["conditions"][:5]  # Limit to most relevant
        ])
        formatted_data.append(conditions_text)
    
    if clinical_data["medications"]:
        meds_text = "Current Medications: " + "; ".join([
            f"{med['medication']} - {med['dosage']} (status: {med['status']})" 
            for med in clinical_data["medications"][:10]  # Limit to most relevant
        ])
        formatted_data.append(meds_text)
    
    if clinical_data["observations"]:
        # Separate vital signs from lab results
        vitals = [obs for obs in clinical_data["observations"] if "vital" in str(obs.get("category", [])).lower()]
        labs = [obs for obs in clinical_data["observations"] if "laboratory" in str(obs.get("category", [])).lower()]
        
        if vitals:
            vitals_text = "Recent Vital Signs: " + "; ".join([
                f"{vital['code']}: {vital['value']} {vital['unit']}".strip()
                for vital in vitals[-5:]  # Most recent vitals
            ])
            formatted_data.append(vitals_text)
            
        if labs:
            labs_text = "Recent Lab Results: " + "; ".join([
                f"{lab['code']}: {lab['value']} {lab['unit']}".strip()
                for lab in labs[-10:]  # Most recent labs
            ])
            formatted_data.append(labs_text)
    
    if clinical_data["encounters"]:
        encounters_text = "Recent Encounters: " + "; ".join([
            f"{enc['type']} on {enc['period']} (status: {enc['status']})"
            for enc in clinical_data["encounters"][-3:]  # Most recent encounters
        ])
        formatted_data.append(encounters_text)
    
    if clinical_data["procedures"]:
        procedures_text = "Recent Procedures: " + "; ".join([
            f"{proc['code']} performed {proc['performed']} (status: {proc['status']})"
            for proc in clinical_data["procedures"][-5:]  # Most recent procedures
        ])
        formatted_data.append(procedures_text)
    
    if clinical_data["allergies"]:
        allergies_text = "Known Allergies: " + "; ".join([
            f"{allergy['substance']} (criticality: {allergy['criticality']}, type: {allergy['type']})"
            for allergy in clinical_data["allergies"]
        ])
        formatted_data.append(allergies_text)
    
    if clinical_data["care_plans"]:
        care_plans_text = "Active Care Plans: " + "; ".join([
            f"{plan['title']} (status: {plan['status']}, intent: {plan['intent']})"
            for plan in clinical_data["care_plans"]
        ])
        formatted_data.append(care_plans_text)
    
    # Count other resources
    other_counts = {}
    for resource_type in clinical_data["other_resources"]:
        other_counts[resource_type] = other_counts.get(resource_type, 0) + 1
    
    if other_counts:
        other_text = "Additional Resources: " + "; ".join([
            f"{count} {rtype}(s)" for rtype, count in other_counts.items()
        ])
        formatted_data.append(other_text)
    
    if not formatted_data:
        return "No relevant clinical data found in patient record."
    
    return "\n".join(formatted_data)


async def call_ollama_llm(prompt_text: str, summary_type: str, previous_summary: str = None, model: str = "gemma3:27b") -> str:
    """
    Calls a remote Ollama LLM to generate a summary with temperature=0 for reproducibility.
    For current summaries, performs sophisticated incremental updates that preserve
    previous recommendations unless new data requires major reevaluation.
    """
    start_time = datetime.now()
    llm_logger.info(f"=== LLM CALL STARTED ===")
    llm_logger.info(f"Summary Type: {summary_type}")
    llm_logger.info(f"Prompt Length: {len(prompt_text)} characters")
    llm_logger.info(f"Has Previous Summary: {previous_summary is not None}")
    if previous_summary:
        llm_logger.info(f"Previous Summary Length: {len(previous_summary)} characters")
    
    OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/v1/chat/completions")
    llm_logger.info(f"Ollama URL: {OLLAMA_URL}")
    
    if summary_type == 'historical':
        system_prompt = """You are a senior clinical assistant with extensive experience in patient care documentation. 
Analyze the following patient record statistics and create a comprehensive historical overview for a clinician. 
Focus on significant medical conditions, treatment patterns, and overall health trajectory. 
Use clear, professional medical language appropriate for clinical documentation."""
        
        full_prompt = f"{system_prompt}\n\nPatient Data: {prompt_text}"
        llm_logger.info("Using HISTORICAL summary prompt")
        
    else: # 'current' - sophisticated incremental update
        if previous_summary:
            # Assess clinical significance of changes
            llm_logger.info("Assessing clinical significance for incremental update")
            clinical_assessment = assess_clinical_significance(previous_summary, prompt_text)
            llm_logger.info(f"Clinical assessment completed, length: {len(clinical_assessment)} characters")
            
            system_prompt = """You are a senior clinical assistant performing an incremental update to a patient summary. 

CRITICAL INSTRUCTIONS:
1. PRESERVE CONTINUITY: Maintain all existing clinical assessments, recommendations, and care plans unless the new data provides clear evidence requiring changes.
2. INCREMENTAL APPROACH: Only add new information or modify existing information when clinically significant changes are present.
3. EVIDENCE-BASED CHANGES: Only alter previous recommendations if new data shows:
   - Significant improvement or deterioration in patient condition
   - New diagnostic findings that change the clinical picture
   - Treatment responses that warrant care plan modifications
4. MAINTAIN PROFESSIONAL TONE: Use consistent clinical language and formatting.
5. HIGHLIGHT UPDATES: Clearly indicate what is new or changed while preserving the overall summary structure.

PROCESS:
- Review the previous summary thoroughly
- Analyze new patient data for clinically significant changes
- Consider the clinical significance assessment provided
- Preserve all stable clinical information and ongoing care plans
- Add new findings and updates where appropriate
- Only modify recommendations when clinically justified by new evidence"""

            full_prompt = f"""{system_prompt}

PREVIOUS CLINICAL SUMMARY:
{previous_summary}

NEW PATIENT DATA TO INTEGRATE:
{prompt_text}

{clinical_assessment}

INSTRUCTIONS FOR UPDATE:
1. Start with the existing summary as your foundation
2. Review the clinical significance assessment above to guide your approach
3. Preserve all stable conditions, ongoing treatments, and current care plans
4. Add new findings, observations, or changes in patient status
5. Only modify existing recommendations if the clinical significance assessment and new data provide clear justification
6. Maintain the professional clinical documentation format
7. Ensure the updated summary flows naturally and provides a complete current picture
8. If modifications are made, ensure they are evidence-based and clinically appropriate

Provide the complete updated clinical summary:"""
            llm_logger.info("Using INCREMENTAL UPDATE prompt with previous summary")
        
        else:
            system_prompt = """You are a senior clinical assistant creating an initial current summary for a patient. 
Analyze the recent patient activity data and create a comprehensive current status summary for the clinical team. 
Focus on current conditions, recent interventions, and immediate care needs."""
            
            full_prompt = f"{system_prompt}\n\nRecent Patient Data: {prompt_text}"
            llm_logger.info("Using INITIAL CURRENT summary prompt (no previous summary)")

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt_text}
        ],
        "stream": False,
        "options": {
            "temperature": LLM_CONFIG["temperature"],
            "top_p": LLM_CONFIG["top_p"],
            "repeat_penalty": LLM_CONFIG["repeat_penalty"],
            "top_k": LLM_CONFIG["top_k"]
        }
    }

    llm_logger.info(f"Model: {payload['model']}")
    llm_logger.info(f"LLM Config: temperature={LLM_CONFIG['temperature']}, top_p={LLM_CONFIG['top_p']}, repeat_penalty={LLM_CONFIG['repeat_penalty']}, top_k={LLM_CONFIG['top_k']}")
    llm_logger.info(f"System prompt length: {len(system_prompt)} characters")
    llm_logger.info(f"User prompt length: {len(prompt_text)} characters")
    llm_logger.info(f"Total payload size: {len(json.dumps(payload))} characters")

    try:
        llm_logger.info(f"Sending request to Ollama at {OLLAMA_URL}")
        request_start = datetime.now()
        
        async with httpx.AsyncClient(timeout=LLM_CONFIG["timeout"]) as client:
            response = await client.post(OLLAMA_URL, json=payload)
            request_end = datetime.now()
            request_duration = (request_end - request_start).total_seconds()
            
            llm_logger.info(f"Request completed in {request_duration:.2f} seconds")
            llm_logger.info(f"Response status: {response.status_code}")
            
            response.raise_for_status()
            result = response.json()
            
            llm_logger.info(f"Response received, parsing JSON")
            response_content = result.get("choices", [{}])[0].get("message", {}).get("content", "Error: No response from model.")
            
            end_time = datetime.now()
            total_duration = (end_time - start_time).total_seconds()
            
            llm_logger.info(f"=== LLM CALL COMPLETED SUCCESSFULLY ===")
            llm_logger.info(f"Total duration: {total_duration:.2f} seconds")
            llm_logger.info(f"Response length: {len(response_content)} characters")
            llm_logger.info(f"Response preview: {response_content[:200]}...")
            
            return response_content
            
    except httpx.RequestError as e:
        end_time = datetime.now()
        total_duration = (end_time - start_time).total_seconds()
        error_msg = f"Request error: Could not connect to Ollama. Make sure Ollama is running and the model is available. Details: {e}"
        llm_logger.error(f"=== LLM CALL FAILED (REQUEST ERROR) ===")
        llm_logger.error(f"Total duration: {total_duration:.2f} seconds")
        llm_logger.error(f"Error: {error_msg}")
        return error_msg
        
    except httpx.HTTPStatusError as e:
        end_time = datetime.now()
        total_duration = (end_time - start_time).total_seconds()
        error_msg = f"HTTP error: {e.response.status_code} - {e.response.text}"
        llm_logger.error(f"=== LLM CALL FAILED (HTTP ERROR) ===")
        llm_logger.error(f"Total duration: {total_duration:.2f} seconds")
        llm_logger.error(f"HTTP Status: {e.response.status_code}")
        llm_logger.error(f"Error response: {e.response.text}")
        return error_msg
        
    except Exception as e:
        end_time = datetime.now()
        total_duration = (end_time - start_time).total_seconds()
        error_msg = f"Unexpected error: {str(e)}"
        llm_logger.error(f"=== LLM CALL FAILED (UNEXPECTED ERROR) ===")
        llm_logger.error(f"Total duration: {total_duration:.2f} seconds")
        llm_logger.error(f"Error: {error_msg}")
        return error_msg


async def call_gemini_pro(prompt_text: str, summary_type: str, previous_summary: str = None) -> str:
    """
    Calls Google's Gemini Pro API to generate a summary.
    """
    start_time = datetime.now()
    llm_logger.info(f"=== GEMINI PRO CALL STARTED ===")
    llm_logger.info(f"Summary Type: {summary_type}")
    llm_logger.info(f"Prompt Length: {len(prompt_text)} characters")
    llm_logger.info(f"Has Previous Summary: {previous_summary is not None}")
    
    GEMINI_API_KEY = os.getenv("GENERATESUMMARY_APIKEY")
    if not GEMINI_API_KEY:
        error_msg = "Gemini Pro API key not found. Please set GENERATESUMMARY_APIKEY environment variable."
        llm_logger.error(f"=== GEMINI PRO CALL FAILED ===")
        llm_logger.error(f"Error: {error_msg}")
        return error_msg
    
    GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"
    
    if summary_type == 'historical':
        system_prompt = """You are a senior clinical assistant with extensive experience in patient care documentation. 
Analyze the following patient record statistics and create a comprehensive historical overview for a clinician. 
Focus on significant medical conditions, treatment patterns, and overall health trajectory. 
Use clear, professional medical language appropriate for clinical documentation."""
        
        full_prompt = f"{system_prompt}\n\nPatient Data: {prompt_text}"
        llm_logger.info("Using HISTORICAL summary prompt")
        
    else: # 'current' - sophisticated incremental update
        if previous_summary:
            # Assess clinical significance of changes
            llm_logger.info("Assessing clinical significance for incremental update")
            clinical_assessment = assess_clinical_significance(previous_summary, prompt_text)
            llm_logger.info(f"Clinical assessment completed, length: {len(clinical_assessment)} characters")
            
            system_prompt = """You are a senior clinical assistant performing an incremental update to a patient summary. 

CRITICAL INSTRUCTIONS:
1. PRESERVE CONTINUITY: Maintain all existing clinical assessments, recommendations, and care plans unless the new data provides clear evidence requiring changes.
2. INCREMENTAL APPROACH: Only add new information or modify existing information when clinically significant changes are present.
3. EVIDENCE-BASED CHANGES: Only alter previous recommendations if new data shows:
   - Significant improvement or deterioration in patient condition
   - New diagnostic findings that change the clinical picture
   - Treatment responses that warrant care plan modifications
4. MAINTAIN PROFESSIONAL TONE: Use consistent clinical language and formatting.
5. HIGHLIGHT UPDATES: Clearly indicate what is new or changed while preserving the overall summary structure.

PROCESS:
- Review the previous summary thoroughly
- Analyze new patient data for clinically significant changes
- Consider the clinical significance assessment provided
- Preserve all stable clinical information and ongoing care plans
- Add new findings and updates where appropriate
- Only modify recommendations when clinically justified by new evidence"""

            full_prompt = f"""{system_prompt}

PREVIOUS CLINICAL SUMMARY:
{previous_summary}

NEW PATIENT DATA TO INTEGRATE:
{prompt_text}

{clinical_assessment}

INSTRUCTIONS FOR UPDATE:
1. Start with the existing summary as your foundation
2. Review the clinical significance assessment above to guide your approach
3. Preserve all stable conditions, ongoing treatments, and current care plans
4. Add new findings, observations, or changes in patient status
5. Only modify existing recommendations if the clinical significance assessment and new data provide clear justification
6. Maintain the professional clinical documentation format
7. Ensure the updated summary flows naturally and provides a complete current picture
8. If modifications are made, ensure they are evidence-based and clinically appropriate

Provide the complete updated clinical summary:"""
            llm_logger.info("Using INCREMENTAL UPDATE prompt with previous summary")
        
        else:
            system_prompt = """You are a senior clinical assistant creating an initial current summary for a patient. 
Analyze the recent patient activity data and create a comprehensive current status summary for the clinical team. 
Focus on current conditions, recent interventions, and immediate care needs."""
            
            full_prompt = f"{system_prompt}\n\nRecent Patient Data: {prompt_text}"
            llm_logger.info("Using INITIAL CURRENT summary prompt (no previous summary)")

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": full_prompt}
                ]
            }
        ],
        "generationConfig": {
            "temperature": LLM_CONFIG["temperature"],
            "topP": LLM_CONFIG["top_p"],
            "topK": LLM_CONFIG["top_k"],
            "maxOutputTokens": 8192
        }
    }

    llm_logger.info(f"Model: Gemini Pro")
    llm_logger.info(f"LLM Config: temperature={LLM_CONFIG['temperature']}, top_p={LLM_CONFIG['top_p']}, top_k={LLM_CONFIG['top_k']}")
    llm_logger.info(f"Full prompt length: {len(full_prompt)} characters")
    llm_logger.info(f"Total payload size: {len(json.dumps(payload))} characters")

    try:
        llm_logger.info(f"Sending request to Gemini Pro API")
        request_start = datetime.now()
        
        async with httpx.AsyncClient(timeout=LLM_CONFIG["timeout"]) as client:
            response = await client.post(
                f"{GEMINI_URL}?key={GEMINI_API_KEY}",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            request_end = datetime.now()
            request_duration = (request_end - request_start).total_seconds()
            
            llm_logger.info(f"Request completed in {request_duration:.2f} seconds")
            llm_logger.info(f"Response status: {response.status_code}")
            
            response.raise_for_status()
            result = response.json()
            
            llm_logger.info(f"Response received, parsing JSON")
            
            # Extract text from Gemini response
            if "candidates" in result and len(result["candidates"]) > 0:
                response_content = result["candidates"][0]["content"]["parts"][0]["text"]
            else:
                response_content = "Error: No response content from Gemini Pro"
            
            end_time = datetime.now()
            total_duration = (end_time - start_time).total_seconds()
            
            llm_logger.info(f"=== GEMINI PRO CALL COMPLETED SUCCESSFULLY ===")
            llm_logger.info(f"Total duration: {total_duration:.2f} seconds")
            llm_logger.info(f"Response length: {len(response_content)} characters")
            llm_logger.info(f"Response preview: {response_content[:200]}...")
            
            return response_content
            
    except httpx.RequestError as e:
        end_time = datetime.now()
        total_duration = (end_time - start_time).total_seconds()
        error_msg = f"Request error: Could not connect to Gemini Pro API. Details: {e}"
        llm_logger.error(f"=== GEMINI PRO CALL FAILED (REQUEST ERROR) ===")
        llm_logger.error(f"Total duration: {total_duration:.2f} seconds")
        llm_logger.error(f"Error: {error_msg}")
        return error_msg
        
    except httpx.HTTPStatusError as e:
        end_time = datetime.now()
        total_duration = (end_time - start_time).total_seconds()
        error_msg = f"HTTP error: {e.response.status_code} - {e.response.text}"
        llm_logger.error(f"=== GEMINI PRO CALL FAILED (HTTP ERROR) ===")
        llm_logger.error(f"Total duration: {total_duration:.2f} seconds")
        llm_logger.error(f"HTTP Status: {e.response.status_code}")
        llm_logger.error(f"Error response: {e.response.text}")
        return error_msg
        
    except Exception as e:
        end_time = datetime.now()
        total_duration = (end_time - start_time).total_seconds()
        error_msg = f"Unexpected error: {str(e)}"
        llm_logger.error(f"=== GEMINI PRO CALL FAILED (UNEXPECTED ERROR) ===")
        llm_logger.error(f"Total duration: {total_duration:.2f} seconds")
        llm_logger.error(f"Error: {error_msg}")
        return error_msg


async def call_llm(prompt_text: str, summary_type: str, previous_summary: str = None, model: str = "gemma3:27b") -> str:
    """
    Main LLM calling function that routes to appropriate model based on type.
    """
    if model not in AVAILABLE_MODELS:
        error_msg = f"Model '{model}' not found in available models: {list(AVAILABLE_MODELS.keys())}"
        llm_logger.error(f"=== LLM CALL FAILED (INVALID MODEL) ===")
        llm_logger.error(f"Error: {error_msg}")
        return error_msg
    
    model_info = AVAILABLE_MODELS[model]
    llm_logger.info(f"Selected model: {model} ({model_info['name']}) - Type: {model_info['type']}")
    
    if model_info['type'] == 'google':
        return await call_gemini_pro(prompt_text, summary_type, previous_summary)
    else:  # ollama
        return await call_ollama_llm(prompt_text, summary_type, previous_summary, model)


def highlight_changes(old_text: str, new_text: str) -> str:
    """
    Compare two text strings and return new text with changes highlighted in HTML.
    Uses a simple sentence-based diff for clinical readability.
    """
    if not old_text:
        # If no previous text, highlight everything as new
        return f'<div class="summary-content"><span class="highlight-new">{new_text}</span></div>'
    
    # Split into sentences for better clinical diff
    import re
    old_sentences = [s.strip() for s in re.split(r'[.!?]', old_text) if s.strip()]
    new_sentences = [s.strip() for s in re.split(r'[.!?]', new_text) if s.strip()]
    
    # Simple approach: find sentences that are new or modified
    highlighted_content = []
    
    for sentence in new_sentences:
        if sentence:
            # Check if this sentence (or similar) exists in old text
            is_new = True
            for old_sentence in old_sentences:
                # Simple similarity check (could be enhanced with fuzzy matching)
                if sentence.lower() in old_sentence.lower() or old_sentence.lower() in sentence.lower():
                    is_new = False
                    break
            
            if is_new:
                highlighted_content.append(f'<span class="highlight-new">{sentence}.</span>')
            else:
                highlighted_content.append(f'{sentence}.')
    
    return f'<div class="summary-content">{" ".join(highlighted_content)}</div>'


@app.get("/models")
async def get_available_models():
    """
    Returns list of available LLM models for the frontend dropdown.
    """
    logger.info("=== GET AVAILABLE MODELS REQUEST ===")
    
    # Check which Ollama models are actually available
    available_ollama_models = {}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get("http://localhost:11434/api/tags")
            if response.status_code == 200:
                result = response.json()
                installed_models = {model["name"]: model for model in result.get("models", [])}
                
                # Filter our available models to only include installed ones
                for model_id, model_info in AVAILABLE_MODELS.items():
                    if model_info["type"] == "ollama":
                        if model_id in installed_models:
                            available_ollama_models[model_id] = model_info
                        else:
                            logger.warning(f"Ollama model {model_id} not found in installed models")
                    else:  # google models
                        available_ollama_models[model_id] = model_info
                        
                logger.info(f"Found {len(available_ollama_models)} available models")
            else:
                logger.warning("Could not connect to Ollama, returning all configured models")
                available_ollama_models = AVAILABLE_MODELS
    except Exception as e:
        logger.warning(f"Error checking Ollama models: {e}, returning all configured models")
        available_ollama_models = AVAILABLE_MODELS
    
    return {
        "models": available_ollama_models,
        "default_model": "gemma3:27b"
    }


@app.post("/patients/{patient_id}/summarize")
async def summarize_patient_data(patient_id: int, request: Request):
    """
    Generates a new summary from patient data using the specified LLM model.
    For 'current' type, this creates an incremental update based on previous summary.
    Does NOT save the summary.
    """
    logger.info(f"=== SUMMARIZE REQUEST STARTED ===")
    logger.info(f"Patient ID: {patient_id}")
    
    body = await request.json()
    summary_type = body.get("summary_type", "historical") # 'historical' or 'current'
    model = body.get("model", "gemma3:27b")  # Default to gemma3:27b
    logger.info(f"Summary Type: {summary_type}")
    logger.info(f"Selected Model: {model}")

    async with async_session() as session:
        patient = await session.get(Patient, patient_id)
        if not patient:
            logger.error(f"Patient {patient_id} not found")
            raise HTTPException(status_code=404, detail="Patient not found")
        
        logger.info(f"Patient found: {patient.synthea_id}")
        
        # Get previous summary for incremental updates (current type only)
        previous_summary = None
        if summary_type == 'current':
            logger.info("Fetching previous summary for incremental update")
            result = await session.execute(
                select(PatientSummary)
                .where(PatientSummary.patient_id == patient_id)
                .where(PatientSummary.summary_type == summary_type)
                .where(PatientSummary.is_active == True)
            )
            previous = result.scalar_one_or_none()
            if previous:
                previous_summary = previous.content
                logger.info(f"Previous summary found, version: {previous.version}")
            else:
                logger.info("No previous summary found, will create initial current summary")
        
        if summary_type == 'current':
            stats = get_fhir_stats(patient.data, last_n=10)
            logger.info(f"Generated current stats (last 10 events), length: {len(stats)} characters")
        else:
            stats = get_fhir_stats(patient.data)
            logger.info(f"Generated historical stats, length: {len(stats)} characters")
            
        logger.info(f"Initiating LLM call for summary generation with model: {model}")
        summary_text = await call_llm(stats, summary_type, previous_summary, model)
        
        # Generate highlighted version for current summaries
        highlighted_html = None
        if summary_type == 'current':
            logger.info("Generating highlighted HTML for current summary")
            highlighted_html = highlight_changes(previous_summary or "", summary_text)
        
        logger.info(f"=== SUMMARIZE REQUEST COMPLETED ===")
        logger.info(f"Generated summary length: {len(summary_text)} characters")
        
        return {
            "summary": summary_text,
            "highlighted_html": highlighted_html,
            "has_previous": previous_summary is not None,
            "model_used": model
        }

@app.get("/patients/{patient_id}/summary/{summary_type}/history")
async def get_summary_history(patient_id: int, summary_type: str):
    """
    Fetches all versions of a summary for a patient.
    """
    async with async_session() as session:
        result = await session.execute(
            select(PatientSummary)
            .where(PatientSummary.patient_id == patient_id)
            .where(PatientSummary.summary_type == summary_type)
            .order_by(PatientSummary.version.desc())
        )
        history = result.scalars().all()
        return [{"version": h.version, "content": h.content, "created_at": h.created_at} for h in history]

@app.get("/patients/{patient_id}/summary")
async def get_patient_summary(patient_id: int):
    """
    Fetches the latest active 'historical' and 'current' summaries for a patient.
    """
    summaries = {}
    async with async_session() as session:
        for s_type in ['historical', 'current']:
            result = await session.execute(
                select(PatientSummary)
                .where(PatientSummary.patient_id == patient_id)
                .where(PatientSummary.summary_type == s_type)
                .where(PatientSummary.is_active == True)
            )
            summary = result.scalar_one_or_none()
            if summary:
                summaries[s_type] = {
                    "content": summary.content,
                    "highlighted_html": summary.changes_highlighted,
                    "version": summary.version,
                    "created_at": summary.created_at.isoformat() if summary.created_at else None
                }
            else:
                summaries[s_type] = None
    return summaries

@app.post("/patients/{patient_id}/summary")
async def save_patient_summary(patient_id: int, request: Request):
    """
    Saves a patient summary to the database.
    """
    logger.info(f"=== SAVE SUMMARY REQUEST STARTED ===")
    logger.info(f"Patient ID: {patient_id}")
    
    body = await request.json()
    summary_type = body.get("type")
    content = body.get("content", "")
    highlighted_html = body.get("highlighted_html")
    
    logger.info(f"Summary Type: {summary_type}")
    logger.info(f"Content Length: {len(content)} characters")
    logger.info(f"Has Highlighted HTML: {highlighted_html is not None}")
    
    if not content.strip():
        logger.error("Empty content provided for summary")
        raise HTTPException(status_code=400, detail="Summary content cannot be empty")

    async with async_session() as session:
        # Get the latest version for this patient and summary type
        result = await session.execute(
            select(PatientSummary)
            .where(PatientSummary.patient_id == patient_id)
            .where(PatientSummary.summary_type == summary_type)
            .order_by(PatientSummary.version.desc())
        )
        latest = result.scalar_one_or_none()
        
        new_version = 1 if not latest else latest.version + 1
        logger.info(f"Creating new version: {new_version}")
        
        # Deactivate previous active summary
        if latest and latest.is_active:
            logger.info("Deactivating previous active summary")
            latest.is_active = False
            session.add(latest)
        
        # Create new summary
        new_summary = PatientSummary(
            patient_id=patient_id,
            summary_type=summary_type,
            content=content,
            version=new_version,
            is_active=True,
            changes_highlighted=highlighted_html
        )
        
        session.add(new_summary)
        await session.commit()
        await session.refresh(new_summary)
        
        logger.info(f"=== SAVE SUMMARY REQUEST COMPLETED ===")
        logger.info(f"Summary saved with ID: {new_summary.id}, Version: {new_summary.version}")
        
        return {
            "id": new_summary.id,
            "version": new_summary.version,
            "created_at": new_summary.created_at
        }

# --- REST Endpoint: Create/Simulate Patient ---
@app.post("/admit-patient")
async def admit_patient():
    """
    Admit a new patient by calling Synthea's /generate-patient, saving to Postgres, and returning the new patient ID.
    """
    synthea_data = await fetch_synthea_patient()
    # Extract the Patient resource's id from the FHIR bundle
    synthea_id = None
    for entry in synthea_data.get("entry", []):
        resource = entry.get("resource", {})
        if resource.get("resourceType") == "Patient":
            synthea_id = resource.get("id")
            break
    if not synthea_id:
        synthea_id = synthea_data.get("id", "synthea")
    async with async_session() as session:
        patient = Patient(synthea_id=synthea_id, data=synthea_data)
        session.add(patient)
        await session.commit()
        await session.refresh(patient)
    return {"id": patient.id, "synthea_id": patient.synthea_id}

@app.get("/patients", response_model=List[dict])
async def get_patients():
    """
    Fetch all patients from the EHR simulator's database.
    """
    async with async_session() as session:
        result = await session.execute(
            Patient.__table__.select()
        )
        patients = result.fetchall()
        # Return only id and synthea_id for listing
        return [{"id": p.id, "synthea_id": p.synthea_id} for p in patients]

@app.get("/patients/{patient_id}")
async def get_patient(patient_id: int):
    """
    Fetch a single patient (full FHIR bundle) by ID from the EHR simulator's database.
    """
    async with async_session() as session:
        patient = await session.get(Patient, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        return {"id": patient.id, "synthea_id": patient.synthea_id, "data": patient.data}

@app.post("/patients/{patient_id}/fax-upload")
async def upload_fax_tiff(patient_id: int, file: UploadFile = File(...)):
    """
    Accepts a TIFF file upload, sends it to Gemma 3 4B for parsing, and returns the result.
    """
    logger.info(f"=== FAX UPLOAD REQUEST STARTED ===")
    logger.info(f"Patient ID: {patient_id}")
    logger.info(f"File: {file.filename}, Content-Type: {file.content_type}")
    
    # Save uploaded file to a temp location
    suffix = ".tiff" if file.filename.lower().endswith(".tiff") else ".tif"
    async with aiofiles.tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        await tmp.write(content)
        tmp_path = tmp.name
        logger.info(f"File saved to temp location: {tmp_path}")
        logger.info(f"File size: {len(content)} bytes")

    # Encode file as base64 data URL
    encoded_string = base64.b64encode(content).decode("utf-8")
    data_url = f"data:image/tiff;base64,{encoded_string}"
    logger.info(f"File encoded as base64, data URL length: {len(data_url)} characters")

    # Prepare payload for Ollama OpenAI-compatible endpoint
    payload = {
        "model": "gemma3:27b",
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Parse this fax and summarize the key clinical information."},
                    {"type": "image_url", "image_url": {"url": data_url}}
                ]
            }
        ]
    }
    
    logger.info(f"Prepared LLM payload for model: {payload['model']}")
    logger.info(f"Payload size: {len(json.dumps(payload))} characters")
    
    # Send to Ollama (OpenAI-compatible endpoint)
    OLLAMA_OPENAI_URL = os.getenv("OLLAMA_OPENAI_URL", "http://localhost:11434/v1/chat/completions")
    logger.info(f"Sending request to Ollama at: {OLLAMA_OPENAI_URL}")
    
    try:
        request_start = datetime.now()
        async with httpx.AsyncClient(timeout=LLM_CONFIG["timeout"]) as client:
            response = await client.post(OLLAMA_OPENAI_URL, json=payload)
            request_end = datetime.now()
            request_duration = (request_end - request_start).total_seconds()
            
            logger.info(f"LLM request completed in {request_duration:.2f} seconds")
            logger.info(f"Response status: {response.status_code}")
            
            response.raise_for_status()
            result = response.json()
            
            logger.info(f"=== FAX UPLOAD REQUEST COMPLETED SUCCESSFULLY ===")
            logger.info(f"Response received and parsed successfully")
            
            return result
    except (httpx.RequestError, httpx.HTTPStatusError) as e:
        error_msg = f"Could not connect to Ollama or model error: {e}"
        logger.error(f"=== FAX UPLOAD REQUEST FAILED ===")
        logger.error(f"Error: {error_msg}")
        return {"error": error_msg}

@app.post("/upload-fax/")
async def upload_fax(file: UploadFile = File(...)):
    logger.info(f"=== GENERAL FAX UPLOAD REQUEST STARTED ===")
    logger.info(f"File: {file.filename}, Content-Type: {file.content_type}")
    
    # Check file type
    if not file.filename.lower().endswith((".tif", ".tiff")):
        logger.error("File is not a TIFF format")
        raise HTTPException(status_code=400, detail="Only TIFF files are supported.")

    # Read TIFF file
    tiff_bytes = await file.read()
    logger.info(f"File read successfully, size: {len(tiff_bytes)} bytes")
    
    try:
        logger.info("Converting TIFF to PNG format")
        tiff_image = Image.open(io.BytesIO(tiff_bytes))
        png_buffer = io.BytesIO()
        tiff_image.save(png_buffer, format="PNG")
        png_bytes = png_buffer.getvalue()
        logger.info(f"TIFF to PNG conversion successful. PNG size: {len(png_bytes)} bytes")
    except Exception as e:
        logger.error(f"Image conversion failed: {str(e)}")
        return JSONResponse(status_code=500, content={"error": f"Image conversion failed: {str(e)}"})

    # Encode PNG as base64 for LLM API
    png_b64 = base64.b64encode(png_bytes).decode("utf-8")
    logger.info(f"PNG encoded as base64, length: {len(png_b64)} characters")

    # Prepare payload for llava-llama3
    payload = {
        "model": "llava:latest",
        "messages": [
            {"role": "user", "content": [
                {"type": "image_url", "image_url": f"data:image/png;base64,{png_b64}"}
            ]}
        ]
    }
    logger.info(f"Prepared LLM payload for model: {payload['model']}")
    logger.info(f"Payload size: {len(json.dumps(payload))} characters")
    
    # Call Ollama API
    try:
        logger.info("Sending PNG to Ollama LLM API")
        request_start = datetime.now()
        response = requests.post("http://localhost:11434/v1/chat/completions", json=payload, timeout=60)
        request_end = datetime.now()
        request_duration = (request_end - request_start).total_seconds()
        
        logger.info(f"LLM request completed in {request_duration:.2f} seconds")
        logger.info(f"Response status: {response.status_code}")
        
        response.raise_for_status()
        result = response.json()
        logger.info(f"Response received and parsed successfully")
        
        details = result.get("choices", [{}])[0].get("message", {}).get("content", "")
        logger.info(f"=== GENERAL FAX UPLOAD REQUEST COMPLETED SUCCESSFULLY ===")
        logger.info(f"Generated response length: {len(details)} characters")
        
        return JSONResponse(content={"details": details})
    except Exception as e:
        logger.error(f"=== GENERAL FAX UPLOAD REQUEST FAILED ===")
        logger.error(f"LLM API call failed: {str(e)}")
        return JSONResponse(status_code=500, content={"error": f"LLM API call failed: {str(e)}"})

# --- DB Init Utility ---
@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

def assess_clinical_significance(previous_summary: str, new_data: str) -> str:
    """
    Analyze the clinical significance of new data compared to previous summary.
    Provides guidance to LLM about whether modifications are warranted.
    """
    if not previous_summary:
        return "Initial summary - no previous data to compare."
    
    # Keywords that typically indicate significant clinical changes
    critical_indicators = [
        "critical", "emergent", "urgent", "deteriorating", "unstable",
        "cardiac arrest", "respiratory failure", "sepsis", "shock",
        "acute", "severe", "crisis", "emergency"
    ]
    
    significant_indicators = [
        "new diagnosis", "medication change", "treatment response",
        "improved", "worsened", "complication", "adverse reaction",
        "surgery", "procedure", "admission", "discharge"
    ]
    
    routine_indicators = [
        "stable", "unchanged", "routine", "maintenance", "follow-up",
        "regular", "scheduled", "monitoring"
    ]
    
    new_data_lower = new_data.lower()
    previous_lower = previous_summary.lower()
    
    # Assess significance level
    significance_score = 0
    significance_notes = []
    
    # Check for critical changes
    for indicator in critical_indicators:
        if indicator in new_data_lower and indicator not in previous_lower:
            significance_score += 3
            significance_notes.append(f"Critical indicator detected: {indicator}")
    
    # Check for significant changes
    for indicator in significant_indicators:
        if indicator in new_data_lower:
            significance_score += 2
            significance_notes.append(f"Significant clinical change: {indicator}")
    
    # Check for routine/stable indicators (reduce significance)
    for indicator in routine_indicators:
        if indicator in new_data_lower:
            significance_score -= 1
            significance_notes.append(f"Routine/stable indicator: {indicator}")
    
    # Determine recommendation
    if significance_score >= CLINICAL_SIGNIFICANCE["critical_threshold"]:
        recommendation = "HIGH SIGNIFICANCE: Major modifications to previous recommendations may be warranted. Carefully review and update care plans as needed."
    elif significance_score >= CLINICAL_SIGNIFICANCE["significant_threshold"]:
        recommendation = "MODERATE SIGNIFICANCE: Some modifications to previous recommendations may be appropriate. Add new information while preserving stable elements."
    elif significance_score >= CLINICAL_SIGNIFICANCE["routine_threshold"]:
        recommendation = "LOW SIGNIFICANCE: Minimal modifications needed. Focus on adding new information while preserving existing assessments and recommendations."
    else:
        recommendation = "ROUTINE UPDATE: Maintain previous recommendations unless specifically contraindicated. Add routine monitoring information."
    
    assessment = f"""
CLINICAL SIGNIFICANCE ASSESSMENT:
Significance Score: {significance_score}
{recommendation}

Detected Indicators:
{chr(10).join(significance_notes) if significance_notes else "No specific clinical change indicators detected."}

GUIDANCE FOR SUMMARY UPDATE:
- Preserve all stable clinical information and ongoing care plans
- Only modify recommendations when clinically justified by the new data
- Maintain professional clinical documentation standards
- Ensure continuity of care information
"""
    
    return assessment 