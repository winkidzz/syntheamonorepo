import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemText, Box, Tabs, Tab, Card, CardContent, Table, TableBody, TableCell, TableRow, TableHead, Paper, CssBaseline, CircularProgress, Divider, Button, IconButton
} from "@mui/material";
import { ArrowBack } from '@mui/icons-material';
import { getDemographicsFromFHIR } from "./fhir";
import { PatientResourceViewer } from "./PatientResourceViewer";
import { ConditionViewer } from "./ConditionViewer";
import { ObservationViewer } from "./ObservationViewer";
import { SimpleResourceListViewer } from "./SimpleResourceListViewer";
import { PatientBanner } from "./PatientBanner";
import { ImmunizationViewer } from "./ImmunizationViewer";
import { EncounterViewer } from "./EncounterViewer";
import { DiagnosticReportViewer } from "./DiagnosticReportViewer";
import { ProcedureViewer } from "./ProcedureViewer";
import { MedicationRequestViewer } from "./MedicationRequestViewer";
import { BillingViewer } from "./BillingViewer";
import { SupplyDeliveryViewer } from "./SupplyDeliveryViewer";
import { DocumentReferenceViewer } from "./DocumentReferenceViewer";
import { SummaryViewer } from "./SummaryViewer";
import { TestSummaryHighlight } from "./TestSummaryHighlight";

const API_BASE = "http://localhost:8002";
const drawerWidth = 280;

