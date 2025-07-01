import React from 'react';
import { Card, CardContent, Typography, List, ListItem, ListItemText, Paper } from '@mui/material';

// A helper to find a meaningful display text from a resource
function getResourceText(resource) {
    if (!resource) return 'N/A';
    // For DiagnosticReport, Procedure, Encounter, etc.
    if (resource.code?.text) return resource.code.text;
    if (resource.code?.coding?.[0]?.display) return resource.code.coding[0].display;
    // For MedicationRequest
    if (resource.medicationCodeableConcept?.text) return resource.medicationCodeableConcept.text;
    if (resource.medicationCodeableConcept?.coding?.[0]?.display) return resource.medicationCodeableConcept.coding[0].display;
    // For DocumentReference
    if (resource.type?.text) return resource.type.text;
    // For Claim
    if (resource.type?.coding?.[0]?.display) return `Claim: ${resource.type.coding[0].display}`;
    // For EOB
    if (resource.type?.coding?.[0]?.display) return `EOB: ${resource.type.coding[0].display}`;
    // For SupplyDelivery
    if (resource.type?.text) return resource.type.text;
    if (resource.patient?.display) return `Supply for ${resource.patient.display}`;
    
    return `Resource ID: ${resource.id || 'Unknown'}`;
}

export function SimpleResourceListViewer({ resources, title }) {
    if (!resources || resources.length === 0) {
        return <Typography>No {title.toLowerCase()} data available.</Typography>;
    }

    return (
        <Card>
            <CardContent>
                <Typography variant="h5" component="div" gutterBottom>
                    {title}
                </Typography>
                <Paper sx={{ maxHeight: '75vh', overflow: 'auto' }}>
                    <List>
                        {resources.map((resource) => (
                            <ListItem key={resource.id} divider>
                                <ListItemText 
                                    primary={getResourceText(resource)}
                                    secondary={`Date: ${resource.effectiveDateTime || resource.performedDateTime || resource.authoredOn || resource.created || 'N/A'}`}
                                />
                            </ListItem>
                        ))}
                    </List>
                </Paper>
            </CardContent>
        </Card>
    );
} 