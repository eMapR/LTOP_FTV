//######################################################################################################## 
//#                                                                                                    #\\
//#                                        Step 4 LandTrendr Optimization workflow                     #\\
//#                                                                                                    #\\
//########################################################################################################

// date: 2022-07-19
// author: Peter Clary        | clarype@oregonstate.edu
//         Robert Kennedy     | rkennedy@coas.oregonstate.edu
//         Ben Roberts-Pierel | robertsb@oregonstate.edu
// website: https://github.com/eMapR/LT-GEE

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Import modules /////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////

var ltgee = require('users/emaprlab/public:Modules/LandTrendr.js'); 
var ltop = require('users/emaprlab/public:Modules/LTOP_modules.js'); 
var params = require('users/ak_glaciers/adpc_servir_LTOP:modules/params.js'); 

var abstractImagesPath = params.assetsRoot+params.assetsChild+'/revised_abstract_image_'

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Call the functions /////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////

//this just takes the abstract images that were uploaded after step 3.1 and assembles them into an imageCollection 
var abstract_output03_2 = ltop.abstractSampler03_2(abstractImagesPath,params.startYear,params.endYear); 

// 4. get Landsat values for the points in the abstract images. This will automatically generate csvs in a gDrive folder that starts with your place name  
var abstract_output04 = ltop.abstractImager04(abstract_output03_2, params.place,params.abstract_image_pts); 