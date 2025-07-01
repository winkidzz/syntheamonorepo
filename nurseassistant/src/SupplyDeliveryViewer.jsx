import React from 'react';
import { Card, CardContent, Typography, Table, TableContainer, TableHead, TableBody, TableCell, TableRow, Paper } from '@mui/material';

export function SupplyDeliveryViewer({ resources }) {
    if (!resources || resources.length === 0) {
        return <Typography>No supply delivery data available.</Typography>;
    }

    return (
        <Card>
            <CardContent>
                <Typography variant="h5" component="div" gutterBottom>
                    Supply Deliveries
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: '75vh' }}>
                    <Table stickyHeader sx={{ minWidth: 650 }} aria-label="supply deliveries table">
                        <TableHead>
                            <TableRow>
                                <TableCell>Item</TableCell>
                                <TableCell>Quantity</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Occurrence Date</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {resources.map((delivery) => (
                                <TableRow key={delivery.id}>
                                    <TableCell>{delivery.suppliedItem?.codeableConcept?.text || 'N/A'}</TableCell>
                                    <TableCell>{delivery.suppliedItem?.quantity?.value || 'N/A'}</TableCell>
                                    <TableCell>{delivery.status || 'N/A'}</TableCell>
                                    <TableCell>{delivery.occurrenceDateTime ? new Date(delivery.occurrenceDateTime).toLocaleString() : 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );
} 