import React from 'react';
import { Card, CardContent, Typography, Table, TableContainer, TableHead, TableBody, TableCell, TableRow, Paper } from '@mui/material';

export function ImmunizationViewer({ resources }) {
    if (!resources || resources.length === 0) {
        return <Typography>No immunization data available.</Typography>;
    }

    return (
        <Card>
            <CardContent>
                <Typography variant="h5" component="div" gutterBottom>
                    Immunizations
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: '75vh' }}>
                    <Table stickyHeader sx={{ minWidth: 650 }} aria-label="immunizations table">
                        <TableHead>
                            <TableRow>
                                <TableCell>Vaccine</TableCell>
                                <TableCell>Date Administered</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Lot Number</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {resources.map((imm) => (
                                <TableRow key={imm.id}>
                                    <TableCell>{imm.vaccineCode?.text || imm.vaccineCode?.coding?.[0]?.display || 'N/A'}</TableCell>
                                    <TableCell>{imm.occurrenceDateTime ? new Date(imm.occurrenceDateTime).toLocaleDateString() : 'N/A'}</TableCell>
                                    <TableCell>{imm.status || 'N/A'}</TableCell>
                                    <TableCell>{imm.lotNumber || 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );
} 