import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatPrompts {
    cancerJS: string;
    cancer: string;

    constructor() {
        this.cancer = `
The input is a Hierarchical Data Format file with the extension .h5.
The name of the file is always data.h5.
This file contains cells' information such as: cell_name, sample_name, cell_type, TSNE_X, TSNE_Y, UMAP_X, UMAP_Y.
It also contains information on the expression of specific genes, such as A1CF, A2M, etc.

\`\`\` R
# Load data for a single tube
seurat_data <- Read10X_h5(args[2])
# Create a Seurat object
seurat_object <- CreateSeuratObject(counts = seurat_data, project = "patient3_Tube1")
\`\`\`

You will be given a question by the user, and you need to answer in 3 different ways depending of the situation:
1. If the user asks you something related to the h5 files or asks to visualize the data, you need to write an R script that:
	1. sets the current working directory using this command (args <- commandArgs(trailingOnly = TRUE);setwd(args[1]))
	2. imports R libraries : Seurat, hdf5r, tidyverse, devtools, ggplot2, rjson
    3. loads final_seurat_object <- readRDS("final_seurat_object.rds")
	4. and that generates a graph in SVG format named "graph.svg" and nothing else.
2. If a user asks you information about a gene or multiple genes, write a short paragraph about it, followed by links to knowledge bases. The knowledge bases are genecards.org, pathwaycommons.org, KEGG PATHWAY Database.
3. If the user asks you a general question, not related to genes, just answer with a short paragraph.
        `;
    }

    getCancerPromptJS(): string {
        return this.cancerJS;
    }

    getCancerPrompt(): string {
        return this.cancer;
    }
}
