### LTOP Overview

LandTrendr is a set of spectral-temporal segmentation algorithms that focuses on removing the natural spectral variations in a time series of Landsat Images. Stabilizing the natural variation in a time series emphasizes how a landscape evolves with time. This is useful in many areas as it gives information on the state of a landscape. This includes many different natural and anthropogenic processes including: growing seasons, phenology, stable landscapes, senesence, clearcut etc. LandTrendr is mostly used in Google Earth Engine (GEE), an online image processing console, where it is readily available for use.  

One impediment to running LT over large geographic domains is selecting the best paramater set for a given landscape. The LandTrendr GEE function uses 9 arguments: 8 parameters that control how spectral-temporal segmentation is executed, and an annual image collection on which to assess and remove the natural variations. The original LandTrendr article (Kennedy et al., 2010) illustrates some of the effects and sensitivity of changing some of these values. The default parameters for the LandTrendr GEE algorithm do a satisfactory job in many circumstances, but extensive testing and time is needed to hone the parameter selection to get the best segmentation out of the LandTrendr algorithm for a given region. Thus, augmenting the LandTrendr parameter selection process would save time and standardize a method to choose parameters, but we also aim to take this augmentation a step further. 

Traditionally, LandTrendr is run over an image collection with a single LandTrendr parameter configuration and is able to remove natural variation for every pixel time series in an image. But no individual LandTrendr parameter configuration is best for all surface conditions. For example, one paramater set might be best for forest cover change while another might be preferred for agricultural phenology or reservoir flooding. To address this shortcoming, we developed a method that delineates patches of spectrally similar pixels from input imagery and then finds the best LandTrendr parameters group. We then run LandTrendr on each patch group location with a number of different paramater sets and assign scores to decide on the best parameter configuration. 
### LTOP Work Flow (Step by Step) 

[GEE link](https://code.earthengine.google.com/https://code.earthengine.google.com/?accept_repo=users/emaprlab/SERVIR) open with Emapr Account for dependencies 

![img](https://lh4.googleusercontent.com/qpYv4_Q9InR0_LBzk1vdtIWhfLmMRNwZ840DSv6h0CzETzPjd2n6pgQP24eiHFQLfTKp3Tr17yLoqwdRfPeNb_YyktC60kTGnQulL7UwiLoQit-OyJJ3H_vI25-GE06J20ab_YeO=s0)

NOTE: The below work flow is for southeast Asia. So file paths to data sets are symbolic. To Islay they are real from `vol/v1/proj`.  

The scripts to execute the following workflow are located at:  
/vol/v1/proj/LTOP_mekong/LTOP_FTV/scripts/GEEjs/workflow_version_2_0/

The general setup is that the five major steps are laid out in short, simple scripts. Each of these scripts call functions in the modules library to do the work. Ideally, the user does not need to look at the modules script if they don't want to. You should create a folder to hold all the intermediary GEE outputs or you can uncomment the data creation section in the first script and let GEE do it. 


#### 1 Run 01_run_SNIC in GEE to generate SNIC images (GEE)

First, we want to break up an image into spectrally similar chunks. This takes the form of patches of pixels with similar spectral properties. These could be pixels that make up a pond or a stand of forest. One thing to note is that every patch is independent of the other patches even if two patches represent the same land class. From this script we get a seed image, which represents the starting point of each patch. The seed image has several bands that point to mean spectral values of that seed's patch. For something the size of Laos, this should take about an hour to run. 

	1. Script name: 01_run_SNIC.js

	2. Make sure the date window, start and end years and place arguments are to your liking

	3. Specify if you are going to run the process based on medoid or pre-cooked (e.g., servir) composites

	4. Run script 

	5. Start Tasks

#### 2 Kmeans cluster from SNIC patches (GEE) 

Now we cluster the SNIC patches into similar land class categories. Note that in the original version of LTOP the wekeKmeans algorithm in GEE was producing the specified 5000 clusters. However, in later versions, it will only produce a fraction of that. This means that other scripts downstream of this point are changed to accommodate the different cluster id naming conventions. Note that if you are not running in the lab account and if you are running for a different place you will need to change filepaths to reflect the location of the uploaded points asset.   
	
	1. Script name: 02_run_kMeans.js

	2. Make sure SNIC output is finished running. 

	3. Adjust assets_root and assets_child vars if you need. 

	4. Run script

	5. Start tasks

#### 3 Sample Landsat Image Collections with the xx Kmeans Cluster Points (GEE)

With the subset sample of Kmeans Cluster points, a point for each cluster ID, sample a time series of Landsat Imagery (TCB TCG TCW NBR and NDVI). This sample is exported as a table from GEE. Note that for this and other GEE processes that the dates are not always uniform. 

[Image of Table]  


	1. Script name: 03_abstract_sampling.js

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

Here we create an abstract image. We start with the table that contains a time series of spretral values for 5000 points. These points locations are moved to be adjsent to one aonther, and are turned into pixels with each observation in the time series a new image of pixels. This script exports a TIFF image for every year in the time series and a new point vector file at each pixel locaton. 
 
[image of orignal points]
[image of move points]
[image of abstract image] 

	1. Script Location 

		./LTOP_mekong/LTOP_FTV/scripts/abstractImageSampling/csv_to_abstract_images_5k_update.py

	2. Make sure the start and end years are correctly specified. This likely needs to be amended. 

	3. Input

		path/to/file/"LTOP_"+place+"_Abstract_Sample_annualSRcollection_NBRTCWTCGNDVIB5_c2_"+str_start+"_start_renamed"

	4. Outputs

		a. specify the output directory for abstract image rasters

		b) specify the output directory for output shapefile. This is the pixel centroids for the abstract image pixels. 

	5. Run Command  (example- specify the location of the script)

		python csv_to_abstract_images_5k_update.py


#### 6 Upload rasters to GEE and make image collection (Moving Data)

We then upload the abstract images to GEE

	1. Make folder in GEE assets to hold all the images 
	
	2. Upload all the abstract image rasters as assets to GEE that were created in the previous step. There should be one small GeoTiff for each year in your time series. 

	3. An imageCollection will be created from these images in the next step. 


#### 7 Upload SHP to GEE (Moving Data)

Upload the shp file that acompanied the abstract image.

	1) Upload the shapefile that was created in step 5 above as an asset to GEE. 


