import React from 'react';
import { Card, CardContent, Typography, Table, TableContainer, TableHead, TableBody, TableCell, TableRow, Paper } from '@mui/material';

export function ConditionViewer({ resources }) {
    if (!resources || resources.length === 0) {
        return <Typography>No condition data available.</Typography>;
    }

    return (
        <Card>
            <CardContent>
                <Typography variant="h5" component="div" gutterBottom>
                    Conditions
                </Typography>
                <TableContainer component={Paper}>
                    <Table sx={{ minWidth: 650 }} aria-label="conditions table">
                        <TableHead>
                            <TableRow>
                                <TableCell>Condition</TableCell>
                                <TableCell>Clinical Status</TableCell>
                                <TableCell>Verification Status</TableCell>
                                <TableCell>Onset Date</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {resources.map((condition) => (
                                <TableRow key={condition.id}>
                                    <TableCell>{condition.code?.text || condition.code?.coding?.[0]?.display || 'N/A'}</TableCell>
                                    <TableCell>{condition.clinicalStatus?.coding?.[0]?.code || 'N/A'}</TableCell>
                                    <TableCell>{condition.verificationStatus?.coding?.[0]?.code || 'N/A'}</TableCell>
                                    <TableCell>{condition.onsetDateTime ? new Date(condition.onsetDateTime).toLocaleDateString() : 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );
} 