import { ResponseData } from "../types";
import { join } from "path";
import * as fs from 'fs';

export interface ScanpyData {
    script: string,
    response_data: ResponseData
}

export function choseScript(scanpy_answer: string, response_data: ResponseData): ScanpyData {
    const response : ScanpyData = {
        script: '',
        response_data: response_data
    }

    const follow_upsMap: { [key: string]: string[] } = {
        'parithera_umap': [
            'How can I visualize gene expression data on the UMAP?',
            'Can you perform clustering on the data and visualize it?',
            'How do I save the UMAP coordinates to a file?',
            'How can I change the colormap used in the UMAP plot?',
            'Can you generate a UMAP plot with different sizes for the points?'
        ],
        'parithera_tsne': [
            "How do I adjust the perplexity parameter for t-SNE?",
            "Can you compare the t-SNE with UMAP visually?",
            "How can I visualize specific clusters on the t-SNE plot?",
            "What are the differences between t-SNE and UMAP?",
            "How can I export the t-SNE coordinates for further analysis?",
        ],
        'parithera_cluster': [
            'How can I visualize the clusters?',
            'Can you show me a heatmap of marker genes for each cluster?',
            'How do I find specific cell types within the clusters?',
            'Can you provide a bar plot of cluster sizes?',
            'How can I perform differential expression analysis between clusters?'
        ],
        'parithera_leiden': [
            'How can I visualize the Leiden clusters?',
            'What are the key differences between Louvain and Leiden clustering?',
            'How do I interpret the resolution parameter in Leiden clustering?',
            'Can you generate a dot plot of marker genes for each cluster?',
            'How can I validate the stability of the identified clusters?'
        ],
        'parithera_marker_genes': [
            'What are the top marker genes for each cluster?',
            'How can I visualize these marker genes using violin plots?',
            'Can you provide a table of log fold changes for marker genes?',
            'How do I perform gene ontology enrichment analysis on marker genes?',
            'Can you help me with pathway analysis of identified marker genes?'
        ]
    };

    if (scanpy_answer.includes('parithera_umap')) {
        response.script = 'parithera_umap';
    } else if (scanpy_answer.includes('parithera_tsne')) {
        response.script = 'parithera_tsne';
    } else if (scanpy_answer.includes('parithera_cluster')) {
        response.script = 'parithera_cluster';
    } else if (scanpy_answer.includes('parithera_leiden')) {
        response.script = 'parithera_leiden';
    } else if (scanpy_answer.includes('parithera_marker_genes')) {
        response.script = 'parithera_marker_genes';
    } else {
        throw new Error('Error during LLM script decision');
    }

    response.response_data.followup.push(...follow_upsMap[response.script]);
    const scriptPath = join('/scripts', `${response.script}.py`);
    const scriptContent = fs.readFileSync(scriptPath, 'utf-8');

    response.response_data.code = scriptContent;
    response.response_data.status = 'code_ready';
    return response;
}