#### 8 Run Abstract image for each index (GEE). This runs pretty fast (approx. 5 mins for each index). 

	1. Script name: 04_abstract_imager.js
	
	2. Double check dates, years, directories and the path to your uploaded assets (abstract images and associated shapefile)

	3. Note that the indices that this is running are currently baked into the script (NDVI, NBR, TCW, TCB, B5). This is something that could be changed. 

	4. Run script

	5. Run tasks. Note that this will create a folder in your gDrive named like "LTOP_"+place+"_abstractImageSamples_c2_revised_ids". It will create a csv for each index. 
 
#### 9 Download folder containing CSV‘s one for each index (Moving Data). Or just do this step manually, there are only a few csvs. 

	1) script location 

		./LTOP_Oregon/scripts/GEEjs/00_get_chunks_from_gdrive.py

	2) Run Command 

		conda activate py35

		python 00_get_chunks_from_gdrive.py LTOP_Oregon_abstractImageSamples_5000pts_v2 ./LTOP_Oregon/tables/LTOP_Oregon_Abstract_Image_LT_data/

	3) output location 

		./LTOP_Oregon/tables/LTOP_Oregon_Abstract_Image_LT_data/

#### 10 Run LT Parameter Scoring scripts (Python). Note that since the change in the number of kmeans clusters this runs much faster than it did before when there were always 5000 clusters. 

	1. script locaton

		./LTOP_mekong/LTOP_FTV/scripts/lt_seletor/01_ltop_lt_paramater_scoring_reweighted_revised.py

	2. Edit line 121 as the input directory of csv files

		a) input directory 

			./LTOP_mekong/csvs/02_param_selection/cambodia_revised_ids/


	3. Edit line 626 as the output csv file

		a) output line 563

			./LTOP_mekong/csvs/02_param_selection/selected_param_config/LTOP_cambodia_selected_config_revised_new_weights.csv

	4. run script

		conda activate geo_env

		python ./LTOP_mekong/LTOP_FTV/scripts/lt_seletor/01_ltop_lt_paramater_scoring_reweighted_revised.py

#### 11 Run LTOP Parameter Selecting Script (Python). This script runs very quickly (a few mins). 


	1) script location

		./LTOP_mekong/LTOP_FTV/scripts/lt_seletor/02_ltop_select_top_parameter_configuration.py

	2) Edit and review script

		input file path line 6

			./LTOP_mekong/csvs/02_param_selection/selected_param_config/LTOP_cambodia_selected_config_revised_new_weights.csv

		output file path line 7

			./LTOP_mekong/csvs/02_param_selection/selected_param_config/LTOP_Cambodia_config_selected_220_kmeans_pts_new_weights.csv

	3) run script

		conda base

		python ./LTOP_Oregon/scripts/lt_seletor/02_ltop_select_top_parameter_configuration.py

#### 12 Upload CSV to GEE (Moving Data)

	1) CSV location 

		./LTOP_Oregon/tables/LTOP_Oregon_selected_configurations/LTOP_Oregon_config_selected.csv

	2) Upload CSV as an asset to GEE	

	
#### 13 Generate LTOP image in GEE (GEE). When the processing shifted from a set 5000 kmeans clusters to the algorithm assigned clusters this got much faster. 

	1) script location

		./LTOP_mekong/LTOP_FTV/scripts/GEEjs/05lt-Optumum-Imager.js

	2) Edit and review script

	3) run script

	4) Run Task
	
		asset task

		to drive task

