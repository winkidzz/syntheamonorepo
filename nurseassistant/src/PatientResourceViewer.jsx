import React from 'react';
import { Card, CardContent, Typography, Table, TableBody, TableCell, TableRow } from '@mui/material';

function DetailItem({ title, children }) {
    return (
        <TableRow>
            <TableCell component="th" scope="row" sx={{ fontWeight: 'bold', width: '30%', borderBottom: 'none' }}>
                {title}
            </TableCell>
            <TableCell sx={{ borderBottom: 'none' }}>{children || '-'}</TableCell>
        </TableRow>
    );
}

export function PatientResourceViewer({ resource }) {
    if (!resource) {
        return <Typography>No patient data available.</Typography>;
    }

    const name = resource.name?.[0];
    const address = resource.address?.[0];
    const telecom = resource.telecom || [];
    const communication = resource.communication?.[0]?.language?.text;

    return (
        <Card>
            <CardContent>
                <Typography variant="h5" component="div" gutterBottom sx={{ borderBottom: 1, borderColor: 'divider', pb: 1, mb: 2 }}>
                    Patient Demographics
                </Typography>
                <Table size="small">
                    <TableBody>
                        <DetailItem title="Name">{name?.text || `${name?.given?.join(' ')} ${name?.family}`}</DetailItem>
                        <DetailItem title="Gender">{resource.gender}</DetailItem>
                        <DetailItem title="Birth Date">{resource.birthDate}</DetailItem>
                        <DetailItem title="Marital Status">{resource.maritalStatus?.text || resource.maritalStatus?.coding?.[0]?.display}</DetailItem>
                        <DetailItem title="Address">{address ? `${address.line?.join(', ')}, ${address.city}, ${address.state} ${address.postalCode}, ${address.country}` : '-'}</DetailItem>
                        <DetailItem title="Phone">{telecom.find(t => t.system === 'phone')?.value}</DetailItem>
                        <DetailItem title="Email">{telecom.find(t => t.system === 'email')?.value}</DetailItem>
                        <DetailItem title="Preferred Language">{communication}</DetailItem>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
} 