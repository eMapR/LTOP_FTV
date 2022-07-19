### LTOP Overview

LandTrendr (LT) is a set of spectral-temporal segmentation algorithms that focuses on removing the natural spectral variations in a time series of Landsat Images. Stabilizing the natural variation in a time series emphasizes how a landscape evolves with time. This is useful in many areas as it gives information on the state of a landscape. This includes many different natural and anthropogenic processes including: growing seasons, phenology, stable landscapes, senesence, clearcut etc. LandTrendr is mostly used in Google Earth Engine (GEE), an online image processing console, where it is readily available for use.  

One impediment to running LT over large geographic domains is selecting the best paramater set for a given landscape. The LandTrendr GEE function uses 9 arguments: 8 parameters that control how spectral-temporal segmentation is executed, and an annual image collection on which to assess and remove the natural variations. The original LandTrendr article (Kennedy et al., 2010) illustrates some of the effects and sensitivity of changing some of these values. The default parameters for the LandTrendr GEE algorithm do a satisfactory job in many circumstances, but extensive testing and time is needed to hone the parameter selection to get the best segmentation out of the LandTrendr algorithm for a given region. Thus, augmenting the LandTrendr parameter selection process would save time and standardize a method to choose parameters, but we also aim to take this augmentation a step further. 

Traditionally, LT has been run over an image collection with a single LT parameter configuration and is able to remove natural variation for every pixel time series in an image. But no individual LandTrendr parameter configuration is best for all surface conditions. For example, one paramater set might be best for forest cover change while another might be preferred for agricultural phenology or reservoir flooding. To address this shortcoming, we developed a method that delineates patches of spectrally similar pixels from input imagery and then finds the best LandTrendr parameters group. We then run LandTrendr on each patch group location with a number of different paramater sets and assign scores to decide on the best parameter configuration. This process is referred to as LandTrendr Optimization (LTOP). 

