import React from 'react';
import { Card, CardContent, Typography, Table, TableContainer, TableHead, TableBody, TableCell, TableRow, Paper } from '@mui/material';

export function ProcedureViewer({ resources }) {
    if (!resources || resources.length === 0) {
        return <Typography>No procedure data available.</Typography>;
    }

    return (
        <Card>
            <CardContent>
                <Typography variant="h5" component="div" gutterBottom>
                    Procedures
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: '75vh' }}>
                    <Table stickyHeader sx={{ minWidth: 650 }} aria-label="procedures table">
                        <TableHead>
                            <TableRow>
                                <TableCell>Procedure</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Date Performed</TableCell>
                                <TableCell>Outcome</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {resources.map((proc) => (
                                <TableRow key={proc.id}>
                                    <TableCell>{proc.code?.text || proc.code?.coding?.[0]?.display || 'N/A'}</TableCell>
                                    <TableCell>{proc.status || 'N/A'}</TableCell>
                                    <TableCell>{proc.performedDateTime ? new Date(proc.performedDateTime).toLocaleString() : 'N/A'}</TableCell>
                                    <TableCell>{proc.outcome?.text || 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );
} 