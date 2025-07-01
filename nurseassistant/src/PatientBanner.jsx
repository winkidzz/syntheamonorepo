import React from 'react';
import { Paper, Typography, Grid, Box } from '@mui/material';

function Detail({ label, value }) {
    return (
        <Box>
            <Typography variant="caption" color="textSecondary" sx={{textTransform: 'uppercase', fontSize: '0.65rem'}}>
                {label}
            </Typography>
            <Typography variant="body1" sx={{fontWeight: 500}}>
                {value}
            </Typography>
        </Box>
    );
}

export function PatientBanner({ patient }) {
    if (!patient?.data) return null;

    const patientResource = patient.data.entry?.find(e => e.resource?.resourceType === "Patient")?.resource;
    if (!patientResource) return null;

    const name = patientResource.name?.[0]?.text || `${patientResource.name?.[0]?.given?.join(' ')} ${patientResource.name?.[0]?.family}` || "Unknown Patient";
    const gender = patientResource.gender || "-";
    const birthDate = patientResource.birthDate || "-";
    let age = "-";
    if (birthDate !== "-") {
        try {
            age = new Date().getFullYear() - parseInt(birthDate.split("-")[0], 10);
        } catch {}
    }

    return (
        <Paper elevation={2} sx={{ p: 2, mb: 3, borderTop: 3, borderColor: 'primary.main' }}>
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                    <Detail label="Patient" value={name} />
                </Grid>
                <Grid item xs={4} sm={3} md={2}>
                    <Detail label="Age" value={age} />
                </Grid>
                <Grid item xs={4} sm={3} md={2}>
                    <Detail label="Gender" value={gender} />
                </Grid>
                <Grid item xs={4} sm={3} md={2}>
                    <Detail label="DOB" value={birthDate} />
                </Grid>
                 <Grid item xs={12} sm={3} md={2}>
                     <Detail label="Synthea ID" value={patient.synthea_id?.substring(0,8) + '...'} />
                </Grid>
            </Grid>
        </Paper>
    );
} 