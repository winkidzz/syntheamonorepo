# Healthcare Simulation Platform - Monorepo

A comprehensive healthcare simulation platform consisting of three integrated projects working together to provide sophisticated patient data generation, EHR simulation, and clinical AI summarization.

## 🏗️ Monorepo Structure

```
syntheamonorepo/
├── synthea/                    # Java Spring Boot - Patient Data Generator
├── ehrsimulator/              # Python FastAPI - EHR Simulator with AI
├── nurseassistant/            # React Frontend - Clinical UI
├── .gitignore                 # Comprehensive monorepo gitignore
├── README.md                  # This file
├── ollama-nginx.conf          # Ollama proxy configuration
└── setup_ssh_mac.sh           # Development setup script
```

## 🚀 Quick Start

### Prerequisites
- **Docker** (for PostgreSQL)
- **Python 3.9+** with virtual environment
- **Node.js 16+** and npm
- **Java 11+** (for Synthea)
- **Ollama** with llama3:8b model

### 1. Start PostgreSQL
```bash
docker run --name postgres-ehr -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres
```

### 2. Start Ollama
```bash
ollama serve  # Port 11434
ollama pull llama3:8b
```

### 3. Start Synthea (Patient Generator)
```bash
cd synthea
./gradlew bootRun  # Port 8081
```

### 4. Start EHR Simulator
```bash
cd ehrsimulator
source ehrsimulator-venv/bin/activate
python start_server.py  # Port 8002
```

### 5. Start Nurse Assistant (Frontend)
```bash
cd nurseassistant
npm install
npm run dev  # Port 5173
```

## 📁 Project Details

### 1. Synthea Spring Boot (`/synthea`)
**Patient Data Generator** - Java Spring Boot application that generates realistic FHIR patient data.

- **Port**: 8081
- **Technology**: Java 11, Spring Boot, Gradle
- **Purpose**: Generate comprehensive patient FHIR bundles
- **API**: `/generate-patient` - Creates new patient data

### 2. EHR Simulator (`/ehrsimulator`)
**Enhanced EHR Backend** - Python FastAPI application with advanced AI-powered clinical summarization.

- **Port**: 8002
- **Technology**: Python, FastAPI, SQLAlchemy, PostgreSQL
- **Purpose**: Store patient data, provide AI summarization, manage clinical workflows
- **Key Features**:
  - Temperature=0 LLM for reproducible clinical summaries
  - Incremental summary updates with clinical significance assessment
  - FHIR data processing and storage
  - Real-time patient event simulation

#### Enhanced AI Summarization
```python
LLM_CONFIG = {
    "temperature": 0.0,      # Reproducible results
    "top_p": 1.0,           # Deterministic sampling
    "repeat_penalty": 1.1,   # Avoid repetition
    "top_k": 1,             # Most deterministic setting
    "timeout": 120.0        # Extended timeout
}
```

### 3. Nurse Assistant (`/nurseassistant`)
**Clinical Frontend** - React application providing a modern clinical interface.

- **Port**: 5173
- **Technology**: React, Material-UI, Vite
- **Purpose**: Clinical user interface for patient management and summary viewing
- **Key Features**:
  - Patient list and details
  - AI-generated summary viewing with highlighting
  - Version history tracking
  - Edit functionality before saving

## 🔧 Configuration

### Database Setup
The EHR Simulator connects to PostgreSQL with these default settings:
- **Host**: localhost:5432
- **Database**: postgres
- **User**: postgres
- **Password**: postgres

### Ollama Configuration
The AI summarization system uses Ollama with these models:
- **Primary**: `gemma3:27b` (for text summarization)
- **Vision**: `llava:latest` (for document/image processing)

## 📊 API Endpoints

### EHR Simulator APIs
```bash
# Patient Management
GET    /patients                    # List all patients
GET    /patients/{id}               # Get patient details
POST   /admit-patient               # Generate new patient

# AI Summarization
POST   /patients/{id}/summarize     # Generate summary
GET    /patients/{id}/summary       # Get latest summaries
POST   /patients/{id}/summary       # Save edited summary
GET    /patients/{id}/summary/{type}/history  # Version history

# Document Processing
POST   /upload-fax/                 # Process TIFF documents
POST   /patients/{id}/fax-upload    # Process patient documents
```

### Synthea APIs
```bash
GET    /generate-patient            # Generate new patient data
GET    /actuator/health             # Health check
```

## 🧪 Testing

### Test AI Summarization
```bash
# Generate historical summary
curl -X POST http://localhost:8002/patients/1/summarize \
  -H "Content-Type: application/json" \
  -d '{"summary_type": "historical"}'

# Generate current summary (incremental)
curl -X POST http://localhost:8002/patients/1/summarize \
  -H "Content-Type: application/json" \
  -d '{"summary_type": "current"}'
```

### Test Document Processing
```bash
# Upload and process a TIFF document
curl -X POST http://localhost:8002/upload-fax/ \
  -F "file=@sample_lab_report.tiff"
```

## 🔍 Monitoring

### Health Checks
```bash
# Check all services
curl http://localhost:8081/actuator/health  # Synthea
curl http://localhost:8002/patients         # EHR Simulator
curl http://localhost:5173                  # Nurse Assistant
curl http://localhost:11434/api/tags        # Ollama
```

## 🏥 Clinical Features

### AI-Powered Summarization
- **Reproducible Results**: Temperature=0 ensures consistent outputs
- **Clinical Significance Assessment**: Automatic evaluation of change importance
- **Incremental Updates**: Preserves existing recommendations unless clinically justified
- **Professional Documentation**: Maintains medical documentation standards

### Enhanced FHIR Processing
- Comprehensive patient data extraction
- Vital signs and lab results categorization
- Medication and condition tracking
- Encounter and procedure history

### Clinical Workflow Integration
- Patient admission and data generation
- Real-time event simulation
- AI-powered clinical summaries
- Version-controlled documentation
- Professional clinical interface

## 🛠️ Development

### Adding New Features
1. **Backend Changes**: Modify `/ehrsimulator/main.py`
2. **Frontend Changes**: Modify `/nurseassistant/src/`
3. **Patient Generation**: Modify `/synthea/src/`

### Database Migrations
The EHR Simulator uses SQLAlchemy with automatic table creation. Schema changes should be made in `/ehrsimulator/main.py`.

### Environment Variables
Key environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `OLLAMA_URL`: Ollama API endpoint
- `OLLAMA_OPENAI_URL`: Ollama OpenAI-compatible endpoint

## 📚 Documentation

- **Synthea**: [Synthea Documentation](https://synthetichealth.github.io/synthea/)
- **FastAPI**: [FastAPI Documentation](https://fastapi.tiangolo.com/)
- **React**: [React Documentation](https://react.dev/)
- **Ollama**: [Ollama Documentation](https://ollama.ai/docs)
- **FHIR**: [FHIR R4 Specification](https://hl7.org/fhir/R4/)

## 🤝 Contributing

This monorepo contains three integrated projects. When contributing:

1. **Follow the existing code structure** in each project
2. **Test all three services** work together
3. **Update documentation** for any API changes
4. **Maintain clinical accuracy** in AI features

## 📄 License

This project is for educational and research purposes in healthcare simulation and AI applications. 