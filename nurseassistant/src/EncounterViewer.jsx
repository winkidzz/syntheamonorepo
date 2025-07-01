import React from 'react';
import { Card, CardContent, Typography, Table, TableContainer, TableHead, TableBody, TableCell, TableRow, Paper } from '@mui/material';

export function EncounterViewer({ resources }) {
    if (!resources || resources.length === 0) {
        return <Typography>No encounter data available.</Typography>;
    }

    return (
        <Card>
            <CardContent>
                <Typography variant="h5" component="div" gutterBottom>
                    Encounters
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: '75vh' }}>
                    <Table stickyHeader sx={{ minWidth: 650 }} aria-label="encounters table">
                        <TableHead>
                            <TableRow>
                                <TableCell>Encounter Type</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Period</TableCell>
                                <TableCell>Location</TableCell>
                                <TableCell>Service Provider</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {resources.map((enc) => (
                                <TableRow key={enc.id}>
                                    <TableCell>{enc.type?.[0]?.text || enc.type?.[0]?.coding?.[0]?.display || 'N/A'}</TableCell>
                                    <TableCell>{enc.status || 'N/A'}</TableCell>
                                    <TableCell>
                                        {enc.period?.start ? new Date(enc.period.start).toLocaleString() : ''}
                                        {enc.period?.end ? ` - ${new Date(enc.period.end).toLocaleString()}` : ''}
                                    </TableCell>
                                    <TableCell>{enc.location?.[0]?.location?.display || 'N/A'}</TableCell>
                                    <TableCell>{enc.serviceProvider?.display || 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );
} 