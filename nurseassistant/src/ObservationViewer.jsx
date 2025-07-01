import React from 'react';
import { Card, CardContent, Typography, Table, TableContainer, TableHead, TableBody, TableCell, TableRow, Paper } from '@mui/material';

// Function to format the value from an Observation resource
function formatValue(value) {
    if (!value) return 'N/A';
    if (value.valueQuantity) {
        return `${value.valueQuantity.value.toFixed(2)} ${value.valueQuantity.unit || ''}`;
    }
    if (value.valueCodeableConcept) {
        return value.valueCodeableConcept.text || value.valueCodeableConcept.coding?.[0]?.display;
    }
    if (value.valueString) {
        return value.valueString;
    }
    if (value.component) {
        return value.component.map(c => 
            `${c.code?.text}: ${c.valueQuantity?.value?.toFixed(2)} ${c.valueQuantity?.unit || ''}`
        ).join('; ');
    }
    return JSON.stringify(value);
}

export function ObservationViewer({ resources }) {
    if (!resources || resources.length === 0) {
        return <Typography>No observation data available.</Typography>;
    }

    return (
        <Card>
            <CardContent>
                <Typography variant="h5" component="div" gutterBottom>
                    Observations
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: '75vh' }}>
                    <Table stickyHeader sx={{ minWidth: 650 }} aria-label="observations table">
                        <TableHead>
                            <TableRow>
                                <TableCell>Observation</TableCell>
                                <TableCell>Value</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Effective Date</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {resources.map((obs) => (
                                <TableRow key={obs.id}>
                                    <TableCell>{obs.code?.text || obs.code?.coding?.[0]?.display || 'N/A'}</TableCell>
                                    <TableCell>{formatValue(obs)}</TableCell>
                                    <TableCell>{obs.status || 'N/A'}</TableCell>
                                    <TableCell>{obs.effectiveDateTime ? new Date(obs.effectiveDateTime).toLocaleString() : 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );
} 