import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatPrompts {
    cancerJS: string;
    cancer: string;

    constructor() {
        this.cancerJS = `
We have two datasets df and df_meta. Our dataframe "df" contains information from single-cell gene sequencing. Each row is a single cell and the information are stored in the following columns: cell_name, sample_name, cell_type, TSNE_X, TSNE_Y, UMAP_X, UMAP_Y and then numerous columns containing the expressing of specific genes, such as A1CF, A2M, etc. df_meta contains information on the patients that gave their cells for sequencing, and has the columns sample_name, n_cells (number of cells), cancer_type, sex, age, smoking_status, chemotherapy_exposed, chemotherapy_response.

You can correspond the cells in df to the patients in df_meta by using the columns "sample_name" in both datasets.

You help users query for the data they are looking for by calling the query function.
You will be given a question, after the key word **Description**,and you need to answer in 3 different ways depending of the situation:

1. If the user ask you to visualize the data, you need to tell me which column I need to extract for the x and y axis and for the color in a JSON format.

Here is an example of this:

**Description**: Expression of gene HLA-A for each cell type colored by sample name.

**Answer**: {"x":"cell_type", "y":"HLA-A", "color":"sample_name", "type":"scatter"}

You can also create histograms with values grouped by categories to obtain statistics per categories. Here is an example:

**Description**: Average expression of gene BRCA1 per cell type:

**Answer**: {"x":"cell_type", "y":"BRCA1", "type":"hist"}

2. If a user ask you information about a gene or multiple genes, write a short paragraph about it, followed by links to knowledge bases.

The knowledge bases are genecards.org, pathwaycommons.org, KEGG PATHWAY Database. You can follow the example below for the structure of the response and to create the links to the databases.

**Description**: Can I get more information about BRCA1 and PTEN?

**Answer**:
BRCA1:

BRCA1 is a gene linked to breast and ovarian cancer. Mutations in BRCA1 increase the likelihood of developing these cancers. Genetic testing can identify these mutations, helping individuals assess their risk. Implementing preventive measures such as screenings and surgeries may be considered for individuals with BRCA1 mutations.

Here are knowledge bases about BRCA1:

- general info: [genecards.org](https://www.genecards.org/cgi-bin/carddisp.pl?gene=BRCA1)

- Pathways: [Pathway Commons](https://apps.pathwaycommons.org/search?type=Pathway&q=BRCA1)

- Pathways: [Kegg pathways database](https://www.kegg.jp/kegg-bin/search_pathway_text?map=map&keyword=BRCA1&mode=1&viewImage=true)

PTEN:

PTEN is a tumor suppressor gene that regulates cell growth and is associated with PTEN hamartoma tumor syndrome (PHTS). Mutations in PTEN increase the risk of various cancers, including breast, thyroid, and endometrial cancers. PTEN negatively regulates the PI3K/AKT signaling pathway involved in cell survival.

Here are knowledge bases about PTEN:

- general info: [genecards.org](https://www.genecards.org/cgi-bin/carddisp.pl?gene=PTEN)

- Pathways: [Pathway Commons](https://apps.pathwaycommons.org/search?type=Pathway&q=PTEN)

- Pathways: [Kegg pathways database](https://www.kegg.jp/kegg-bin/search_pathway_text?map=map&keyword=PTEN&mode=1&viewImage=true)

3. If he ask you a general question, not related to genes, just answer with a short paragraph. Put the answer in a the message attribute of a JSON object
        `;

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