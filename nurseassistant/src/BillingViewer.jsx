import React from 'react';
import { Card, CardContent, Typography, Table, TableContainer, TableHead, TableBody, TableCell, TableRow, Paper } from '@mui/material';

export function BillingViewer({ resources, title }) {
    if (!resources || resources.length === 0) {
        return <Typography>No {title.toLowerCase()} data available.</Typography>;
    }

    const isEOB = title === "Explanation of Benefits";

    const getProvider = (item) => {
        if (isEOB) {
            return item.provider?.identifier?.value || item.provider?.reference || 'N/A';
        }
        return item.provider?.display || 'N/A';
    }

    const getTotal = (item) => {
        if (isEOB) {
            const totalItem = item.total?.find(t => t.category?.coding?.[0]?.code === 'submitted');
            return totalItem?.amount?.value ? `${totalItem.amount.value.toFixed(2)} ${totalItem.amount.currency}` : 'N/A';
        }
        return item.total?.value ? `${item.total.value} ${item.total.currency}` : 'N/A';
    }

    return (
        <Card>
            <CardContent>
                <Typography variant="h5" component="div" gutterBottom>
                    {title}
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: '75vh' }}>
                    <Table stickyHeader sx={{ minWidth: 650 }} aria-label="billing table">
                        <TableHead>
                            <TableRow>
                                <TableCell>Type</TableCell>
                                <TableCell>Provider</TableCell>
                                <TableCell>Total Submitted</TableCell>
                                <TableCell>Created Date</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {resources.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.type?.text || item.type?.coding?.[0]?.display || 'N/A'}</TableCell>
                                    <TableCell>{getProvider(item)}</TableCell>
                                    <TableCell>{getTotal(item)}</TableCell>
                                    <TableCell>{item.created ? new Date(item.created).toLocaleDateString() : 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );
} 