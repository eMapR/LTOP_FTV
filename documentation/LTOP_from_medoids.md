### LTOP Overview

LandTrendr is a set of spectral-temporal segmentation algorithms that focuses on removing the natural spectral variations in a time series of Landsat Images. Stabilizing the natural variation in a time series emphasizes how a landscape evolves with time. This is useful in many areas as it gives information on the state of a landscape. This includes many different natural and anthropogenic processes including: growing seasons, phenology, stable landscapes, senesence, clearcut etc. LandTrendr is mostly used in Google Earth Engine (GEE), an online image processing console, where it is readily available for use.  

One impediment to running LT over large geographic domains is selecting the best paramater set for a given landscape. The LandTrendr GEE function uses 9 arguments: 8 parameters that control how spectral-temporal segmentation is executed, and an annual image collection on which to assess and remove the natural variations. The original LandTrendr article (Kennedy et al., 2010) illustrates some of the effects and sensitivity of changing some of these values. The default parameters for the LandTrendr GEE algorithm do a satisfactory job in many circumstances, but extensive testing and time is needed to hone the parameter selection to get the best segmentation out of the LandTrendr algorithm for a given region. Thus, augmenting the LandTrendr parameter selection process would save time and standardize a method to choose parameters, but we also aim to take this augmentation a step further. 

Traditionally, LandTrendr is run over an image collection with a single LandTrendr parameter configuration and is able to remove natural variation for every pixel time series in an image. But no individual LandTrendr parameter configuration is best for all surface conditions. For example, one paramater set might be best for forest cover change while another might be preferred for agricultural phenology or reservoir flooding. To address this shortcoming, we developed a method that delineates patches of spectrally similar pixels from input imagery and then finds the best LandTrendr parameters group. We then run LandTrendr on each patch group location with a number of different paramater sets and assign scores to decide on the best parameter configuration. 

### LTOP Work Flow (Step by Step) 

