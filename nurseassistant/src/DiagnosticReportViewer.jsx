import React from 'react';
import { Card, CardContent, Typography, Table, TableContainer, TableHead, TableBody, TableCell, TableRow, Paper } from '@mui/material';

export function DiagnosticReportViewer({ resources }) {
    if (!resources || resources.length === 0) {
        return <Typography>No diagnostic report data available.</Typography>;
    }

    return (
        <Card>
            <CardContent>
                <Typography variant="h5" component="div" gutterBottom>
                    Diagnostic Reports
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: '75vh' }}>
                    <Table stickyHeader sx={{ minWidth: 650 }} aria-label="diagnostic reports table">
                        <TableHead>
                            <TableRow>
                                <TableCell>Report</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Effective Date</TableCell>
                                <TableCell>Conclusion</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {resources.map((report) => (
                                <TableRow key={report.id}>
                                    <TableCell>{report.code?.text || report.code?.coding?.[0]?.display || 'N/A'}</TableCell>
                                    <TableCell>{report.status || 'N/A'}</TableCell>
                                    <TableCell>{report.effectiveDateTime ? new Date(report.effectiveDateTime).toLocaleString() : 'N/A'}</TableCell>
                                    <TableCell>{report.conclusion || 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );
} 