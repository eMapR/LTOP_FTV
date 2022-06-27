//######################################################################################################## 
//#                                                                                                    #\\
//#                                        Step 4 LandTrendr Optimization workflow                     #\\
//#                                                                                                    #\\
//########################################################################################################

// date: 2020-12-10
// author: Peter Clary        | clarype@oregonstate.edu
//         Robert Kennedy     | rkennedy@coas.oregonstate.edu
//         Ben Roberts-Pierel | robertsb@oregonstate.edu
// website: https://github.com/eMapR/LT-GEE

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Import modules /////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////

var ltgee = require('users/emaprlab/public:Modules/LandTrendr.js'); 
var ltop = require('users/emaprlab/broberts:LTOP_mekong/LTOP_modules'); 

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Time, space and masking params /////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
var str_start = '1990'; 
var place = 'Cambodia'; 
var startYear = 1990; 
var endYear = 2021; 
//this has to be amended after uploading these images 
var abstractImagesPath = 'users/ak_glaciers/cambodia_gee_abstract_images/revised_abstract_image_'; 
var assets_root = 'users/ak_glaciers/'; 
var assets_child = 'gee_LTOP_conversion'; 
//this has to be uploaded from a local directory and changed 
var abstract_image_pts = ee.FeatureCollection('users/ak_glaciers/cambodia_gee_abstract_images/abstract_image_ids_revised_ids');
var aoi = ee.FeatureCollection("USDOS/LSIB/2017").filter(ee.Filter.eq('COUNTRY_NA',place)).geometry().buffer(5000);

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// File Management/////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
//let GEE create a new assets folder for you that will hold all the outputs of this run 
//ee.data.createFolder(assets_root+assets_child); 

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Call the functions /////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////

//this just takes the abstract images that were uploaded after step 3.1 and assembles them into an imageCollection 
var abstract_output03_2 = ltop.abstractSampler03_2(abstractImagesPath,startYear,endYear); 

// 4. get Landsat values for the points in the abstract images. This will automatically generate csvs in a gDrive folder that starts with your place name  
var abstract_output04 = ltop.abstractImager04(abstract_output03_2, place,abstract_image_pts); 