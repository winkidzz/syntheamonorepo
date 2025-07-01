import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, Button, 
    List, ListItem, ListItemText, Typography, CircularProgress, Divider 
} from '@mui/material';

const API_BASE = "http://localhost:8002";

export function SummaryHistoryViewer({ open, onClose, patientId, summaryType, title }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setLoading(true);
            axios.get(`${API_BASE}/patients/${patientId}/summary/${summaryType}/history`)
                .then(res => setHistory(res.data))
                .finally(() => setLoading(false));
        }
    }, [open, patientId, summaryType]);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>{title} - Version History</DialogTitle>
            <DialogContent dividers>
                {loading ? (
                    <CircularProgress />
                ) : (
                    <List>
                        {history.length > 0 ? history.map((item, index) => (
                            <React.Fragment key={item.version}>
                                <ListItem alignItems="flex-start">
                                    <ListItemText
                                        primary={`Version ${item.version}`}
                                        secondary={
                                            <>
                                                <Typography component="span" variant="body2" color="text.primary">
                                                    {new Date(item.created_at).toLocaleString()}
                                                </Typography>
                                                <Typography component="p" variant="body2" sx={{whiteSpace: 'pre-wrap', mt: 1}}>
                                                    {item.content}
                                                </Typography>
                                            </>
                                        }
                                    />
                                </ListItem>
                                {index < history.length - 1 && <Divider component="li" />}
                            </React.Fragment>
                        )) : (
                            <Typography>No history found.</Typography>
                        )}
                    </List>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
} 