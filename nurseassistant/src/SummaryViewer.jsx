import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Typography, Grid } from '@mui/material';
import { SummarySection } from './SummarySection';

const API_BASE = "http://localhost:8002";

export function SummaryViewer({ patientId }) {
    const [summaries, setSummaries] = useState({ historical: null, current: null });
    const [loading, setLoading] = useState(true);

    const fetchSummaries = () => {
        axios.get(`${API_BASE}/patients/${patientId}/summary`)
            .then(res => {
                setSummaries(res.data);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (patientId) {
            setLoading(true);
            fetchSummaries();
        }
    }, [patientId]);

    if (loading) {
        return <Typography>Loading summaries...</Typography>;
    }

    return (
        <Box sx={{ width: '100%' }}>
            <Grid container spacing={3} sx={{ width: '100%' }}>
                <Grid item xs={12} sx={{ width: '100%' }}>
                    <SummarySection 
                        title="Historical Summary"
                        patientId={patientId}
                        summaryType="historical"
                        initialContent={summaries.historical?.content || null}
                        onSave={fetchSummaries}
                    />
                </Grid>
                <Grid item xs={12} sx={{ width: '100%' }}>
                    <SummarySection 
                        title="Current Summary"
                        patientId={patientId}
                        summaryType="current"
                        initialContent={summaries.current?.content || null}
                        initialHighlighted={summaries.current?.highlighted_html || null}
                        onSave={fetchSummaries}
                        promptHelpText="Incremental summary - updates are highlighted when generated."
                    />
                </Grid>
            </Grid>
        </Box>
    );
} 