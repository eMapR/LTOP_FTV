#### Methods for change detection from optimized LandTrendr (LT) outputs
The following descriptions are for three methods for calculating or identifying pixels that experienced some kind of change over the course of the image time series. It is important to note that the methods described here are aimed at change detection not change attribution. That is to say that they highlight pixels that experienced some kind of change based on different rules or trend-based criteria (described below) but they do not identify pixels that moved from forest to pasture. Additional methods employing land use/land cover classifications and similar approaches are suggested for doing these kinds of change attribution studies. 

The following methods are included in this description: 

1. Standard identification of singular events based on existing LT modules and LTOP outputs 
2. Vertex-based information for temporal understanding of change 
3. Annual canopy cover mapping and delta tracking 

#### Identifying change based on existing LT modules 

Existing code has been used to identify different types of change based on LT temporal segmentation, but focuses on single event identification (i.e., greatlest, least disturbance) for more information see the [existing description](https://emapr.github.io/LT-GEE/api.html#getchangemap) on using this code. The general output of the LTOP workflow does not lend itself to applying this code directly so we reformat those outputs to emulate the structure of the general LT outputs. 

	1. Dependencies: https://github.com/eMapR/SERVIR_stabilization/blob/main/scripts/GEE_scripts/FTV_post_processing_modules.js

	2. Script location: https://github.com/eMapR/LTOP_FTV/blob/master/scripts/change_detection_from_LTOP/change_detection_from_LTOP.js

	3. Copy and paste script text into GEE JavaScript API 

	4. This script requires some of the outputs of the LTOP workflow. There is additional description of these inputs in the script header. 
		a. the kmeans cluster_image which is one of the outputs of the 02 step
		b. the final output of the LTOP workflow (output of 05 step)
		c. The csv that is is used as input to the 05 step with selected versions of LT 

	5. Decide if you want to visualize and/or export. Note that unless you are running quite a small area you likely want to export something. 

	6. Run script 

	7. Run tasks 


#### Vertex-based change

This approach to change detection leverages the information inherent in the LT segmentation process. It leverages the identification of 'breakpoint' or vertex years by the LT algorithm and then expands on that to attribute all years in the time series with some information about the relationship between a given year and temporally adjacent vertices. 

	1. Dependencies: https://github.com/eMapR/SERVIR_stabilization/blob/main/scripts/GEE_scripts/FTV_post_processing_modules.js

	2. Script location: https://github.com/eMapR/LTOP_FTV/blob/master/scripts/change_detection_from_LTOP/vertex_based_change_detection.js

	3. Copy and paste script text into GEE JavaScript API 

	4. This script requires some of the outputs of the LTOP workflow. There is additional description of these inputs in the script header. 
		a. the kmeans cluster_image which is one of the outputs of the 02 step
		b. the final output of the LTOP workflow (output of 05 step)
		c. The csv that is is used as input to the 05 step with selected versions of LT 

	5. Decide if you want to visualize and/or export. Note that unless you are running quite a small area you likely want to export something. 

	6. Run script 

	7. Run tasks  

#### Annual canopy cover mapping  

This process relies on a target understanding of canopy cover from an existing data product (in this case GFCC or Hansen). In its current configuration it is a bivariate relationship with a single predictor variable (NBR or NDVI) and the target layer. The modeling is done with reduced major axis (RMA) regression (Cohen et al., 20XX). The output of this process is a time series of canopy cover information with maps characterizing canopy cover every year on a 0-100 scale. 

	1. Script location: https://github.com/eMapR/LTOP_FTV/blob/master/scripts/change_detection_from_LTOP/rma_based_canopy_cover.js

	2. This script has a few user defined inputs, a description of those inputs is included in the script header. 

	3. Decide if you want to visualize and/or export. The script is default set up to calculate some summary statistics for community forests in Cambodia. This portion of the script can be removed or altered to include stats for some of ther vector boundary. If you do not alter anything it will attempt to print two charts to the console showing the distribution of training data characteristics and the time series of canopy cover change for the yearly canopy cover data. It will also export the time series of canopy cover data to a user-defined directory. Note that if you are trying to summarize stats for an area that is too big you will hit a memory error. 

	4. Run script

	5. Run task(s)



