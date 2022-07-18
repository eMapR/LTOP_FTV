### LTOP Overview

/////////////////test to see if this breaks anything!!!!!//////////////

LandTrendr (LT) is a set of spectral-temporal segmentation algorithms that focuses on removing the natural spectral variations in a time series of Landsat Images. Stabilizing the natural variation in a time series emphasizes how a landscape evolves with time. This is useful in many areas as it gives information on the state of a landscape. This includes many different natural and anthropogenic processes including: growing seasons, phenology, stable landscapes, senesence, clearcut etc. LandTrendr is mostly used in Google Earth Engine (GEE), an online image processing console, where it is readily available for use.  

One impediment to running LT over large geographic domains is selecting the best paramater set for a given landscape. The LandTrendr GEE function uses 9 arguments: 8 parameters that control how spectral-temporal segmentation is executed, and an annual image collection on which to assess and remove the natural variations. The original LandTrendr article (Kennedy et al., 2010) illustrates some of the effects and sensitivity of changing some of these values. The default parameters for the LandTrendr GEE algorithm do a satisfactory job in many circumstances, but extensive testing and time is needed to hone the parameter selection to get the best segmentation out of the LandTrendr algorithm for a given region. Thus, augmenting the LandTrendr parameter selection process would save time and standardize a method to choose parameters, but we also aim to take this augmentation a step further. 

Traditionally, LT has been run over an image collection with a single LT parameter configuration and is able to remove natural variation for every pixel time series in an image. But no individual LandTrendr parameter configuration is best for all surface conditions. For example, one paramater set might be best for forest cover change while another might be preferred for agricultural phenology or reservoir flooding. To address this shortcoming, we developed a method that delineates patches of spectrally similar pixels from input imagery and then finds the best LandTrendr parameters group. We then run LandTrendr on each patch group location with a number of different paramater sets and assign scores to decide on the best parameter configuration. 
### LTOP Work Flow (Step by Step) 

