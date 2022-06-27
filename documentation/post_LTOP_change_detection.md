#### The following steps are optional and subject to change 

#### 23 Use the LTOP breakpoints/vertices outputs to create fitted Landtrendr like outputs. This uses vertices from the LTOP process and the LT-fit algorithm. This step may become optional if the same images are used for the LTOP process and change detection. 

	1) script location
		./path/to/local_directory/LTOP_FTV/scripts/GEEjs/06lt_TransferFTV.js

	2) Edit and review user inputs. There are quite a few and they are described in detail at the top of the script. 

	3) run script

	4) Run task to export a fitted array image to an asset. 

#### 24 Use the FTV outputs to create change detection maps using existing change map modules from the public LandTrendr.js scripts. This either takes the outputs of 28 above or the LTOP outputs need to be amended to create these images that mimic the regular LT outputs. 

	1) script location: 
		"/vol/v1/proj/path/to/local_directory/LTOP_FTV/scripts/GEEjs/07_Optimized_change_detection.js"

	2) Edit and review the user inputs. These are outlined at the beginning of the script. 

	3) check that the outputs are correctly specified

	4) run script 

	5) run task to export a change detection map