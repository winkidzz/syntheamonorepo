import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Typography, TextField, Button, CircularProgress, Paper, Tooltip, Switch, FormControlLabel, Alert } from '@mui/material';
import { SummaryHistoryViewer } from './SummaryHistoryViewer';
import './SummaryHighlight.css';

const API_BASE = "http://localhost:8002";

export function SummarySection({ title, patientId, summaryType, initialContent, initialHighlighted, onSave, promptHelpText, previousSavedContent }) {
    const [content, setContent] = useState('');
    const [originalContent, setOriginalContent] = useState('');
    const [highlightedHtml, setHighlightedHtml] = useState('');
    const [showHighlighted, setShowHighlighted] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [latestGenerated, setLatestGenerated] = useState(null);
    const [latestHighlighted, setLatestHighlighted] = useState(null);
    const [hasPrevious, setHasPrevious] = useState(false);

    useEffect(() => {
        setContent(initialContent || '');
        setOriginalContent(initialContent || '');
        setHighlightedHtml(initialHighlighted || '');
        setShowHighlighted(false);
        setIsEditing(false);
    }, [initialContent, initialHighlighted]);

    useEffect(() => {
        if (summaryType === 'current' && patientId) {
            axios.post(`/patients/${patientId}/summarize`, { summary_type: 'current' })
                .then(res => {
                    setLatestGenerated(res.data.summary);
                    setLatestHighlighted(res.data.highlighted_html);
                    setHasPrevious(res.data.has_previous);
                });
        }
    }, [patientId, summaryType]);

    useEffect(() => {
        if (summaryType === 'current' && latestGenerated) {
            setContent(latestGenerated);
            setIsEditing(true);
        }
    }, [latestGenerated]);

    const handleGenerate = () => {
        setIsGenerating(true);
        axios.post(`${API_BASE}/patients/${patientId}/summarize`, { type: summaryType })
            .then(res => {
                setContent(res.data.summary);
                if (res.data.highlighted_html) {
                    setHighlightedHtml(res.data.highlighted_html);
                    setShowHighlighted(true);
                }
                setIsEditing(true);
            })
            .finally(() => setIsGenerating(false));
    };

    const handleSave = () => {
        setIsSaving(true);
        const saveData = {
            type: summaryType,
            content,
            highlighted_html: highlightedHtml
        };
        axios.post(`${API_BASE}/patients/${patientId}/summary`, saveData)
            .then(() => {
                if (onSave) onSave(); // Refresh summaries
                setIsEditing(false);
                setShowHighlighted(false);
            })
            .finally(() => setIsSaving(false));
    };
    
    const handleCancel = () => {
        setContent(originalContent);
        setIsEditing(false);
    };

    const displayContent = summaryType === 'current' && latestGenerated ? latestGenerated : initialContent;
    const displayHighlighted = summaryType === 'current' && latestHighlighted ? latestHighlighted : initialHighlighted;
    const showHighlight = summaryType === 'current' && hasPrevious && latestHighlighted;

    return (
        <Paper elevation={2} sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">{title}</Typography>
                {promptHelpText && (
                    <Typography variant="body2" color="textSecondary">{promptHelpText}</Typography>
                )}
                {summaryType === 'current' && highlightedHtml && (
                    <FormControlLabel
                        control={
                            <Switch
                                checked={showHighlighted}
                                onChange={(e) => setShowHighlighted(e.target.checked)}
                                size="small"
                            />
                        }
                        label="Show Changes"
                        sx={{ ml: 2 }}
                    />
                )}
            </Box>
            
            {showHighlight ? (
                <Box sx={{ mb: 2 }}>
                    <Alert severity="info" sx={{ mb: 1 }}>
                        Highlighted changes show new content added in the latest update.
                    </Alert>
                    <Paper 
                        variant="outlined" 
                        sx={{ 
                            p: 2, 
                            minHeight: '200px',
                            '& .highlight-new': {
                                backgroundColor: '#fff3cd',
                                padding: '0 4px',
                                borderRadius: '3px',
                                border: '1px solid #ffeaa7'
                            }
                        }}
                    >
                        <div dangerouslySetInnerHTML={{ __html: displayHighlighted }} />
                    </Paper>
                </Box>
            ) : isEditing ? (
                <TextField
                    multiline
                    fullWidth
                    rows={8}
                    variant="outlined"
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    sx={{ mb: 2 }}
                />
            ) : (
                <Box sx={{ mb: 2 }}>
                    <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>{displayContent}</Typography>
                </Box>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Tooltip title={promptHelpText || "Summarizes the entire patient record."}>
                        <Button
                            variant="contained"
                            onClick={handleGenerate}
                            disabled={isGenerating || isSaving}
                            sx={{ mr: 1 }}
                        >
                            {isGenerating ? <CircularProgress size={24} /> : 'Generate'}
                        </Button>
                    </Tooltip>
                    <Button
                        variant="outlined"
                        onClick={() => setHistoryOpen(true)}
                        disabled={isGenerating || isSaving}
                    >
                        View History
                    </Button>
                </Box>
                {isEditing && (
                    <Box>
                        <Button onClick={handleCancel} disabled={isSaving} sx={{ mr: 1 }}>Cancel</Button>
                        <Button variant="contained" color="primary" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <CircularProgress size={24} /> : 'Save'}
                        </Button>
                    </Box>
                )}
            </Box>
            <SummaryHistoryViewer 
                open={historyOpen}
                onClose={() => setHistoryOpen(false)}
                patientId={patientId}
                summaryType={summaryType}
                title={title}
            />
        </Paper>
    );
} 