import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { Box } from '@mui/material';

// Import highlight.js CSS for syntax highlighting
import 'highlight.js/styles/github.css';

/**
 * Modern Markdown Renderer Component
 * 
 * Features:
 * - GitHub Flavored Markdown (tables, task lists, strikethrough, etc.)
 * - Syntax highlighting for code blocks
 * - Raw HTML support for enhanced formatting
 * - Clinical documentation friendly styling
 * - Responsive design with proper spacing
 */
export function MarkdownRenderer({ children, sx = {}, ...props }) {
    return (
        <Box 
            sx={{
                '& h1': {
                    fontSize: '1.5rem',
                    fontWeight: 600,
                    marginBottom: '0.75rem',
                    marginTop: '1rem',
                    color: 'text.primary',
                    borderBottom: '2px solid #e0e0e0',
                    paddingBottom: '0.25rem'
                },
                '& h2': {
                    fontSize: '1.3rem',
                    fontWeight: 600,
                    marginBottom: '0.5rem',
                    marginTop: '1rem',
                    color: 'text.primary'
                },
                '& h3': {
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    marginBottom: '0.5rem',
                    marginTop: '0.75rem',
                    color: 'text.primary'
                },
                '& h4, & h5, & h6': {
                    fontSize: '1rem',
                    fontWeight: 600,
                    marginBottom: '0.25rem',
                    marginTop: '0.5rem',
                    color: 'text.primary'
                },
                '& p': {
                    marginBottom: '0.75rem',
                    lineHeight: 1.6,
                    color: 'text.primary'
                },
                '& ul, & ol': {
                    marginBottom: '0.75rem',
                    paddingLeft: '1.5rem'
                },
                '& li': {
                    marginBottom: '0.25rem',
                    lineHeight: 1.5
                },
                '& blockquote': {
                    borderLeft: '4px solid #2196f3',
                    paddingLeft: '1rem',
                    margin: '1rem 0',
                    fontStyle: 'italic',
                    backgroundColor: '#f5f5f5',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px'
                },
                '& code': {
                    backgroundColor: '#f5f5f5',
                    padding: '0.125rem 0.25rem',
                    borderRadius: '3px',
                    fontSize: '0.9em',
                    fontFamily: 'Monaco, Consolas, "Roboto Mono", monospace'
                },
                '& pre': {
                    backgroundColor: '#f8f9fa',
                    padding: '1rem',
                    borderRadius: '6px',
                    overflow: 'auto',
                    marginBottom: '1rem',
                    border: '1px solid #e1e4e8'
                },
                '& pre code': {
                    backgroundColor: 'transparent',
                    padding: 0,
                    fontSize: '0.85em'
                },
                '& table': {
                    width: '100%',
                    borderCollapse: 'collapse',
                    marginBottom: '1rem',
                    border: '1px solid #e1e4e8'
                },
                '& th, & td': {
                    padding: '0.5rem',
                    textAlign: 'left',
                    borderBottom: '1px solid #e1e4e8',
                    border: '1px solid #e1e4e8'
                },
                '& th': {
                    backgroundColor: '#f6f8fa',
                    fontWeight: 600
                },
                '& tr:nth-of-type(even)': {
                    backgroundColor: '#f9f9f9'
                },
                '& hr': {
                    border: 'none',
                    borderTop: '2px solid #e1e4e8',
                    margin: '1.5rem 0'
                },
                '& a': {
                    color: '#2196f3',
                    textDecoration: 'none',
                    '&:hover': {
                        textDecoration: 'underline'
                    }
                },
                '& strong, & b': {
                    fontWeight: 600
                },
                '& em, & i': {
                    fontStyle: 'italic'
                },
                '& del': {
                    textDecoration: 'line-through',
                    color: 'text.secondary'
                },
                // Task list styling
                '& input[type="checkbox"]': {
                    marginRight: '0.5rem'
                },
                // Clinical note styling enhancements
                '& .clinical-section': {
                    backgroundColor: '#fff3e0',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    marginBottom: '1rem',
                    border: '1px solid #ffcc02'
                },
                '& .medication': {
                    backgroundColor: '#e8f5e8',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontWeight: 500
                },
                '& .diagnosis': {
                    backgroundColor: '#ffe6e6',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontWeight: 500
                },
                '& .vital-signs': {
                    backgroundColor: '#e6f3ff',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontWeight: 500
                },
                ...sx
            }}
            {...props}
        >
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight, rehypeRaw]}
                components={{
                    // Custom renderers for specific elements if needed
                    img: ({ node, ...props }) => (
                        <img 
                            {...props} 
                            style={{ 
                                maxWidth: '100%', 
                                height: 'auto',
                                borderRadius: '6px',
                                marginBottom: '1rem'
                            }} 
                        />
                    ),
                }}
            >
                {children}
            </ReactMarkdown>
        </Box>
    );
} 