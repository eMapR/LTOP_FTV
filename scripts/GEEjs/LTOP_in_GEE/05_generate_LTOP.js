//######################################################################################################## 
//#                                                                                                    #\\
//#                                Step 5 LandTrendr Optimization workflow                             #\\
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

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Time, space and masking params /////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
var place = 'Cambodia'; 
var startYear = 1990; 
var endYear = 2021; 
var assets_root = 'users/ak_glaciers/'; 
var assets_child = 'servir_training_tests'; 
var selected_LT_vers = ee.FeatureCollection('users/ak_glaciers/servir_training_tests/LTOP_test_geometry_kmeans_pts_config_selected_for_GEE_upload_new_weights_gee_implementation'); //should be the csv created in the python scripts after step 04
var cluster_img = ee.Image(assets_root+assets_child+"/LTOP_kmeans_cluster_image_"+place+"_c2_full_area_50_per_tiled_"+str_start);
var aoi = ee.FeatureCollection("USDOS/LSIB/2017").filter(ee.Filter.eq('COUNTRY_NA',place)).geometry().buffer(5000);
var image_source = 'servir'; 

//specify only when using medoid composites
//these date windows are specific to the place that you're working on
var startDate = '11-20'; 
var endDate =   '03-10'; 
var masked = ['cloud', 'shadow']; //powermask?? its new and has magic powers ... RETURN TO THIS AND ADD MORE DETAIL

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Landsat Composites /////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
var annualSRcollection; 

//these composites are used for the last two steps and span the full period
if (image_source == 'medoid'){
  var annualSRcollection = ltgee.buildSRcollection(startYear, endYear, startDate, endDate, aoi, masked); 

}else if (image_source != 'medoid'){
    var annualSRcollection = ltop.buildSERVIRcompsIC(startYear,endYear); 
}

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Call the functions /////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////

// 5. create the optimized output
var optimized_output05 = ltop.optimizedImager05(selected_LT_vers,annualSRcollection,cluster_img,aoi); //note that table is the selected paramaters from the python script after step four

var str_start = ee.Number(startYear).format().getInfo(); 

Export.image.toAsset({
    image: optimized_output05,
    description: 'Optimized_LT_'+str_start+'_start_'+place+'_all_cluster_ids',
    assetId: assets_child+'/Optimized_LT_'+str_start+'_start_'+place+'_all_cluster_ids',
    region: aoi,
    scale: 30,
    maxPixels: 1e13
  });   
