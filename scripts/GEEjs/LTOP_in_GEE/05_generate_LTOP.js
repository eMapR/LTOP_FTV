//######################################################################################################## 
//#                                                                                                    #\\
//#                                Step 5 LandTrendr Optimization workflow                             #\\
//#                                                                                                    #\\
//########################################################################################################

// date: 2022-09-02
// author: Peter Clary        | clarype@oregonstate.edu
//         Robert Kennedy     | rkennedy@coas.oregonstate.edu
//         Ben Roberts-Pierel | robertsb@oregonstate.edu
// website: https://github.com/eMapR/LT-GEE

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Import modules /////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////

var ltgee = require('users/ak_glaciers/adpc_servir_LTOP:modules/LandTrendr.js'); 
var ltop = require('users/ak_glaciers/adpc_servir_LTOP:modules/LTOP_modules.js'); 
var params = require('users/ak_glaciers/adpc_servir_LTOP:modules/params.js'); 

print('You are currently running version: ',params.version,' of the LTOP workflow'); 

//naming convention based on previously generated image
var cluster_img = ee.Image(params.assetsRoot+params.assetsChild+"/LTOP_KMEANS_cluster_image_"+params.randomPts.toString()+"_pts_"+params.maxClusters.toString()+"_max_"+params.minClusters.toString()+"_min_clusters_"+params.place+"_c2_"+params.startYear.toString());

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Landsat Composites /////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
var annualSRcollection; 

//these composites are used for the last two steps and span the full period
if (params.imageSource == 'medoid'){
  var annualSRcollection = ltgee.buildSRcollection(params.startYear, params.endYear, params.startDate, params.endDate, params.aoi, params.masked); 

}else if (params.imageSource != 'medoid'){
    var annualSRcollection = ltop.buildSERVIRcompsIC(params.startYear,params.endYear); 
}

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Call the functions /////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////

// 5. create the optimized output
var optimized_output05 = ltop.optimizedImager05(params.selectedLTparams,annualSRcollection,cluster_img,params.aoi); //note that table is the selected paramaters from the python script after step four

Export.image.toAsset({
    image: optimized_output05,
    description: 'Optimized_LT_'+params.startYear.toString()+'_start_'+params.place+'_all_cluster_ids',
    assetId: params.assetsChild+'/Optimized_LT_'+params.startYear+'_start_'+params.place+'_all_cluster_ids',
    region: params.aoi,
    scale: 30,
    maxPixels: 1e13
  });   

