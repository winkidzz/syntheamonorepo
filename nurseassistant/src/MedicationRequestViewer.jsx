import React from 'react';
import { Card, CardContent, Typography, Table, TableContainer, TableHead, TableBody, TableCell, TableRow, Paper } from '@mui/material';

export function MedicationRequestViewer({ resources }) {
    if (!resources || resources.length === 0) {
        return <Typography>No medication request data available.</Typography>;
    }

    return (
        <Card>
            <CardContent>
                <Typography variant="h5" component="div" gutterBottom>
                    Medication Requests
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: '75vh' }}>
                    <Table stickyHeader sx={{ minWidth: 650 }} aria-label="medication requests table">
                        <TableHead>
                            <TableRow>
                                <TableCell>Medication</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Intent</TableCell>
                                <TableCell>Authored On</TableCell>
                                <TableCell>Dosage</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {resources.map((req) => (
                                <TableRow key={req.id}>
                                    <TableCell>{req.medicationCodeableConcept?.text || req.medicationCodeableConcept?.coding?.[0]?.display || 'N/A'}</TableCell>
                                    <TableCell>{req.status || 'N/A'}</TableCell>
                                    <TableCell>{req.intent || 'N/A'}</TableCell>
                                    <TableCell>{req.authoredOn ? new Date(req.authoredOn).toLocaleDateString() : 'N/A'}</TableCell>
                                    <TableCell>{req.dosageInstruction?.[0]?.text || 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );
} 