#### Document outline and workflow overview
This document outlines the overall workflow for running a version of LTOP that is (mostly) based on five GEE scripts. There are two distinct steps that are currently implemented in Python and run locally. This may be changed in future versions depending on needs and expertise. Each step is associated with a script or pair of scripts that produce some kind of output that is generally the input to at least the succeeding step and in some cases, later steps as well. The workflow assumes some understanding of running scripts in GEE, generating jobs and exporting assets or files to gDrive. The approach also assumes some understanding of Python and how to at least run a Python script in an IDE or from the command line. We start by outlining some of the background for the process, some information on the general overview of the workflow and how this could be set up for somebody to actually run. We then go through the steps to produce LTOP output, how the outputs can be assessed and then some of the pitfalls one might run into while carrying out this workflow. Note that to produce temporally stabilized outputs of an existing time series see the SERVIR_stabilization [GitHub repository](https://github.com/eMapR/SERVIR_stabilization). 


[General overview of theory and background](https://docs.google.com/presentation/d/1ra8y7F6_vyresNPbT3kYamVPyxWSfzAm7hCMc6w8N-M/edit?usp=sharing)

Workflow conceptual diagram: 
![img](https://docs.google.com/drawings/d/e/2PACX-1vQ9Jmb4AhD86GedXTH798O4hGCNDyCp-ZMcYEB1Ij8fuhNqc4xhDuO3x9JSttq6Tk2g9agWP2FWhoU-/pub?w=960&h=720)

Overview of script platform distribution (GEE vs Python): 
![img](https://docs.google.com/drawings/d/e/2PACX-1vTVthwPV6yUcagGQcBUSWr443lJuaeCg8r03QlmrvHOwbrp3J08lKh0zDRMORpmts3qrtkpOevzB1lm/pub?w=960&h=720)

#### Background setup for running LTOP workflow 

1. We suggest that you create a dedicated directory on a local drive to hold scripts and intermediate outputs of the LTOP workflow. This can be created by [cloning](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository) our [GitHub repo](https://github.com/eMapR/LTOP_FTV/tree/master/scripts). 

2. You can then create basic container directories for intermediate outputs (e.g., rasters, vectors, csvs). In the docs below, we refer to /path/to/directory when specifying outputs. It is up to the user to specify where those things are going based on the file/directory structures set up on your instance. 

3. We would suggest that you create a dedicated folder in your GEE home directory to hold associated scripts and a dedicated folder in your assets to hold intermediate assets during this process. You can specify where you want this to be in the scripts by changing asset root and child arguments. 

3. The general setup for this implementation of LTOP relies on five major steps laid out in short, simple scripts. Each of these scripts call functions in the [modules library](https://github.com/eMapR/LTOP_FTV/blob/master/scripts/GEEjs/LTOP_in_GEE/LTOP_modules.js) to do the work. Ideally, the user does not need to look at the modules script if they don't want to. 

4. Most of the heavy lifting is done in GEE but a few intermediate steps are conducted in Python. It is suggested that you [create a dedicated conda environment](https://docs.conda.io/projects/conda/en/latest/user-guide/tasks/manage-environments.html#creating-an-environment-with-commands) for these steps. It should not be an issue but note that it must be a 3.x env for the LTOP scripts to work. 

5. Note that the script locations given below are based on script locations and directory structure on GitHub. When you clone the repo to a local directory you will need to update these paths wherever they are required (mostly the python-based steps towards the end of the workflow). 

6. Unfortunately, until GEE changes their GitHub structure, we suggest that you copy and paste the GEE code from your local directory after cloning into a GEE JavaScript window. There are other ways of doing that but this is fairly straightforward. 

#### LTOP Work Flow (Step by Step) 

### 1 Run 01_run_SNIC in GEE to generate SNIC images (GEE)

Ultimately, the optimization requires that LT be run hundreds of times to evaluate which set of parameters is best. This is not tractable for every pixel.  Further, it is not necessary:  a given set of parameters will work for pixels that have similar conditions in terms of cover and change processes.  Therefore, our first step is to find groups of pixels that have those similarities, and use them for all further steps. 

Thus, the first step is to organize our study area into patches.  We use GEE's SNIC processing on an image that is meant to capture the spectral and temporal variability of the study area.  For SNIC to work, we need to build a single image that is a stack of single-date spectral images from several different years across the study period.  By incorporating images from across different years, we capture broad changes in land cover. 

For more information on the background, potential pitfalls etc. see the associated [Google Slides](https://docs.google.com/presentation/d/12hi10WmqZGdvJ9BjxSDukXQHGmzJNPAyJavObrmfVbg/edit?usp=sharing)
 
## Decisions to be made:
- Spectral form of images to use in stack. We use Tasseled-cap imagery because it efficiently captures spectral variance, but you could use something else. [NOT SURE WHAT WE'RE TALKING ABOUT HERE]
- Years of imagery to use in stack.  We use the beginning year, a middle year, and the end year, but you could add more or use composites.  
- The seed spacing for the SNIC algorithm.  The seeds are the spatial origin of the SNIC patches, and a tighter spacing will result in smaller patches. [CHANGING THIS IS NOT CURRENTLY SUPPORTED!!]

## Outputs:
- From this script we get a seed image, which represents the starting point of each patch. The seed image has several bands that point to mean spectral values of that seed's patch. 
- We also get a set of points that are used as input to the kmeans algorithm (next step)

## Steps

	1. Script location: https://github.com/eMapR/LTOP_FTV/blob/master/scripts/GEEjs/LTOP_in_GEE/01_run_SNIC.js

	2. If you are going to use medoid composites, make sure the date window, start and end years and place arguments are to your liking. Ignore for SERVIR composites. 

	3. Specify if you are going to run the process based on medoid or pre-cooked (e.g., servir) composites

	4. Make sure the output directory (root and child) are as you would like. 

	4. Run script 

	5. Start Tasks

### 2 Kmeans cluster from SNIC patches (GEE) 

Now we cluster the SNIC patches into similar land class categories. For more information on this process see the associated [Google Slides](https://docs.google.com/presentation/d/1nQDPUaeA5PX-_2z5P1-vAmbgDiZwgLTPdkx0mqeKHFU/edit?usp=sharing)

## Decisions to be made: 
- Kmeans algorithm itself can be changed (although not currently without changing module code)
- Kmeans algorithm arguments could be adjusted but are (mostly) set to defaults
- The maxClusters argument could be raised or lowered 

## Outputs
- kmeans cluster image 
- kmeans cluster id points (FeatureCollection)

## Steps 
	
	1. Script location: https://github.com/eMapR/LTOP_FTV/blob/master/scripts/GEEjs/LTOP_in_GEE/02_run_kMeans.js

	2. Make sure SNIC output is finished running. 

	3. Run script

	4. Start tasks

### 3 Sample Landsat Image Collections with the xx Kmeans Cluster Points (GEE) (Abstract images)

With the sample of Kmeans Cluster points, a point for each cluster ID, sample a time series of Landsat Imagery (B5, TCB, TCW, NBR, and NDVI). This sample is exported as a table from GEE and used to create abstract images. More on abstract images, how they work and why we create them in the associated [Google Slides](https://docs.google.com/presentation/d/1blIvQGvP5WWMaOtqvdfUT_trFYKiCqWr6R9214BXwHg/edit?usp=sharing).   

## Decisions to be made: 
- N/A

## Outputs
- large CSV that contains different runs of LT

## Steps


	1. Script location: https://github.com/eMapR/LTOP_FTV/blob/master/scripts/GEEjs/LTOP_in_GEE/03_abstract_sampling.js

	2. Double check date windows, start/end years and masking params (medoid composites only) 

	3. Make sure your image_source argument is the same as the previous two steps. 
	
	4. Run script

	5. Run tasks. NOTE that this will send output csvs to your gDrive and will create a folder that looks like: [place_name]_abstract_images


### 4 Download CSV from Google Drive (Moving Data)

Download the table 

	1. Download from Google Drive and place in your CSVs directory

		"LTOP_"+place+"_Abstract_Sample_annualSRcollection_NBRTCWTCGNDVIB5_c2_"+str_start+"_start_renamed"


### 5 Create Abstract image with CSV (python) 

Here we create an abstract image. We start with the table that contains a time series of spretral values for xx points. These points locations are moved to be adjacent to one aonther, and are turned into pixels with each observation in the time series a new pixel. Note that if you look at these in a GIS GUI or on GEE they will be in a weird location like in the middle of the Pacific Ocean. Don't worry about that, that is what should happen. For additional information, see the Google Slides for Abstract Images above. 

## Decisions to be made: 
- Ideally, this would happen in GEE and/or we would move other scripts to work in the Python API so that everything could be done on the same platform
- The size of the tiff will be impacted by the number of kmeans clusters that come out of the kmeans step, changing that will change this

## Outputs
- Directory of tiff images, one for each year in time series 
- shapefile with one point for each pixel location

## Steps 

	1. Script Location 

		https://github.com/eMapR/LTOP_FTV/blob/master/scripts/abstractImageSampling/csv_to_abstract_images_5k_update.py

	2. Make sure the start and end years are correctly specified. This likely needs to be amended. 

	3. Input

		path/to/file/"LTOP_"+place+"_Abstract_Sample_annualSRcollection_NBRTCWTCGNDVIB5_c2_"+str_start+"_start_renamed"

	4. Outputs

		a. specify the output directory for abstract image rasters

		b. specify the output directory for output shapefile. This is the pixel centroids for the abstract image pixels. 

	5. Run script:   

		conda activate 3.xx env

		python csv_to_abstract_images_5k_update.py


### 6 Upload rasters to GEE and make image collection (Moving Data)

We then upload the abstract images to GEE

	1. Make folder in GEE assets to hold all the images 
	
	2. Upload all the abstract image rasters as assets to GEE that were created in the previous step. There should be one small GeoTiff for each year in your time series. 

	3. An imageCollection will be created from these images in the next step. 


### 7 Upload SHP to GEE (Moving Data)

Upload the shp file that acompanied the abstract image.

	1. Upload the shapefile that was created in step 5 above as an asset to GEE. 


### 8 Run Abstract image for each index (GEE). 

Runs LT for all the versions of LT on the abstract images. For more information see the associated [Google Slides](https://docs.google.com/presentation/d/1ILOG9tkkoKrtAoVAL-smhieb88SqUIkBtjrBBQbLs8w/edit?usp=sharing)

## Decisions to be made: 
- Note that the indices that this is running are currently baked into the script (NDVI, NBR, TCW, TCB, B5). This is something that could be changed\

## Outputs: 
- One csv per fitting index included in the runs (see below note on output folder)

## Steps

	1. Script location: https://github.com/eMapR/LTOP_FTV/blob/master/scripts/GEEjs/LTOP_in_GEE/04_abstract_imager.js
	
	2. Double check path to your uploaded assets (abstract images and associated shapefile)

	3. Run script

	4. Run tasks. Note that this will create a folder in your gDrive named like "LTOP_"+place+"_abstractImageSamples_c2_revised_ids". It will create a csv for each index. 
 
### 9 Download folder containing CSV‘s one for each index (Moving Data). 
	
	1. gDrive location:  "LTOP_"+place+"_abstractImageSamples_c2_revised_ids"

	2. Local directory example: /path/to/local_directories/tables/LTOP_*place*_Abstract_Image_LT_data/

### 10 Run LT Parameter Scoring scripts (Python). 

See Google Slides for step 8 above for more information on the paramater selection process. 

## Decisions to be made: 
- The biggest thing here is that there are two weights for the AIC and Vertex scores that are hardcoded into this script. These weights were created based on interpreter analysis of LT runs for different areas in SE Asia. It is not yet known how well these values transfer to other parts of the world. 

## Outputs: 
- One CSV with selected paramater information 

## Steps

	1. Script locaton: https://github.com/eMapR/LTOP_FTV/blob/master/scripts/lt_seletor/01_ltop_lt_paramater_scoring_reweighted_revised.py

	2. Edit line 121 as the input directory of csv files

		a. input directory 

			./path/to/local_directory/csvs/02_param_selection/*place*_revised_ids/

	3. Edit line 626 as the output csv file

		a. output line 563

			/path/to/local_directory/csvs/02_param_selection/selected_param_config/LTOP_cambodia_selected_config_revised_new_weights.csv

	4. Run script

		conda activate python_3.x_env

		python ./path/to/local_directory/scripts/lt_seletor/01_ltop_lt_paramater_scoring_reweighted_revised.py

### 11 Run LTOP Parameter Selecting Script (Python). This script runs very quickly (a few mins). 


	1. Script location: https://github.com/eMapR/LTOP_FTV/blob/master/scripts/lt_seletor/02_ltop_select_top_parameter_configuration.py

	2. Edit and review script

		input file path line 6

			/path/to/local_directory/csvs/02_param_selection/selected_param_config/LTOP_*place*_selected_config_revised_new_weights.csv

		output file path line 7

			/path/to/local_directory/csvs/02_param_selection/selected_param_config/LTOP_*place*_config_selected_kmeans_pts_new_weights.csv

	3. Run script: 

		conda activate python_3.x_env

		python /path/to/local_directory/scripts/lt_seletor/02_ltop_select_top_parameter_configuration.py

### 12 Upload CSV to GEE (Moving Data)

	1. CSV location 

		/path/to/local_directory/tables/LTOP_*place*_selected_configurations/LTOP_*place*_config_selected.csv

	2. Upload CSV created in step 11 as an asset to GEE	

	
### 13 Generate LTOP output in GEE. 

Generate the actual LTOP output. For more information see the associated [Google Slides](https://docs.google.com/presentation/d/1CCfXBDVSURL2VkBXm4gDNSEs3nf7-MKwu0kW30fg4yg/edit?usp=sharing)

## Decisions to be made: 
- You could change the maxObvs and get a different number of bands in this output, but that functionality is not currently exposed. It could be changed if people want more control over the outputs. 

## Outputs
- This will generate a GEE asset which is the primary output of the LTOP process. This will be a multiband image with one band up to the max number of vertices. Defaults to 11 in the LTOP workflow.

## Steps

	1. script location: https://github.com/eMapR/LTOP_FTV/blob/master/scripts/GEEjs/LTOP_in_GEE/05_generate_LTOP.js

	2. Edit and review script

	3. run script

	4. Run Task
	
#### Next Steps

Next is the actual temporal stabilization using the output of the LTOP workflow. For more information on that process see the [documentation](https://github.com/eMapR/SERVIR_stabilization). To look at the scripts, see the associated    [GitHub repo](https://github.com/eMapR/SERVIR_stabilization/tree/main/scripts/GEE_scripts) and for more background information see the [Google Slides](https://docs.google.com/presentation/d/1Mq0EgHAk1xWGNrel7UWlOx0mOX2trCCfbFJFxBckJe8/edit?usp=sharing)