Workflow conceptual diagram: 
![img](https://docs.google.com/drawings/d/e/2PACX-1vQ9Jmb4AhD86GedXTH798O4hGCNDyCp-ZMcYEB1Ij8fuhNqc4xhDuO3x9JSttq6Tk2g9agWP2FWhoU-/pub?w=960&h=720)

Workflow overview: 
![img](https://docs.google.com/drawings/d/e/2PACX-1vTVthwPV6yUcagGQcBUSWr443lJuaeCg8r03QlmrvHOwbrp3J08lKh0zDRMORpmts3qrtkpOevzB1lm/pub?w=960&h=720)

#### NOTES on preparing to run the LTOP workflow

1. We suggest that you create a dedicated directory on a local drive to hold scripts and intermediate outputs of the LTOP workflow. This can be created by [cloning](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository) our [GitHub repo](https://github.com/eMapR/LTOP_FTV/tree/master/scripts). 

2. You can then create basic container directories for intermediate outputs (e.g., rasters, vectors, csvs). 

3. The general setup for this implementation of LTOP relies on five major steps laid out in short, simple scripts. Each of these scripts call functions in the [modules library](https://github.com/eMapR/LTOP_FTV/blob/master/scripts/GEEjs/LTOP_in_GEE/LTOP_modules_version_2_0.js) to do the work. Ideally, the user does not need to look at the modules script if they don't want to. 

4. Most of the heavy lifting is done in GEE but a few intermediate steps are conducted in Python. It is suggested that you create a dedicated conda env for these steps. It should not be an issue but note that it must be a 3.x env for the LTOP scripts to work. 

5. Note that the script locations given below are based on script locations and directory structure on GitHub. When you clone the repo to a local directory you will need to update these paths wherever they are required (mostly the python-based steps towards the end of the workflow). 


#### 1 Run 01_run_SNIC in GEE to generate SNIC images (GEE)

Ultimately, the optimization requires that LT be run hundreds of times to evaluate which set of parameters is best. This is not tractable for every pixel.  Further, it is not necessary:  a given set of parameters will work for pixels that have similar conditions in terms of cover and change processes.  Thus, our first step is to find groups of pixels that have those similarities, and use them for all further steps. 

Thus, the first step is to organize our study area into patches.  We use GEE's SNIC processing on an image that is meant to capture the spectral and temporal variability of the study area.  

Decisions to be made:
- 



 similar changes and LT oirst, we want to break up an image into spectrally similar chunks. This takes the form of patches of pixels with similar spectral properties. These could be pixels that make up a pond or a stand of forest. One thing to note is that every patch is independent of the other patches even if two patches represent the same land class. From this script we get a seed image, which represents the starting point of each patch. The seed image has several bands that point to mean spectral values of that seed's patch. For something the size of Laos, this should take about an hour to run. 

	1. Script location: https://github.com/eMapR/LTOP_FTV/blob/master/scripts/GEEjs/LTOP_in_GEE/01_run_SNIC.js

	2. Make sure the date window, start and end years and place arguments are to your liking

	3. Specify if you are going to run the process based on medoid or pre-cooked (e.g., servir) composites

	4. Run script 

	5. Start Tasks

#### 2 Kmeans cluster from SNIC patches (GEE) 

Now we cluster the SNIC patches into similar land class categories. Note that in the original version of LTOP the wekeKmeans algorithm in GEE was producing the specified 5000 clusters. However, in later versions, it will only produce a fraction of that. This means that other scripts downstream of this point are changed to accommodate the different cluster id naming conventions. Note that if you are not running in the lab account and if you are running for a different place you will need to change filepaths to reflect the location of the uploaded points asset.   
	
	1. Script location: https://github.com/eMapR/LTOP_FTV/blob/master/scripts/GEEjs/LTOP_in_GEE/02_run_kMeans.js

	2. Make sure SNIC output is finished running. 

	3. Adjust assets_root and assets_child vars if you need. 

	4. Run script

	5. Start tasks

#### 3 Sample Landsat Image Collections with the xx Kmeans Cluster Points (GEE)

With the subset sample of Kmeans Cluster points, a point for each cluster ID, sample a time series of Landsat Imagery (TCB TCG TCW NBR and NDVI). This sample is exported as a table from GEE. Note that for this and other GEE processes that the dates are not always uniform.  


	1. Script location: https://github.com/eMapR/LTOP_FTV/blob/master/scripts/GEEjs/LTOP_in_GEE/03_abstract_sampling.js

	2. Double check date windows, start/end years and masking params 

	3. Make sure assets root/child are as you want 

	4. Make sure your image_source argument is the same as the previous two steps. 
	
	5. Run script

	6. Run tasks. NOTE that this will send output csvs to your gDrive and will create a folder that looks like: [place_name]_abstract_images


#### 4 Download CSV from Google Drive (Moving Data)

Download the table 

	1. Download from Google Drive

		"LTOP_"+place+"_Abstract_Sample_annualSRcollection_NBRTCWTCGNDVIB5_c2_"+str_start+"_start_renamed"


#### 5 Create Abstract image with CSV (python) 

Here we create an abstract image. We start with the table that contains a time series of spretral values for xx points. These points locations are moved to be adjsent to one aonther, and are turned into pixels with each observation in the time series a new image of pixels. This script exports a TIFF image for every year in the time series and a new point vector file at each pixel locaton. Note that if you look at these in a GIS GUI or on GEE they will be in a weird location like in the middle of the Pacific Ocean. Don't worry about that, that is what should happen. 

	1. Script Location 

		https://github.com/eMapR/LTOP_FTV/blob/master/scripts/abstractImageSampling/csv_to_abstract_images_5k_update.py

	2. Make sure the start and end years are correctly specified. This likely needs to be amended. 

	3. Input

		path/to/file/"LTOP_"+place+"_Abstract_Sample_annualSRcollection_NBRTCWTCGNDVIB5_c2_"+str_start+"_start_renamed"

	4. Outputs

		a. specify the output directory for abstract image rasters

		b. specify the output directory for output shapefile. This is the pixel centroids for the abstract image pixels. 

	5. Run script:   

		python csv_to_abstract_images_5k_update.py


#### 6 Upload rasters to GEE and make image collection (Moving Data)

We then upload the abstract images to GEE

	1. Make folder in GEE assets to hold all the images 
	
	2. Upload all the abstract image rasters as assets to GEE that were created in the previous step. There should be one small GeoTiff for each year in your time series. 

	3. An imageCollection will be created from these images in the next step. 


#### 7 Upload SHP to GEE (Moving Data)

Upload the shp file that acompanied the abstract image.

	1. Upload the shapefile that was created in step 5 above as an asset to GEE. 


#### 8 Run Abstract image for each index (GEE). The modules script is going to implement a four loop to run all indices. 

	1. Script location: https://github.com/eMapR/LTOP_FTV/blob/master/scripts/GEEjs/LTOP_in_GEE/04_abstract_imager.js
	
	2. Double check dates, years, directories and the path to your uploaded assets (abstract images and associated shapefile)

	3. Note that the indices that this is running are currently baked into the script (NDVI, NBR, TCW, TCB, B5). This is something that could be changed. 

	4. Run script

	5. Run tasks. Note that this will create a folder in your gDrive named like "LTOP_"+place+"_abstractImageSamples_c2_revised_ids". It will create a csv for each index. 
 
#### 9 Download folder containing CSV‘s one for each index (Moving Data). 
	
	1. gDrive location:  "LTOP_"+place+"_abstractImageSamples_c2_revised_ids"

	2. Local directory example: /path/to/local_directories/tables/LTOP_*place*_Abstract_Image_LT_data/

#### 10 Run LT Parameter Scoring scripts (Python). Note that since the change in the number of kmeans clusters this runs much faster than it did before when there were always 5000 clusters. 

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

#### 11 Run LTOP Parameter Selecting Script (Python). This script runs very quickly (a few mins). 


	1. Script location: https://github.com/eMapR/LTOP_FTV/blob/master/scripts/lt_seletor/02_ltop_select_top_parameter_configuration.py

	2. Edit and review script

		input file path line 6

			/path/to/local_directory/csvs/02_param_selection/selected_param_config/LTOP_*place*_selected_config_revised_new_weights.csv

		output file path line 7

			/path/to/local_directory/csvs/02_param_selection/selected_param_config/LTOP_*place*_config_selected_kmeans_pts_new_weights.csv

	3. Run script: 

		conda activate python_3.x_env

		python /path/to/local_directory/scripts/lt_seletor/02_ltop_select_top_parameter_configuration.py

#### 12 Upload CSV to GEE (Moving Data)

	1. CSV location 

		/path/to/local_directory/tables/LTOP_*place*_selected_configurations/LTOP_*place*_config_selected.csv

	2. Upload CSV created in step 11 as an asset to GEE	

	
#### 13 Generate LTOP output in GEE. This will generate a GEE asset which is the primary output of the LTOP process. This will be a multiband image with one band up to the max number of vertices. Defaults to 11 in the LTOP workflow.

	1. script location: https://github.com/eMapR/LTOP_FTV/blob/master/scripts/GEEjs/LTOP_in_GEE/05_generate_LTOP.js

	2. Edit and review script

	3. run script

	4. Run Task
	

