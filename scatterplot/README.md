# Visualizer Demo - Scatterplot Subfolder

## For Installation and Executing Files Locally 
Follow Commands in README.md in the main folder. Change subfolder from v1 to scatterplot. 


## New Features Added December 2024
- Added whitespace data which can be found in output-whitespace.json, original data without whitespace generated content can be found in output.json
- Added functionality to show/hide Voronoi diagram and lines between points and centroids
    - should be static visual, so if you change the filter the clusters and voronoi will not change 
    - all clusters are based on the whole dataset 
- Added centroids and ability to select number of clusters seen on the scatterplot
- Added functionality to filter by data source


## Future Enhancements 
- Add ability to create clusters based on filtered data
- Further explore how to do more static dimensionality reduction for a dynamic dataset
    - potenitally using TriMap or UMAP
    - how can we make the graph layout as stable as possible?
- Add generated cluster names to scatterplot
- Experiment with more hierarchical clustering techniques, like Hierarchical Dirichlet process, for more stable clustering for the dataset as it changes
- updated with more comprehensive dataset for more robust experimentation on how to handle the dynamic dataset
- Build a test dataset with a subset of the data to look for stability in clusters and better understand the changes in clustering
