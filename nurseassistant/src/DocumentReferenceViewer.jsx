import React from 'react';
import { Card, CardContent, Typography, Table, TableContainer, TableHead, TableBody, TableCell, TableRow, Paper, Link } from '@mui/material';

export function DocumentReferenceViewer({ resources }) {
    if (!resources || resources.length === 0) {
        return <Typography>No document reference data available.</Typography>;
    }

    return (
        <Card>
            <CardContent>
                <Typography variant="h5" component="div" gutterBottom>
                    Document References
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: '75vh' }}>
                    <Table stickyHeader sx={{ minWidth: 650 }} aria-label="document references table">
                        <TableHead>
                            <TableRow>
                                <TableCell>Document Type</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell>Content</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {resources.map((doc) => (
                                <TableRow key={doc.id}>
                                    <TableCell>{doc.type?.text || doc.type?.coding?.[0]?.display || 'N/A'}</TableCell>
                                    <TableCell>{doc.status || 'N/A'}</TableCell>
                                    <TableCell>{doc.date ? new Date(doc.date).toLocaleString() : 'N/A'}</TableCell>
                                    <TableCell>
                                        {doc.content?.[0]?.attachment?.url ? (
                                            <Link href={doc.content[0].attachment.url} target="_blank" rel="noopener">
                                                View Document
                                            </Link>
                                        ) : 'No link'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );
} 