function PatientList({ patients, patientDetails, onSelect, onAdmit }) {
  return (
    <>
      <Box sx={{ px: 2, py: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="h6">Patients</Typography>
        <Button variant="contained" color="primary" onClick={onAdmit} sx={{ width: '100%' }}>Admit Patient</Button>
      </Box>
      <Divider />
      <List>
        {patients.map((p) => {
          const details = patientDetails[p.id] || {};
          return (
            <ListItem button key={p.id} onClick={() => onSelect(p.id)} alignItems="flex-start">
              <ListItemText
                primary={details.name ? details.name : `Patient #${p.id}`}
                secondary={<><span>Gender: {details.gender || '-'}</span><br/><span>Age: {details.age || '-'}</span></>}
              />
            </ListItem>
          );
        })}
      </List>
    </>
  );
}

function ResourceList({ resourceCounts, onSelect, selectedResource, onBack }) {
    // Separate Summary from other resources and always show it first
    const { Summary, ...otherResources } = resourceCounts;
    const sortedOtherResources = Object.entries(otherResources).sort(([,a],[,b]) => b-a);
    
    // Always put Summary first if it exists, then the top 9 other resources
    const resourcesToShow = [];
    if (Summary !== undefined) {
        resourcesToShow.push(['Summary', Summary]);
    }
    resourcesToShow.push(...sortedOtherResources.slice(0, 9));

    return (
        <>
            <Box sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
                <IconButton onClick={onBack}>
                    <ArrowBack />
                </IconButton>
                <Typography variant="h6" sx={{ ml: 1 }}>Resources</Typography>
            </Box>
            <Divider />
            <Box sx={{ overflow: 'auto' }}>
                <List dense>
                    {resourcesToShow.map(([type, count]) => (
                        <ListItem button key={type} selected={selectedResource === type} onClick={() => onSelect(type)}>
                            <ListItemText primary={`${type} (${count})`} />
                        </ListItem>
                    ))}
                    {sortedOtherResources.length > 9 && <ListItem><ListItemText primary="..." /></ListItem>}
                </List>
            </Box>
        </>
    );
}

function ResourceViewer({ resourceType, fhirBundle, patientId }) {
    if (!resourceType || !fhirBundle) return <Typography>Select a resource from the left.</Typography>;

    const resources = fhirBundle.entry
        .filter(e => e.resource?.resourceType === resourceType)
        .map(e => e.resource);
    
    switch (resourceType) {
        case 'Summary':
            return <SummaryViewer patientId={patientId} />;
        case 'Patient':
            return <PatientResourceViewer resource={resources[0]} />;
        case 'Condition':
            return <ConditionViewer resources={resources} />;
        case 'Observation':
            return <ObservationViewer resources={resources} />;
        case 'Immunization':
            return <ImmunizationViewer resources={resources} />;
        case 'Encounter':
            return <EncounterViewer resources={resources} />;
        case 'DiagnosticReport':
            return <DiagnosticReportViewer resources={resources} />;
        case 'Procedure':
            return <ProcedureViewer resources={resources} />;
        case 'MedicationRequest':
            return <MedicationRequestViewer resources={resources} />;
        case 'Claim':
            return <BillingViewer resources={resources} title="Claims" />;
        case 'ExplanationOfBenefit':
            return <BillingViewer resources={resources} title="Explanation of Benefits" />;
        case 'DocumentReference':
            return <DocumentReferenceViewer resources={resources} />;
        case 'SupplyDelivery':
            return <SupplyDeliveryViewer resources={resources} />;
        default:
            return (
                <Card>
                    <CardContent>
                        <Typography variant="h5" gutterBottom>{resourceType}</Typography>
                        <Paper sx={{ maxHeight: '70vh', overflow: 'auto' }}>
                            <pre>{JSON.stringify(resources, null, 2)}</pre>
                        </Paper>
                    </CardContent>
                </Card>
            );
    }
}

function App() {
  const [patients, setPatients] = useState([]);
  const [patientDetails, setPatientDetails] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [resourceCounts, setResourceCounts] = useState({});
  const [selectedResourceType, setSelectedResourceType] = useState(null);
  const [loadingAdmit, setLoadingAdmit] = useState(false);

  const refreshPatients = () => {
    axios.get(`${API_BASE}/patients`).then((res) => setPatients(res.data));
  };

  useEffect(() => {
    refreshPatients();
  }, []);

  useEffect(() => {
    async function fetchDetails() {
      const details = {};
      await Promise.all(patients.map(async (p) => {
        try {
          const res = await axios.get(`${API_BASE}/patients/${p.id}`);
          details[p.id] = getDemographicsFromFHIR(res.data.data);
        } catch {}
      }));
      setPatientDetails(details);
    }
    if (patients.length > 0) fetchDetails();
  }, [patients]);

  useEffect(() => {
    if (selectedId) {
      axios.get(`${API_BASE}/patients/${selectedId}`).then((res) => {
          const fhirData = res.data.data;
          setSelectedPatient(res.data);

          if (fhirData?.entry) {
              const counts = fhirData.entry.reduce((acc, entry) => {
                  const type = entry.resource?.resourceType;
                  if (type) acc[type] = (acc[type] || 0) + 1;
                  return acc;
              }, {});
              setResourceCounts(counts);
              setSelectedResourceType('Patient'); // Default view
          }
      });
    } else {
        setSelectedPatient(null);
        setResourceCounts({});
        setSelectedResourceType(null);
    }
  }, [selectedId]);

  const handleAdmitPatient = async () => {
    setLoadingAdmit(true);
    try {
      await axios.post(`${API_BASE}/admit-patient`);
      refreshPatients();
    } finally {
      setLoadingAdmit(false);
    }
  };

  const handleSelectPatient = (id) => {
    setSelectedId(id);
  }

  const handleBackToPatientList = () => {
    setSelectedId(null);
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, background: '#1976d2' }}>
        <Toolbar>
          <Typography variant="h5" noWrap component="div" sx={{ fontWeight: 700, letterSpacing: 1 }}>
            Nurse Assistant
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', background: '#f7fafd' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
            {!selectedId ? (
                <PatientList patients={patients} patientDetails={patientDetails} onSelect={handleSelectPatient} onAdmit={handleAdmitPatient} />
            ) : (
                <ResourceList resourceCounts={{'Summary': 1, ...resourceCounts}} onSelect={setSelectedResourceType} selectedResource={selectedResourceType} onBack={handleBackToPatientList} />
            )}
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, bgcolor: '#f4f6fa', minHeight: '100vh', p: 3, ml: `${drawerWidth}px` }}>
        <Toolbar />
        {!selectedPatient && <Typography variant="h6" sx={{ mt: 4, textAlign: 'center', color: 'text.secondary' }}>Select a patient to view details</Typography>}
        {selectedPatient && (
            <>
                <PatientBanner patient={selectedPatient} />
                <ResourceViewer resourceType={selectedResourceType} fhirBundle={selectedPatient.data} patientId={selectedPatient.id} />
            </>
        )}
      </Box>
    </Box>
  );
}

export default App;
