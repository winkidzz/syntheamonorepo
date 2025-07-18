import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Typography, TextField, Button, CircularProgress, Paper, Tooltip, Switch, FormControlLabel, Alert, Grid, Tabs, Tab, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { SummaryHistoryViewer } from './SummaryHistoryViewer';
import { MarkdownRenderer } from './MarkdownRenderer';
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
    const [editViewMode, setEditViewMode] = useState(0); // 0: Edit, 1: Preview, 2: Split

    // --- LLM Model Selection ---
    const [availableModels, setAvailableModels] = useState({});
    const [selectedModel, setSelectedModel] = useState('gemma3:27b');
    const [isLoadingModels, setIsLoadingModels] = useState(false);

    // --- TIFF Fax Upload Section ---
    const [faxFile, setFaxFile] = useState(null);
    const [faxUploadLoading, setFaxUploadLoading] = useState(false);
    const [faxUploadError, setFaxUploadError] = useState("");
    const [faxParsedDetails, setFaxParsedDetails] = useState("");

    // Load available models on component mount
    useEffect(() => {
        const loadModels = async () => {
            setIsLoadingModels(true);
            try {
                const response = await axios.get(`${API_BASE}/models`);
                setAvailableModels(response.data.models);
                setSelectedModel(response.data.default_model);
            } catch (error) {
                console.error('Failed to load models:', error);
                // Fallback to default models
                setAvailableModels({
                    'gemma3:27b': { name: 'Gemma 3 27B', type: 'ollama', description: 'Google\'s Gemma 3 27B model via Ollama' },
                    'llava:latest': { name: 'LLaVA Latest', type: 'ollama', description: 'LLaVA vision model via Ollama' },
                    'mistral:latest': { name: 'Mistral Latest', type: 'ollama', description: 'Mistral AI model via Ollama' },
                    'llama3:8b': { name: 'Llama 3 8B', type: 'ollama', description: 'Meta\'s Llama 3 8B model via Ollama' },
                    'gemini-pro': { name: 'Gemini Pro', type: 'google', description: 'Google\'s Gemini Pro model via API' }
                });
            } finally {
                setIsLoadingModels(false);
            }
        };
        loadModels();
    }, []);

    const handleFaxFileChange = (e) => {
        setFaxFile(e.target.files[0]);
        setFaxUploadError("");
        setFaxParsedDetails("");
    };

    const handleFaxUpload = async () => {
        if (!faxFile) {
            setFaxUploadError("Please select a TIFF file to upload.");
            return;
        }
        setFaxUploadLoading(true);
        setFaxUploadError("");
        setFaxParsedDetails("");
        const formData = new FormData();
        formData.append("file", faxFile);
        try {
            const res = await axios.post(`${API_BASE}/upload-fax/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 120000 // 2 min for large faxes
            });
            setFaxParsedDetails(res.data.details || "No details returned.");
        } catch (err) {
            setFaxUploadError(err.response?.data?.detail || err.message || "Upload failed.");
        } finally {
            setFaxUploadLoading(false);
        }
    };

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
        axios.post(`${API_BASE}/patients/${patientId}/summarize`, { 
            summary_type: summaryType, 
            model: selectedModel 
        })
            .then(res => {
                setContent(res.data.summary);
                if (res.data.highlighted_html) {
                    setHighlightedHtml(res.data.highlighted_html);
                    setShowHighlighted(true);
                }
                setIsEditing(true);
                setEditViewMode(1); // Show preview first after generation
            })
            .finally(() => setIsGenerating(false));
    };

    const handleEdit = () => {
        // Store current content as original before making changes
        const currentContent = content || displayContent || '';
        setOriginalContent(currentContent);
        
        // For current summary, start with the latest generated content or existing content
        if (summaryType === 'current') {
            if (latestGenerated) {
                setContent(latestGenerated);
            } else if (initialContent) {
                setContent(initialContent);
            } else {
                setContent(''); // Start with empty content for new current summary
            }
        } else {
            // For historical summary, start with existing content
            setContent(initialContent || '');
        }
        
        setIsEditing(true);
        setEditViewMode(0); // Start in edit mode
        setShowHighlighted(false); // Hide highlights when editing
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

    const renderEditingView = () => {
        return (
            <Box sx={{ mb: 2 }}>
                <Box sx={{ mb: 1 }}>
                    <Tabs value={editViewMode} onChange={(e, newValue) => setEditViewMode(newValue)}>
                        <Tab label="Edit" />
                        <Tab label="Preview" />
                        <Tab label="Split View" />
                    </Tabs>
                </Box>
                
                {editViewMode === 0 && (
                    // Edit Mode - Use full width and increased height
                    <TextField
                        multiline
                        fullWidth
                        variant="outlined"
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder="Enter markdown content here..."
                        helperText="You can use markdown formatting (headers, lists, tables, etc.)"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                minHeight: '600px',
                                alignItems: 'flex-start'
                            },
                            '& .MuiOutlinedInput-input': {
                                height: '100% !important',
                                overflow: 'auto !important'
                            }
                        }}
                    />
                )}
                
                {editViewMode === 1 && (
                    // Preview Mode - Use full width and increased height
                    <Paper 
                        variant="outlined" 
                        sx={{ 
                            p: 3, 
                            minHeight: '600px',
                            maxHeight: '80vh',
                            overflow: 'auto',
                            backgroundColor: '#fafafa',
                            width: '100%'
                        }}
                    >
                        <Typography variant="caption" color="textSecondary" sx={{ mb: 2, display: 'block' }}>
                            Markdown Preview:
                        </Typography>
                        <MarkdownRenderer>{content || 'Enter content in Edit mode to see preview...'}</MarkdownRenderer>
                    </Paper>
                )}
                
                {editViewMode === 2 && (
                    // Split View - Use full width with proper 50/50 proportions
                    <Box sx={{ width: '100%' }}>
                        <Grid container spacing={2} sx={{ width: '100%', height: '600px' }}>
                            <Grid item xs={12} md={6} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
                                    Edit:
                                </Typography>
                                <TextField
                                    multiline
                                    fullWidth
                                    variant="outlined"
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    placeholder="Enter markdown content here..."
                                    sx={{
                                        flex: 1,
                                        '& .MuiOutlinedInput-root': {
                                            height: '100%',
                                            alignItems: 'flex-start'
                                        },
                                        '& .MuiOutlinedInput-input': {
                                            height: '100% !important',
                                            overflow: 'auto !important'
                                        }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} md={6} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
                                    Preview:
                                </Typography>
                                <Paper 
                                    variant="outlined" 
                                    sx={{ 
                                        flex: 1,
                                        p: 2, 
                                        overflow: 'auto',
                                        backgroundColor: '#fafafa',
                                        height: '100%'
                                    }}
                                >
                                    <MarkdownRenderer>{content || 'Enter content to see preview...'}</MarkdownRenderer>
                                </Paper>
                            </Grid>
                        </Grid>
                    </Box>
                )}
            </Box>
        );
    };

    return (
        <Paper elevation={2} sx={{ p: 3, width: '100%', maxWidth: 'none' }}>
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
                renderEditingView()
            ) : (
                <Box sx={{ mb: 2 }}>
                    <MarkdownRenderer>{displayContent}</MarkdownRenderer>
                </Box>
            )}
            {/* --- TIFF Fax Upload Section --- */}
            <Box sx={{ mt: 6, p: 2, borderTop: '1px solid #eee' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Upload Provider Fax (TIFF)</Typography>
                <input
                    type="file"
                    accept=".tif,.tiff"
                    onChange={handleFaxFileChange}
                    style={{ marginBottom: 12 }}
                />
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleFaxUpload}
                    disabled={faxUploadLoading || !faxFile}
                    sx={{ ml: 2 }}
                >
                    {faxUploadLoading ? <CircularProgress size={22} /> : "Upload & Parse"}
                </Button>
                {faxUploadError && <Alert severity="error" sx={{ mt: 2 }}>{faxUploadError}</Alert>}
                {faxParsedDetails && (
                    <Paper variant="outlined" sx={{ mt: 3, p: 2, background: '#f9f9f9' }}>
                        <Typography variant="subtitle1" sx={{ mb: 1 }}>Parsed Fax Details:</Typography>
                        <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>{faxParsedDetails}</Typography>
                    </Paper>
                )}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel id="model-select-label">LLM Model</InputLabel>
                        <Select
                            labelId="model-select-label"
                            value={selectedModel}
                            label="LLM Model"
                            onChange={(e) => setSelectedModel(e.target.value)}
                            disabled={isGenerating || isSaving || isLoadingModels}
                        >
                            {Object.entries(availableModels).map(([modelId, modelInfo]) => (
                                <MenuItem key={modelId} value={modelId}>
                                    <Box>
                                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                            {modelInfo.name}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {modelInfo.type === 'google' ? 'Google API' : 'Ollama'} • {modelInfo.description}
                                        </Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    
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
                    {!isEditing && (displayContent || summaryType === 'current') && (
                        <Button
                            variant="outlined"
                            onClick={handleEdit}
                            disabled={isGenerating || isSaving}
                        >
                            Edit
                        </Button>
                    )}
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