[GEE link](https://code.earthengine.google.com/https://code.earthengine.google.com/?accept_repo=users/emaprlab/SERVIR) open with Emapr Account for dependencies 

![img](https://lh4.googleusercontent.com/qpYv4_Q9InR0_LBzk1vdtIWhfLmMRNwZ840DSv6h0CzETzPjd2n6pgQP24eiHFQLfTKp3Tr17yLoqwdRfPeNb_YyktC60kTGnQulL7UwiLoQit-OyJJ3H_vI25-GE06J20ab_YeO=s0)

NOTE: The below work flow is for southeast Asia. So file paths to data sets are symbolic. To Islay they are real from `vol/v1/proj`.  

#### 1 Run 01SNICPatches in GEE to generate SNIC images (GEE)

First, we want to break up an image into spectrally similar chunks, patches of pixels that are like one another. These could be pixels that make up a pond or a stand of forest. One thing to note is that every patch is independent of the other patches even if two patches represent the same land class. From this script we get a seed image, which represents the starting point of each patch. The Seed Image has several bands that point to mean spectral values of that Seed's patch. For something the size of Laos, this should take about an hour to run. 

	0. Script location

		"./LTOP_mekong/LTOP_FTV/scripts/GEEjs/LTOP_from_existing_comps/01SNICPatches_from_comps.js"

	1. Copy and paste script in GEE console 
	
	2. Make sure you have all needed dependencies (emapr GEE account has all dependencies) 

	3. Review in script parameters. You can assign start and end years (40-41), output file name and locations (>103)

	4. Run script (01SNICPatches_from_comps.js) note that it will take some time for the tasks to show up

	5. Run tasks

#### 2 Getting SNIC data from the Google drive to Islay (Moving Data) (OPTIONAL)

Here, we move our SNIC datasets to a server for further processing. Note that you will need a python environment to do this. You can create one on islay and beyond normal libraries you need pydrive. You also need to keep in mind that if you are not on the eMapr lab GEE account and associated gDrive you will need to either share the files with the lab account or you will need to download them manually. 

	1. Open terminal on Islay in a VNC

	2. Create and then activate a conda environment using python 3.5

		conda activate py35 [for example]

	3. This script bring data from the Google drive to Islay 

		./LTOP_Oregon/scripts/GEEjs/00_get_chunks_from_gdrive.py

	4. Run script 

		python ./LTOP_Oregon/scripts/GEEjs/00_get_chunks_from_gdrive.py LTOP_Oregon_SNIC_v1 ./LTOP_Oregon/rasters/01_SNIC/

	5. Check data at download destination. 

		./LTOP_Oregon/rasters/01_SNIC/

#### 3 Merge image chunks into two virtual raster (GDAL)

Out first processing step is to make a virual raster from the many Seed Image chunks download. Note that these will be grouped with the general images when they come down from GEE. You need to either specify separate folders in the SNIC step or separate manually or programmatically before the next steps or they will be combined incorrectly. You need to do this in a Python 3.x env or the gdal command will not work. 

[add seed image]

	1. Activate conda environment

		a) conda activate gdal37

	2. Build VRT SNIC seed image 

		a) make text file of file path in folder (only tiffs in the folder)
	
			ls -d "$PWD"/* > listOfTiffs.txt

		b) build vrt raster with text file 

			gdalbuildvrt snic_seed_c2.vrt -input_file_list listOfTiffs.txt

	3. Build VRT SNIC image 

		a) make text file of file path in folder (only tiffs in the folder)

			ls -d "$PWD"/* > listOfTiffs.txt

		b) build vrt raster with text file 

			gdalbuildvrt snic_image.vrt -input_file_list listOfTiffs.txt


	4. Inspect and process the merged imagery.

		a) Data location:

			./LTOP_mekong/rasters/01_SNIC/c2_seed_image/snic_seed.vrt

			./LTOP_mekong/rasters/01_SNIC/c2_images/snic_image_c2.vrt"		


#### 4 Raster calc SNIC Seed Image to keep only seed pixels (QGIS)

Now we set a No Data to 0 making most of the image No Data which is usful in the next step 

[add no data seed image]

	1. Raster calculation (("seed_band">0)*"seed_band") / (("seed_band">0)*1 + ("seed_band"<=0)*0)

	2. Input:

		.LTOP_mekong/rasters/01_SNIC/c2_seed_image/snic_seed.vrt

	3. Output: 	

		./LTOP_mekong/rasters/01_SNIC/processed_seed/seed_image_band_1_seed_pixels_noData_c2.tif

	Note: 
		This raster calculation changes the 0 pixel values to no data in Q-gis. However, this also 
		changes a seed id pixel to no data as well. But one out of hundreds of millions pixels is 
		inconsequential.



#### 5 Change the raster calc SNIC Seed Image into a vector of points. Each point corresponds to a seed pixel. (QGIS)

Here we change every pixel in the Seed Image to a point vector except pixels with no data values.

	1. Qgis tool - Raster pixels to points 
  	 

	2. Input

		./LTOP_mekong/rasters/01_SNIC/processed_seed/seed_image_band_1_seed_pixels_noData_c2.tif

	3. Output

		./LTOP_mekong/vectors/01_SNIC/01_snic_seed_pixel_points_c2.shp


#### 6 Randomly select a subset of 75k points (QGIS)

After sampling we select a subset of points. The size of the subset is arbitraray choosen to a size what works in GEE. Note that this won't automatically produce an output. You need to right click on the layer and save the selection to a new shp file. 

	0. Qgis tool - Random selection within subsets

	1. Input

		./LTOP_mekong/vectors/01_SNIC/01_snic_seed_pixel_points_c2.shp

	2. Number of selection 

		75000 

		Note: the value above is arbitrary

	3. Save selected features as:

 		./LTOP_mekong/vectors/01_SNIC/02_snic_seed_pixel_points_75k_random_selection_c2.shp


#### 7 Sample SNIC Seed Image with Seed points (QGIS) 

With point generated in the pervious step we extract the pixel values from the Seed Image across all bands and save them to a attribute table of the point vector file.

	0. Qgis tool - Sample Raster Values ~3362.35 secs) 

	1. Input point layer

		./LTOP_mekong/vectors/01_SNIC/02_snic_seed_pixel_points_75k_random_selection_c2.shp

	2. Raster layer 

		./LTOP_mekong/rasters/01_SNIC/c2_images/snic_image_c2.vrt"		

	3. Output column prefix

		seed_

	4. Output location 

		./LTOP_mekong/vectors/01_SNIC/02_snic_seed_pixel_points_selection_w_attributes_c2.shp



#### 8 Upload sample to GEE (Moving data) 

Here we zip and upload the subset of vector points to GEE. Note that you can also just upload the .shp, .shx, .dbh and .prj files. 

	1. file location 

		./LTOP_mekong/vectors/01_SNIC/02_snic_seed_pixel_points_selection_w_attributes_c2.shp 

	2. Zip shape files in directory

		zip -r 03_snic_seed_pixel_points_attributted_random_subset_75k.zip 03_snic_seed_pixel_points_attributted_random_subset_75k/ 

	3. Up load to GEE as asset

	4. GEE Asset location 

		users/emaprlab/03_snic_seed_pixel_points_attributted_random_subset_75k

#### 9 Kmeans cluster from SNIC patches (GEE) 

Now we cluster the SNIC patches into similar land class categories. Note that in the original version of LTOP the wekeKmeans algorithm in GEE was producing the specified 5000 clusters. However, in later versions, it will only produce a fraction of that. This means that other scripts downstream of this point are changed to accommodate the different cluster id naming conventions. Note that if you are not running in the lab account and if you are running for a different place you will need to change filepaths to reflect the location of the uploaded points asset. NOTE that this has been changed so that it automatically generates a stratified random sample of points that are then used for subsequent steps. Previously, we were using the 75k randomly sampled points from the SNIC centroids but those were missing some of the kmeans clusters. This script will now generate a task for generating a feature collection of these stratified random points. Run that and replace path to that asset in subsequent scripts.    
	
	1. script local location

		"./LTOP_mekong/LTOP_FTV/scripts/GEEjs/LTOP_from_existing_comps/02kMeansCluster_from_comps.js"

	2. copy and paste script into GEE console 
	
	2. Make sure you have all needed dependencies 

	3. Review in script parameters.

		number of Kmean Clusters : 5000 Note that this argument does not seem to work in the kmeans algorithm the way would would expect i.e. it does not produce 5000 clusters

	4. Run script

	5. Run tasks

		task to drive 

			Kmeans Cluster seed image to Google drive

				{task name for 02kMeansCluster.js image to drive output}
		task to assets

			kmeans cluster image to GEE assets

				{task name for 02kMeansCluster.js asset output}


#### 10 Sample Landsat Image Collections with the xx Kmeans Cluster Points (GEE)

With the subset sample of Kmeans Cluster points, a point for each cluster ID, sample a time series of Landsat Imagery (TCB TCG TCW NBR and NDVI). This sample is exported as a table from GEE. Note that for this and other GEE processes that the dates are not always uniform. 

[Image of Table]  


	1. script local location

		./LTOP_mekong/LTOP_FTV/scripts/GEEjs/LTOP_from_existing_comps/03abstractSampler_from_comps.js

	2. copy and paste script into GEE console 
	
	2. Make sure you all needed dependencies 

	3. Review in script parameters. Make sure dates match other processes. 

	4. Run script

	5. Run tasks

		task to drive 

			LTOP_Oregon_Abstract_Sample_annualSRcollection_Tranformed_NBRTCWTCGNDVIB5_v1.csv		


#### 11 Download CSV from Google Drive (Moving Data)

Download the table 

	1) Download from Google Drive

		LTOP_Oregon_Abstract_Sample_annualSRcollection_Tranformed_NBRTCWTCGNDVIB5_v1.csv

	2) location (islay)

		./LTOP_mekong/csvs/01_abstract_images/


#### 12 Create Abstract image with CSV (python) 

Here we create an abstract image. We start with the table that contains a time series of spretral values for 5000 points. These points locations are moved to be adjsent to one aonther, and are turned into pixels with each observation in the time series a new image of pixels. This script exports a TIFF image for every year in the time series and a new point vector file at each pixel locaton. 
 
[image of orignal points]
[image of move points]
[image of abstract image] 

	1) Script Location 

		./LTOP_Oregon/scripts/abstractImageSampling/csv_to_abstract_images_5k_update.py

	2) Input

		./proj/LTOP_mekong/csvs/01_abstract_images/LTOP_cambodia_Abstract_Sample_annualSRcollection_NBRTCWTCGNDVIB5_c2_1990_start.csv

	3) Outputs

		a) image directory

			./LTOP_Oregon/rasters/03_AbstractImage/

		b) SHP directory

			./LTOP_Oregon/vectors/03_abstract_image_pixel_points/

	4) Conda 

		conda activate geo_env

	5) Run Command  

		python csv_to_abstract_images.py



#### 13 Upload rasters to GEE and make image collection (Moving Data)

We then upload the abstract images to GEE

	1) Raster location

		./LTOP_Oregon/rasters/03_AbstractImage/

	2) make folder in GEE assets to hold all the images 

	3) Upload all images to assets folder 

	4) Make image collection in GEE assets tab

	5) add each abstract image to image collection


#### 14 Upload SHP to GEE (Moving Data)

Upload the shp file that acompanied the abstract image.

	1) SHP file location

		./LTOP_Oregon/vectors

	2) zip files

		zip -r 03_abstract_image_pixel_points.zip 03_abstract_image_pixel_points/

	3) Upload to GEE 


#### 15 Run Abstract image for each index (GEE). This runs pretty fast (approx. 5 mins for each index). 



	1. script local location

		./LTOP_mekong/LTOP_FTV/scripts/GEEjs/LTOP_from_existing_comps/04abstractImager_from_comps.js

	2. copy and paste script into GEE console 
	
	2. Make sure you have all needed dependencies 

	3. Review in script parameters.

		a) check to make sure runParams pasted correctly (super long list)

		b) run script for each index 'NBR', 'NDVI', 'TCG', 'TCW', 'B5'

			i) edit line 18 to change index name

	4. Run script

	5. Run tasks

		task to drive (CSV) 

			LTOP_Oregon_abstractImageSamples_5000pts_v2/
							
							LTOP_Cambodia_abstractImageSample_220pts_lt_144params_B5_c2_revised_ids
							LTOP_Cambodia_abstractImageSample_220pts_lt_144params_NBR_c2_revised_ids
							LTOP_Cambodia_abstractImageSample_220pts_lt_144params_NDVI_c2_revised_ids
							LTOP_Cambodia_abstractImageSample_220pts_lt_144params_TCG_c2_revised_ids
							LTOP_Cambodia_abstractImageSample_220pts_lt_144params_TCW_c2_revised_ids
 
#### 16 Download folder containing CSV‘s one for each index (Moving Data) (OPTIONAL)
This can also be done manually if you are not on an eMapr lab account or are not setup to automatically download from Gdrive. 

	1) script location 

		./LTOP_Oregon/scripts/GEEjs/00_get_chunks_from_gdrive.py

	2) Run Command 

		conda activate py35

		python 00_get_chunks_from_gdrive.py LTOP_Oregon_abstractImageSamples_5000pts_v2 ./LTOP_Oregon/tables/LTOP_Oregon_Abstract_Image_LT_data/

	3) output location 

		./LTOP_Oregon/tables/LTOP_Oregon_Abstract_Image_LT_data/

#### 17 Select the correct weighting scheme/values for model selection. We want to apply weights to the AIC and vertex scores from the Pareto curve to (de)emphasize one score or the other based on
the output of the interpreter data. This section is kind of a one time thing. Once you settle on the correct weights you should not have to do this again. What has not been tested here is whether those weights would need to be adjusted for another part of the world. 

	1) script location

	 "/vol/v1/proj/LTOP_mekong/peter_scripts/scripts/revised_weighting/create_weighting_scheme_from_interpreters.py"

	 2) this script calculates weights from interpreter output but also analyzes the outputs and how weighted solutions agree. 

	 3) edit the filepaths to interpreter output

	 4) run script

	 conda activate {some python 3.7 env}

	 python /vol/v1/proj/LTOP_mekong/peter_scripts/scripts/revised_weighting/create_weighting_scheme_from_interpreters.py

#### 18 Run LT Parameter Scoring scripts (Python). Note that since the change in the number of kmeans clusters this runs much faster than it did before when there were always 5000 clusters. 

	1) script locaton

		./LTOP_mekong/LTOP_FTV/scripts/lt_seletor/01_ltop_lt_paramater_scoring_reweighted_revised.py

	2) Edit line 121 as the input directory of csv files

		a) input directory 

			./LTOP_mekong/csvs/02_param_selection/cambodia_revised_ids/


	3) Edit line 626 as the output csv file

		a) output line 563

			./LTOP_mekong/csvs/02_param_selection/selected_param_config/LTOP_cambodia_selected_config_revised_new_weights.csv

	4) run script

		conda activate geo_env

		python ./LTOP_mekong/LTOP_FTV/scripts/lt_seletor/01_ltop_lt_paramater_scoring_reweighted_revised.py

#### 19 Run LTOP Parameter Selecting Script (Python). This script runs very quickly (a few mins). 


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

#### 20 Upload CSV to GEE (Moving Data)

	1) CSV location 

		./LTOP_Oregon/tables/LTOP_Oregon_selected_configurations/LTOP_Oregon_config_selected.csv

	2) Upload CSV as an asset to GEE	

	
#### 21 Generate LTOP image in GEE (GEE). When the processing shifted from a set 5000 kmeans clusters to the algorithm assigned clusters this got much faster. 

	1) script location

		./LTOP_mekong/LTOP_FTV/scripts/GEEjs/LTOP_from_existing_comps/05ltoptimumImager_from_comps.js

	2) Edit and review script

	3) run script

	4) Run Task
	
		asset task

		to drive task

#### 22 This is the end of the 'official' LTOP workflow

#### The following steps are optional and subject to change 

#### 23 Use the LTOP breakpoints/vertices outputs to create fitted Landtrendr like outputs. This uses vertices from the LTOP process and the LT-fit algorithm. This step may become optional if the same images are used for the LTOP process and change detection. 

	1) script location
		./LTOP_mekong/LTOP_FTV/scripts/GEEjs/06lt_TransferFTV.js

	2) Edit and review user inputs. There are quite a few and they are described in detail at the top of the script. 

	3) run script

	4) Run task to export a fitted array image to an asset. 

#### 24 Use the FTV outputs to create change detection maps using existing change map modules from the public LandTrendr.js scripts. This either takes the outputs of 28 above or the LTOP outputs need to be amended to create these images that mimic the regular LT outputs. 

	1) script location: 
		"/vol/v1/proj/LTOP_mekong/LTOP_FTV/scripts/GEEjs/07_Optimized_change_detection.js"

	2) Edit and review the user inputs. These are outlined at the beginning of the script. 

	3) check that the outputs are correctly specified

	4) run script 

	5) run task to export a change detection map