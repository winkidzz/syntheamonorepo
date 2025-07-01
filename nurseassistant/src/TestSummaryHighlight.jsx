import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Box, Typography, Alert, Paper } from '@mui/material';
import { MarkdownRenderer } from './MarkdownRenderer';

export function TestSummaryHighlight({ patientId }) {
    const [currentSummary, setCurrentSummary] = useState(null);
    const [previousSummary, setPreviousSummary] = useState(null);
    const [highlightedHtml, setHighlightedHtml] = useState(null);
    const [hasHistory, setHasHistory] = useState(false);

    useEffect(() => {
        if (!patientId) return;
        // Fetch current summary
        axios.get(`/patients/${patientId}/summary`).then(res => {
            const current = res.data.current;
            setCurrentSummary(current?.content || null);
            setHighlightedHtml(current?.highlighted_html || null);
        });
        // Fetch summary history
        axios.get(`/patients/${patientId}/summary/current/history`).then(res => {
            if (res.data && res.data.length > 1) {
                setHasHistory(true);
                setPreviousSummary(res.data[1].content); // 0 is latest, 1 is previous
            } else {
                setHasHistory(false);
                setPreviousSummary(null);
            }
        });
    }, [patientId]);

    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant="h6">Current Summary (Live Highlight)</Typography>
            {highlightedHtml && hasHistory ? (
                <Paper sx={{ p: 2, mt: 1 }}>
                    <Alert severity="info" sx={{ mb: 1 }}>
                        Highlighted changes compared to previous summary
                    </Alert>
                    <div className="summary-highlight" dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
                </Paper>
            ) : (
                <Paper sx={{ p: 2, mt: 1 }}>
                    <MarkdownRenderer>{currentSummary || 'No summary available.'}</MarkdownRenderer>
                </Paper>
            )}
        </Box>
    );
} 